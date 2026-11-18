import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { FragmentoEnCola, FragmentoUploader } from './fragmento-uploader';
import { GrabacionApi } from './grabacion-api';
import { CanalGrabacion, ResultadoGrabacion } from './models';

const MIME_VIDEO = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
const MIME_AUDIO = ['audio/webm;codecs=opus', 'audio/webm'];

/** Cada cuánto se junta lo grabado en un fragmento para enviarlo. */
const INTERVALO_FRAGMENTO_MS = 5_000;
/** El grabador entrega datos cada segundo: lo ya grabado se conserva si algo falla. */
const TROZO_MS = 1_000;

interface CanalRec {
  nombre: CanalGrabacion;
  recorder: MediaRecorder | null;
  /** Trozos de 1 s aún sin empaquetar en un fragmento. */
  trozos: Blob[];
  /** Copia completa para "Descargar copia" (solo se guarda la del cliente). */
  respaldo: Blob[] | null;
  siguienteSecuencia: number;
  ultimoEmpaqueMs: number;
  cierre: Promise<void> | null;
  tieneAudio: boolean;
  detencionPedida: boolean;
}

const nuevoCanal = (nombre: CanalGrabacion, conRespaldo: boolean): CanalRec => ({
  nombre,
  recorder: null,
  trozos: [],
  respaldo: conRespaldo ? [] : null,
  siguienteSecuencia: 0,
  ultimoEmpaqueMs: 0,
  cierre: null,
  tieneAudio: false,
  detencionPedida: false,
});

/**
 * Graba dos canales y los envía al servidor por fragmentos mientras la llamada sigue en curso:
 *  - CLIENTE: el MediaStream remoto (audio y video).
 *  - REPRESENTANTE: solo el audio del micrófono propio (el video no se transcribe y ahorra espacio).
 *
 * Hay un único MediaRecorder por canal durante toda la llamada (no se reinicia al reconectar,
 * para no duplicar cabeceras webm). Se provee a nivel de componente: una instancia por llamada.
 */
@Injectable()
export class RecorderService {
  private api = inject(GrabacionApi);

  readonly grabando = signal(false);

  private cliente = nuevoCanal('CLIENTE', true);
  private representante = nuevoCanal('REPRESENTANTE', false);
  private uploader: FragmentoUploader | null = null;
  private inicioMs = 0;
  private finMs = 0;
  private detenido = false;

  static soportado(): boolean {
    return typeof MediaRecorder !== 'undefined';
  }

  // Estado de envío, para la insignia y los mensajes de la pantalla.
  get envio(): FragmentoUploader | null {
    return this.uploader;
  }
  /** Fragmentos sin confirmar por el servidor (en cola). */
  pendientes(): number {
    return this.uploader?.pendientes() ?? 0;
  }
  estadoEnvio() {
    return this.uploader?.estado() ?? 'ok';
  }
  detalleError(): string {
    return this.uploader?.detalleError() ?? '';
  }
  ultimaConfirmacion(): Date | null {
    return this.uploader?.ultimaConfirmacion() ?? null;
  }

  get hayDatos(): boolean {
    return (this.cliente.respaldo?.length ?? 0) > 0;
  }

  /** Copia local completa del canal del cliente (para descargar si el envío falló). */
  copiaLocal(): Blob | null {
    return this.hayDatos ? new Blob(this.cliente.respaldo!, { type: 'video/webm' }) : null;
  }

  iniciar(streamCliente: MediaStream, streamRepresentante: MediaStream, entrevistaId: number): void {
    if (this.cliente.recorder || this.uploader) return;

    this.detenido = false;
    this.uploader = new FragmentoUploader({
      preparar: () => firstValueFrom(this.api.iniciar(entrevistaId)),
      enviar: (canal, secuencia, blob, hash) =>
        firstValueFrom(this.api.enviarFragmento(entrevistaId, canal, secuencia, blob, hash)),
    });

    this.inicioMs = Date.now();
    this.arrancarCanal(this.cliente, streamCliente, MIME_VIDEO, true);
    // El representante solo en audio: new MediaStream con sus pistas de audio.
    const audioRep = new MediaStream(streamRepresentante.getAudioTracks());
    if (audioRep.getAudioTracks().length > 0) {
      this.arrancarCanal(this.representante, audioRep, MIME_AUDIO, false);
    }
    this.uploader.iniciar();
    this.grabando.set(true);
  }

  private arrancarCanal(c: CanalRec, stream: MediaStream, mimes: string[], video: boolean): void {
    const mimeType = mimes.find((m) => MediaRecorder.isTypeSupported(m));
    c.tieneAudio = stream.getAudioTracks().length > 0;
    c.detencionPedida = false;
    c.ultimoEmpaqueMs = Date.now();

    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      ...(video ? { videoBitsPerSecond: 2_500_000 } : {}),
      audioBitsPerSecond: 128_000,
    });

    c.cierre = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    // dataavailable dispara el empaquetado: así no depende de un setInterval, que los navegadores
    // recortan en pestañas en segundo plano.
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        c.trozos.push(e.data);
        c.respaldo?.push(e.data);
      }
      this.empaquetar(c, false);
    };
    recorder.onerror = () => {
      if (c === this.cliente) this.grabando.set(false);
    };

    c.recorder = recorder;
    recorder.start(TROZO_MS);
  }

  /** Junta los trozos acumulados en un fragmento con la siguiente secuencia y lo pone en la cola. */
  private empaquetar(c: CanalRec, forzar: boolean): void {
    if (!this.uploader || c.trozos.length === 0) return;
    if (!forzar && Date.now() - c.ultimoEmpaqueMs < INTERVALO_FRAGMENTO_MS) return;

    const blob = new Blob(c.trozos, { type: c.recorder?.mimeType || 'video/webm' });
    c.trozos = [];
    c.ultimoEmpaqueMs = Date.now();

    const fragmento: FragmentoEnCola = {
      secuencia: c.siguienteSecuencia++,
      blob,
      hash: this.sha256(blob),
    };
    this.uploader.encolar(c.nombre, fragmento);
  }

  /** SHA-256 en hex con crypto.subtle; si no está disponible (contexto no seguro) no se envía huella. */
  private async sha256(blob: Blob): Promise<string | undefined> {
    try {
      if (!globalThis.crypto?.subtle) return undefined;
      const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return undefined;
    }
  }

  /**
   * Detiene ambos grabadores y empaqueta lo último. No vacía la cola: eso lo hace `vaciar()`.
   * Devuelve null si nunca se empezó a grabar.
   */
  async detener(): Promise<ResultadoGrabacion | null> {
    if (!this.cliente.recorder) return null;
    if (this.detenido) return this.resultado();
    this.detenido = true;

    for (const c of [this.cliente, this.representante]) {
      if (c.recorder && c.recorder.state !== 'inactive') {
        c.detencionPedida = true;
        c.recorder.stop();
      }
    }
    await Promise.all([this.cliente.cierre, this.representante.cierre]);
    this.finMs = Date.now();
    this.grabando.set(false);

    this.empaquetar(this.cliente, true);
    this.empaquetar(this.representante, true);
    return this.resultado();
  }

  private resultado(): ResultadoGrabacion {
    const fin = this.finMs || Date.now();
    return {
      blob: this.copiaLocal() ?? new Blob([], { type: 'video/webm' }),
      duracionSegundos: Math.max(0, Math.round((fin - this.inicioMs) / 1000)),
      tieneAudioCliente: this.cliente.tieneAudio,
      inesperado: !this.cliente.detencionPedida,
    };
  }

  /** Espera a que se envíe todo lo pendiente (hasta `maxMs`). true si la cola quedó vacía. */
  vaciar(maxMs: number): Promise<boolean> {
    return this.uploader ? this.uploader.vaciar(maxMs) : Promise.resolve(true);
  }

  /** Descarta todo (al destruir el componente sin haber finalizado). */
  cancelar(): void {
    for (const c of [this.cliente, this.representante]) {
      if (c.recorder && c.recorder.state !== 'inactive') {
        c.recorder.onstop = null;
        c.recorder.ondataavailable = null;
        c.recorder.stop();
      }
    }
    this.uploader?.cancelar();
    this.cliente = nuevoCanal('CLIENTE', true);
    this.representante = nuevoCanal('REPRESENTANTE', false);
    this.uploader = null;
    this.grabando.set(false);
  }
}

