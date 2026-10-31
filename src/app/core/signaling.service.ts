import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { WS_URL } from './config';
import { SenalMensaje } from './models';

/** Código con el que el backend cierra la conexión si el token no existe o la sala está llena. */
const CODIGO_RECHAZO = 1008;

/**
 * Canal de señalización WebRTC sobre WebSocket nativo (ws://.../signaling?token=...).
 * Solo transporta SDP e ICE; el audio/video viaja directo entre navegadores (P2P).
 * Se provee a nivel de componente: una instancia por llamada.
 */
@Injectable()
export class SignalingService {
  readonly mensajes$ = new Subject<SenalMensaje>();
  /** Emite el motivo cuando el servidor rechaza o cierra la sala (no se reintenta). */
  readonly rechazo$ = new Subject<string>();
  readonly conectado = signal(false);

  private ws?: WebSocket;
  private cerradoPorNosotros = false;
  private reintentoId?: ReturnType<typeof setTimeout>;
  private pingId?: ReturnType<typeof setInterval>;

  /** Resuelve en la primera conexión; después reconecta solo cada 3 s si se cae. */
  conectar(token: string): Promise<void> {
    this.cerradoPorNosotros = false;

    return new Promise<void>((resolve, reject) => {
      let primera = true;

      const abrir = () => {
        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
        this.ws = ws;

        ws.onopen = () => {
          this.conectado.set(true);
          this.iniciarPing();
          if (primera) {
            primera = false;
            resolve();
          }
        };

        ws.onmessage = (e) => {
          try {
            this.mensajes$.next(JSON.parse(e.data as string) as SenalMensaje);
          } catch {
            /* mensaje malformado: se ignora */
          }
        };

        ws.onclose = (e) => {
          this.conectado.set(false);
          this.detenerPing();
          if (this.cerradoPorNosotros) return;

          if (e.code === CODIGO_RECHAZO) {
            const motivo = e.reason || 'La sala no está disponible.';
            if (primera) {
              primera = false;
              reject(new Error(motivo));
            } else {
              this.rechazo$.next(motivo);
            }
            return;
          }
          if (primera) {
            primera = false;
            reject(new Error('No se pudo conectar con el servidor de señalización.'));
            return;
          }
          this.reintentoId = setTimeout(abrir, 3000);
        };
      };

      abrir();
    });
  }

  enviar(msg: SenalMensaje): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  desconectar(): void {
    this.cerradoPorNosotros = true;
    clearTimeout(this.reintentoId);
    this.detenerPing();
    this.conectado.set(false);
    this.ws?.close();
    this.ws = undefined;
  }

  /** Mantiene viva la conexión a través de proxies (nginx cierra sockets inactivos a los 60 s). */
  private iniciarPing(): void {
    this.detenerPing();
    this.pingId = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) this.ws.send('ping');
    }, 25_000);
  }

  private detenerPing(): void {
    clearInterval(this.pingId);
    this.pingId = undefined;
  }
}
