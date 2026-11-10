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

/** Espejo de ProductoDTO del backend (/api/productos). */
export interface ProductoDTO {
  id?: number;
  /** Lo devuelve el backend; ya no se envía: la empresa sale de la sesión. */
  empresaId?: number;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  esActivo?: boolean;
  version?: number;
  creadoEn?: string;
  actualizadoEn?: string;
  /** El backend aún no lo expone; la tabla muestra "—" mientras no llegue. */
  entrevistas?: number;
}

/** Espejo de ProductoRequestDTO: lo único que el backend acepta al crear o editar un producto. */
export interface ProductoRequest {
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  esActivo?: boolean;
}

/** Espejo de CuentaDTO del backend (solo los campos que usa el frontend). */
export interface CuentaDTO {
  id: number;
  empresaId?: number | null;
  nombreCompleto: string;
  correo?: string;
  rol: 'ADMINISTRADOR' | 'CLIENTE_ADMINISTRADOR' | 'REPRESENTANTE' | string;
  estado?: 'PENDIENTE' | 'ACTIVA' | 'INACTIVA' | string;
  ultimoIngresoEn?: string | null;
  version?: number;
  creadoEn?: string;
}

/** Espejo de CrearRepresentanteDTO: lo único que el back-end acepta al registrar un representante. */
export interface CrearRepresentanteRequest {
  nombreCompleto: string;
  correo: string;
}

/** Espejo de PaqueteDTO del back-end (/api/paquetes). */
export interface PaqueteDTO {
  id: number;
  nombre: string;
  cantidadSalas: number;
  precio: number;
  esActivo: boolean;
  creadoEn?: string;
  actualizadoEn?: string;
}

export type EstadoPago = 'APROBADO' | 'RECHAZADO';

/** Espejo de CompraDTO del back-end (/api/compras). */
export interface CompraDTO {
  id: number;
  empresaId: number;
  paqueteId: number;
  cuentaId: number;
  monto: number;
  salasAcreditadas: number;
  estadoPago: EstadoPago;
  referenciaPago?: string | null;
  claveIdempotencia?: string;
  creadoEn: string;
}

/**
 * Lo que envía el front al comprar. El back-end reemplaza `monto` y `salasAcreditadas` con los
 * valores reales del paquete, así que no se mandan.
 */
export interface CompraRequest {
  empresaId: number;
  paqueteId: number;
  cuentaId: number;
  estadoPago: EstadoPago;
  referenciaPago: string;
  claveIdempotencia: string;
}

/** Espejo de EntrevistaDTO del backend. */
export interface EntrevistaDTO {
  id?: number;
  salaId: number;
  representanteId: number;
  estado?: string;
  inicioEn?: string;
  finEn?: string | null;
  duracionSegundos?: number | null;
}


