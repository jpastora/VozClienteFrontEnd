export type Rol = 'representante' | 'consumidor';

/** Campos conocidos por SalaService; los opcionales dependen de tu SalaDTO real. */
export interface SalaDTO {
  id?: number;
  token: string;
  estado: 'PENDIENTE' | 'RESPONDIDO' | 'EXPIRADO' | string;
  productoId: number;
  creadoPorId: number;
  emitidaEn?: string;
  venceEn?: string;
  nombreConsumidor?: string | null;
  aceptoGrabacionEn?: string | null;
  // Opcionales: úsalos si tu DTO los expone.
  productoNombre?: string;
  entrevistaId?: number;
}

export interface GrabacionDTO {
  id?: number;
  entrevistaId?: number;
  formato?: string;
  tamanoBytes?: number;
  duracionSegundos?: number;
  hashSha256?: string;
  tieneAudioCliente?: boolean;
  esParcial?: boolean;
  estado?: string;
  creadoEn?: string;
}

export type TipoSenal = 'join' | 'offer' | 'answer' | 'ice' | 'leave';

/** Mensaje de señalización que viaja por WebSocket. El backend solo lo retransmite. */
export interface SenalMensaje {
  tipo: TipoSenal;
  de: Rol;
  nombre?: string;
  /** Identifica cada RTCPeerConnection creada por el representante. */
  sesion?: string;
  sdp?: string;
  candidato?: RTCIceCandidateInit;
}

export type EstadoConexion = 'nuevo' | 'conectando' | 'conectado' | 'inestable' | 'fallido' | 'cerrado';

export interface ResultadoGrabacion {
  blob: Blob;
  duracionSegundos: number;
  tieneAudioCliente: boolean;
  /** true si la grabación se detuvo sola (p. ej. cambiaron las pistas) y no por el usuario. */
  inesperado: boolean;
}
