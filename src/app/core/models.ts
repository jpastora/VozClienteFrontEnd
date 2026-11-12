export type Rol = 'representante' | 'consumidor';

// ============================================
// SALAS
// ============================================

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
  productoNombre?: string;
  entrevistaId?: number;
}

// ============================================
// GRABACIONES
// ============================================

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

// ============================================
// VIDEOLLAMADA Y SEÑALIZACIÓN
// ============================================

export type TipoSenal =
  | 'join'
  | 'offer'
  | 'answer'
  | 'ice'
  | 'leave';

export interface SenalMensaje {
  tipo: TipoSenal;
  de: Rol;
  nombre?: string;
  sesion?: string;
  sdp?: string;
  candidato?: RTCIceCandidateInit;
}

export type EstadoConexion =
  | 'nuevo'
  | 'conectando'
  | 'conectado'
  | 'inestable'
  | 'fallido'
  | 'cerrado';

export interface ResultadoGrabacion {
  blob: Blob;
  duracionSegundos: number;
  tieneAudioCliente: boolean;
  inesperado: boolean;
}

// ============================================
// PRODUCTOS
// ============================================

export interface ProductoDTO {
  id?: number;
  empresaId?: number;
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  esActivo?: boolean;
  version?: number;
  creadoEn?: string;
  actualizadoEn?: string;
  entrevistas?: number;
}

export interface ProductoRequest {
  nombre: string;
  descripcion?: string | null;
  categoria?: string | null;
  esActivo?: boolean;
}

// ============================================
// CUENTAS
// ============================================

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
  /** Opcional: contraseña inicial para que ingrese sin cuenta de Google. */
  contrasena?: string;
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

// ============================================
// ENTREVISTAS - MODELO GENERAL
// ============================================

export interface EntrevistaDTO {
  id?: number;
  salaId: number;
  representanteId: number;
  estado?: string;
  inicioEn?: string;
  finEn?: string | null;
  duracionSegundos?: number | null;
}

// ============================================
// PANEL DE ENTREVISTAS - ESTADOS
// ============================================

export type EstadoEntrevista =
  | 'EN_CURSO'
  | 'FINALIZADA'
  | 'FALLIDA';

export type EstadoTranscripcion =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'CON_ERROR'
  | 'SIN_CONTENIDO';

export type EstadoAnalisis =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'COMPLETADA'
  | 'CON_ERROR';

// ============================================
// PAGINACIÓN
// ============================================

export interface Pagina<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ============================================
// PANEL DE ENTREVISTAS - LISTADO
// ============================================

export interface EntrevistaListadoDTO {
  id: number;
  salaId: number;
  productoId: number;
  productoNombre: string | null;
  consumidorNombre: string | null;
  representanteId: number;
  representanteNombre: string | null;
  estado: EstadoEntrevista;
  inicioEn: string;
  finEn: string | null;
  duracionSegundos: number | null;
  grabacionId: number | null;
  transcripcionId: number | null;
  estadoTranscripcion: EstadoTranscripcion | null;
  analisisId: number | null;
  estadoAnalisis: EstadoAnalisis | null;
  puedeReintentar: boolean;
}

// ============================================
// PANEL DE ENTREVISTAS - FRAGMENTOS
// ============================================

export interface FragmentoTranscripcionDTO {
  id: number;
  transcripcionId: number;

  // Java BigDecimal se representa como número JSON.
  segundoInicio: number;
  segundoFin: number;

  texto: string;
}

// ============================================
// PANEL DE ENTREVISTAS - COMPETIDORES
// ============================================

export interface MencionCompetenciaDTO {
  id: number;
  analisisId: number;
  competidor: string;
  frecuencia: number;
  contexto: string | null;
}

// ============================================
// PANEL DE ENTREVISTAS - ANÁLISIS
// ============================================


export interface EntrevistaAnalisisDetalleDTO {
  id: number;
  estado: EstadoAnalisis;
  intencion: string | null;
  sentimiento: string | null;
  fragmentoApoyo: string | null;
  tieneMenciones: boolean | null;
  mensajeError: string | null;
  competidores: MencionCompetenciaDTO[];
}


// ============================================
// PANEL DE ENTREVISTAS - DETALLE
// ============================================

export interface EntrevistaDetalleDTO {
  id: number;
  salaId: number;
  productoId: number;
  productoNombre: string | null;
  consumidorNombre: string | null;
  representanteId: number;
  representanteNombre: string | null;
  estado: EstadoEntrevista;
  inicioEn: string;
  finEn: string | null;
  duracionSegundos: number | null;

  grabacionId: number | null;
  transcripcionId: number | null;
  estadoTranscripcion: EstadoTranscripcion | null;

  textoTranscripcion: string | null;
  idiomaDetectado: string | null;
  probabilidadIdioma: number | null;

  fragmentos: FragmentoTranscripcionDTO[] | null;

  analisis: EntrevistaAnalisisDetalleDTO | null;
}
