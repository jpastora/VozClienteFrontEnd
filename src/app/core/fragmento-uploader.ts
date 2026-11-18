import { computed, signal } from '@angular/core';
import { CanalGrabacion, FragmentoAck } from './models';

/** Un fragmento listo para enviar. `hash` es opcional y se resuelve en segundo plano. */
export interface FragmentoEnCola {
  secuencia: number;
  blob: Blob;
  hash: Promise<string | undefined>;
}

/**
 * - ok: se envía con normalidad.
 * - sin-conexion: fallo de red o del servidor; se reintenta con espera creciente y se sigue encolando.
 * - cerrada: el servidor ya cerró la grabación (409 sin secuenciaEsperada); no se acepta más.
 * - rechazada: el servidor rechazó el envío (400 u otro error que reintentar no arregla).
 */
export type EstadoEnvio = 'ok' | 'sin-conexion' | 'cerrada' | 'rechazada';

export interface OpcionesUploader {
  /** Se ejecuta una vez antes del primer fragmento (crea la grabación en el servidor). */
  preparar: () => Promise<unknown>;
  enviar: (canal: CanalGrabacion, secuencia: number, blob: Blob, hash?: string) => Promise<FragmentoAck>;
}

const ESPERA_MIN_MS = 1_000;
const ESPERA_MAX_MS = 15_000;
const MAX_CONFLICTOS_SEGUIDOS = 5;

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Extrae lo que importa de un error HTTP sin depender de Angular (facilita las pruebas). */
function leerError(e: unknown): { status: number; secuenciaEsperada?: number } {
  const x = e as { status?: number; error?: { secuenciaEsperada?: unknown } } | null;
  const esperada = x?.error?.secuenciaEsperada;
  return {
    status: typeof x?.status === 'number' ? x.status : 0,
    secuenciaEsperada: typeof esperada === 'number' ? esperada : undefined,
  };
}

/**
 * Cola de envío de fragmentos: una por canal, enviando de a uno y en orden.
 *
 * - Falla de red/servidor (0, 5xx, 408, 429): el fragmento sigue en cola y se reintenta con espera creciente.
 * - 409 con secuenciaEsperada: se descarta lo que el servidor ya tiene y se reenvía desde ahí.
 * - 409 sin secuenciaEsperada (grabación cerrada) o 400/otros 4xx: se detiene el envío.
 */
export class FragmentoUploader {
  readonly estado = signal<EstadoEnvio>('ok');
  readonly detalleError = signal('');
  /** Fragmentos en cola (aún no confirmados por el servidor), sumando ambos canales. */
  readonly pendientes = signal(0);
  /** Momento de la última confirmación del servidor; sirve para decir "se conservó hasta las HH:MM". */
  readonly ultimaConfirmacion = signal<Date | null>(null);
  readonly detenido = computed(() => this.estado() === 'cerrada' || this.estado() === 'rechazada');

  private colas: Record<CanalGrabacion, FragmentoEnCola[]> = { CLIENTE: [], REPRESENTANTE: [] };
  private preparado = false;
  private corriendo = false;
  private intentos = 0;
  private conflictos = 0;
  private despertar: (() => void) | null = null;
  private turno = 0;

  constructor(private readonly op: OpcionesUploader) {}

  /** Arranca el envío (y la preparación en el servidor) aunque todavía no haya fragmentos. */
  iniciar(): void {
    void this.bombear();
  }

  encolar(canal: CanalGrabacion, f: FragmentoEnCola): void {
    this.colas[canal].push(f);
    this.refrescar();
    void this.bombear();
  }

  /** Cancela la espera de reintento y vuelve a intentar ya (p. ej. el usuario pulsó "Reintentar"). */
  reintentarYa(): void {
    if (this.detenido()) return;
    this.intentos = 0;
    this.despertar?.();
    void this.bombear();
  }

  /** Espera a que la cola se vacíe, hasta `maxMs`. Devuelve true si quedó vacía. */
  async vaciar(maxMs: number): Promise<boolean> {
    this.reintentarYa();
    const limite = Date.now() + maxMs;
    while (this.pendientes() > 0 && !this.detenido() && Date.now() < limite) {
      await dormir(150);
    }
    return this.pendientes() === 0;
  }

  /** Detiene reintentos y descarta la cola (al destruir el componente). */
  cancelar(): void {
    this.colas = { CLIENTE: [], REPRESENTANTE: [] };
    this.estado.set('rechazada');
    this.despertar?.();
    this.refrescar();
  }

  // ---------------------------------------------------------------

  private refrescar(): void {
    this.pendientes.set(this.colas.CLIENTE.length + this.colas.REPRESENTANTE.length);
  }

  /** Alterna entre canales para que ninguno se quede esperando al otro. */
  private siguiente(): CanalGrabacion | null {
    const orden: CanalGrabacion[] = this.turno++ % 2 === 0 ? ['CLIENTE', 'REPRESENTANTE'] : ['REPRESENTANTE', 'CLIENTE'];
    return orden.find((c) => this.colas[c].length > 0) ?? null;
  }

  private async bombear(): Promise<void> {
    if (this.corriendo) return;
    this.corriendo = true;
    try {
      while (!this.detenido()) {
        if (!this.preparado) {
          try {
            await this.op.preparar();
            this.preparado = true;
            this.alExito();
          } catch (e) {
            if (!(await this.alError(e, null))) break;
          }
          continue;
        }

        const canal = this.siguiente();
        if (!canal) break;
        const item = this.colas[canal][0];
        try {
          const hash = await item.hash;
          const ack = await this.op.enviar(canal, item.secuencia, item.blob, hash);
          // Se descarta lo confirmado (incluye reenvíos que el servidor ya tenía).
          this.colas[canal] = this.colas[canal].filter((f) => f.secuencia > ack.ultimaSecuencia);
          this.alExito();
          this.ultimaConfirmacion.set(new Date());
          this.refrescar();
        } catch (e) {
          if (!(await this.alError(e, canal))) break;
        }
      }
    } finally {
      this.corriendo = false;
      this.refrescar();
      // Si llegó algo mientras se cerraba el bucle, se reanuda.
      if (!this.detenido() && (!this.preparado || this.pendientes() > 0) && this.estado() === 'ok') {
        void this.bombear();
      }
    }
  }

  private alExito(): void {
    this.intentos = 0;
    this.conflictos = 0;
    if (this.estado() === 'sin-conexion') this.estado.set('ok');
  }

  /** @returns true si hay que seguir intentando. */
  private async alError(e: unknown, canal: CanalGrabacion | null): Promise<boolean> {
    const { status, secuenciaEsperada } = leerError(e);

    if (status === 409 && canal && secuenciaEsperada !== undefined) {
      // El servidor ya tiene lo anterior: se descarta y se reenvía desde ahí.
      this.colas[canal] = this.colas[canal].filter((f) => f.secuencia >= secuenciaEsperada);
      this.refrescar();
      const cabeza = this.colas[canal][0];
      this.conflictos++;
      if ((cabeza && cabeza.secuencia > secuenciaEsperada) || this.conflictos > MAX_CONFLICTOS_SEGUIDOS) {
        // El servidor pide un fragmento que ya no tenemos: no hay forma de reanudar.
        this.detener('rechazada', 'El servidor pidió un fragmento que ya no está disponible.');
        return false;
      }
      return true;
    }
    if (status === 409) {
      this.detener('cerrada', 'La grabación ya fue cerrada por el servidor.');
      return false;
    }
    const reintentable = status === 0 || status >= 500 || status === 408 || status === 429;
    if (!reintentable) {
      this.detener('rechazada', status === 400 ? 'El servidor rechazó el fragmento.' : `Error ${status} al enviar.`);
      return false;
    }

    this.estado.set('sin-conexion');
    const espera = Math.min(ESPERA_MIN_MS * 2 ** this.intentos, ESPERA_MAX_MS);
    this.intentos++;
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, espera);
      this.despertar = () => {
        clearTimeout(t);
        resolve();
      };
    });
    this.despertar = null;
    return !this.detenido();
  }

  private detener(estado: 'cerrada' | 'rechazada', detalle: string): void {
    this.detalleError.set(detalle);
    this.estado.set(estado);
  }
}
