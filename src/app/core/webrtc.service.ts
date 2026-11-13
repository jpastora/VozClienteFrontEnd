import { Injectable, signal } from '@angular/core';
import { ICE_SERVERS } from './config';
import { EstadoConexion, SenalMensaje } from './models';

type Emisor = (m: Omit<SenalMensaje, 'de' | 'nombre'>) => void;

/**
 * Maneja medios locales y la RTCPeerConnection.
 * Solo el representante crea ofertas; el consumidor responde. Cada RTCPeerConnection nueva
 * lleva un id de `sesion` para descartar mensajes de negociaciones viejas (ofertas duplicadas,
 * recargas de página, etc.). Se provee a nivel de componente: una instancia por llamada.
 */
@Injectable()
export class WebrtcService {
  readonly localStream = signal<MediaStream | null>(null);
  readonly remoteStream = signal<MediaStream | null>(null);
  readonly remotoTieneVideo = signal(false);
  readonly estado = signal<EstadoConexion>('nuevo');
  readonly micActivo = signal(true);
  readonly camActivo = signal(true);
  readonly sinCamara = signal(false);

  private pc: RTCPeerConnection | null = null;
  private sesion = '';
  private iceEnEspera: RTCIceCandidateInit[] = [];
  private emitir: Emisor = () => undefined;
  private ultimaOfertaMs = 0;

  configurar(emitir: Emisor): void {
    this.emitir = emitir;
  }

  /** Pide micrófono y cámara. Si no hay cámara, continúa solo con audio. */
  async obtenerMedios(): Promise<void> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
    } catch {
      // Sin cámara o permiso de cámara denegado: se intenta solo audio (lanza si tampoco hay micrófono).
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.sinCamara.set(true);
      this.camActivo.set(false);
    }
    this.localStream.set(stream);
  }

  // ---------- Negociación ----------

  /** Representante: crea una conexión nueva y envía la oferta. */
  async iniciarOferta(): Promise<void> {
    this.crearConexion(crypto.randomUUID());
    this.ultimaOfertaMs = Date.now();
    await this.enviarOferta(false);
  }

  /** Evita crear dos conexiones cuando llegan 'join' casi simultáneos. */
  ofertaReciente(): boolean {
    return Date.now() - this.ultimaOfertaMs < 2000;
  }

  /** Representante: reinicia ICE sobre la misma conexión (no pierde las pistas ni la grabación). */
  async reiniciarIce(): Promise<void> {
    if (!this.pc || this.pc.signalingState !== 'stable') return;
    await this.enviarOferta(true);
  }

  /** Consumidor: responde a una oferta nueva o a un reinicio de ICE de la misma sesión. */
  async recibirOferta(sdp: string, sesion: string): Promise<void> {
    if (!this.pc || this.sesion !== sesion || this.pc.connectionState === 'closed') {
      this.crearConexion(sesion);
    }
    const pc = this.pc!;
    await pc.setRemoteDescription({ type: 'offer', sdp });
    await this.vaciarIce();
    const respuesta = await pc.createAnswer();
    await pc.setLocalDescription(respuesta);
    this.emitir({ tipo: 'answer', sesion, sdp: respuesta.sdp });
  }

  async recibirRespuesta(sdp: string, sesion: string): Promise<void> {
    const pc = this.pc;
    if (!pc || sesion !== this.sesion || pc.signalingState !== 'have-local-offer') return;
    await pc.setRemoteDescription({ type: 'answer', sdp });
    await this.vaciarIce();
  }

  async recibirIce(candidato: RTCIceCandidateInit, sesion: string): Promise<void> {
    if (sesion !== this.sesion) return;
    if (this.pc?.remoteDescription) {
      try {
        await this.pc.addIceCandidate(candidato);
      } catch {
        /* candidato de una negociación obsoleta */
      }
    } else {
      this.iceEnEspera.push(candidato);
    }
  }

  // ---------- Controles ----------

  alternarMicrofono(): void {
    const activo = !this.micActivo();
    this.localStream()?.getAudioTracks().forEach((t) => (t.enabled = activo));
    this.micActivo.set(activo);
  }

  alternarCamara(): void {
    if (this.sinCamara()) return;
    const activa = !this.camActivo();
    this.localStream()?.getVideoTracks().forEach((t) => (t.enabled = activa));
    this.camActivo.set(activa);
  }

  cerrar(): void {
    this.cerrarConexion();
    this.localStream()?.getTracks().forEach((t) => t.stop());
    this.localStream.set(null);
    this.remoteStream.set(null);
    this.remotoTieneVideo.set(false);
    this.estado.set('cerrado');
  }

  // ---------- Internos ----------

  private crearConexion(sesion: string): void {
    this.cerrarConexion();
    this.sesion = sesion;
    this.iceEnEspera = [];
    this.remotoTieneVideo.set(false);
    this.estado.set('conectando');

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;

    const local = this.localStream();
    local?.getTracks().forEach((t) => pc.addTrack(t, local));

    pc.onicecandidate = (e) => {
      if (e.candidate && pc === this.pc) {
        this.emitir({ tipo: 'ice', sesion, candidato: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      if (pc !== this.pc) return;
      const stream = e.streams[0] ?? new MediaStream([e.track]);
      if (this.remoteStream() !== stream) this.remoteStream.set(stream);
      if (e.track.kind === 'video') {
        // El track llega "muted" hasta que fluyen frames reales.
        this.remotoTieneVideo.set(!e.track.muted);
        e.track.onmute = () => this.remotoTieneVideo.set(false);
        e.track.onunmute = () => this.remotoTieneVideo.set(true);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc !== this.pc) return;
      switch (pc.connectionState) {
        case 'connected':
          this.estado.set('conectado');
          break;
        case 'disconnected':
          this.estado.set('inestable');
          break;
        case 'failed':
          this.estado.set('fallido');
          break;
        case 'closed':
          this.estado.set('cerrado');
          break;
        default:
          if (this.estado() === 'nuevo') this.estado.set('conectando');
      }
    };
  }

  private async enviarOferta(iceRestart: boolean): Promise<void> {
    const pc = this.pc!;
    const oferta = await pc.createOffer({ iceRestart });
    await pc.setLocalDescription(oferta);
    this.emitir({ tipo: 'offer', sesion: this.sesion, sdp: oferta.sdp });
  }

  private async vaciarIce(): Promise<void> {
    const pendientes = this.iceEnEspera;
    this.iceEnEspera = [];
    for (const c of pendientes) {
      try {
        await this.pc?.addIceCandidate(c);
      } catch {
        /* ignorar */
      }
    }
  }

  private cerrarConexion(): void {
    if (!this.pc) return;
    const pc = this.pc;
    this.pc = null;
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    pc.close();
  }
}
