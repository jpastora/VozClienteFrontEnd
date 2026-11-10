import { Injectable, signal } from '@angular/core';
import { ResultadoGrabacion } from './models';

const MIME_PREFERIDOS = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

/**
 * Graba un MediaStream (el canal del cliente que llega por WebRTC) a .webm con MediaRecorder.
 * Se provee a nivel de componente: una instancia por llamada.
 */
@Injectable()
export class RecorderService {
  readonly grabando = signal(false);

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private inicioMs = 0;
  private finMs = 0;
  private tieneAudio = false;
  private detencionPedida = false;
  private cierre: Promise<void> | null = null;

  static soportado(): boolean {
    return typeof MediaRecorder !== 'undefined';
  }

  get hayDatos(): boolean {
    return this.chunks.length > 0;
  }

  iniciar(stream: MediaStream): void {
    if (this.recorder) return;

    const mimeType = MIME_PREFERIDOS.find((m) => MediaRecorder.isTypeSupported(m));
    this.chunks = [];
    this.detencionPedida = false;
    this.tieneAudio = stream.getAudioTracks().length > 0;

    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 2_500_000,
      audioBitsPerSecond: 128_000,
    });

    this.cierre = new Promise<void>((resolve) => {
      recorder.onstop = () => {
        this.finMs = Date.now();
        this.grabando.set(false);
        resolve();
      };
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    recorder.onerror = () => this.grabando.set(false);

    this.recorder = recorder;
    this.inicioMs = Date.now();
    recorder.start(1000); // un fragmento por segundo: si algo falla, lo ya grabado se conserva
    this.grabando.set(true);
  }

  /** Detiene la grabación y devuelve el archivo completo. */
  async detener(): Promise<ResultadoGrabacion | null> {
    const recorder = this.recorder;
    if (!recorder) return null;

    if (recorder.state !== 'inactive') {
      this.detencionPedida = true;
      recorder.stop();
    }
    await this.cierre;

    const fin = this.finMs || Date.now();
    const resultado: ResultadoGrabacion = {
      blob: new Blob(this.chunks, { type: 'video/webm' }),
      duracionSegundos: Math.max(0, Math.round((fin - this.inicioMs) / 1000)),
      tieneAudioCliente: this.tieneAudio,
      inesperado: !this.detencionPedida,
    };
    this.recorder = null;
    return resultado;
  }

  /** Descarta todo (al destruir el componente sin haber finalizado). */
  cancelar(): void {
    if (this.recorder && this.recorder.state !== 'inactive') {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.recorder = null;
    this.chunks = [];
    this.grabando.set(false);
  }
}
