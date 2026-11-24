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
  motivo?: 'limite';
}

export type EstadoConexion =
  | 'nuevo'
  | 'conectando'
  | 'conectado'
  | 'inestable'
  | 'fallido'
  | 'cerrado';

export interface ResultadoGrabacion {
  /** Copia completa del canal del cliente (respaldo local para "Descargar copia"). */
  blob: Blob;
  duracionSegundos: number;
  tieneAudioCliente: boolean;
  inesperado: boolean;
}

/** Canal de la grabación por fragmentos (espejo de CanalGrabacion del back-end). */
export type CanalGrabacion = 'CLIENTE' | 'REPRESENTANTE';

/** Espejo de FragmentoAckDTO: confirmación de un fragmento recibido. */
export interface FragmentoAck {
  entrevistaId: number;
  canal: CanalGrabacion;
  ultimaSecuencia: number;
  bytesConfirmados: number;
}

/** Cuerpo de finalizar la grabación (POST .../finalizar). */
export interface FinalizarGrabacionRequest {
  duracionSegundos: number;
  tieneAudioCliente: boolean;
  esParcial: boolean;
}

// ============================================
// PRODUCTOS
// ============================================

export interface ProductoDTO {
  id?: number;
  empresaId?: number;
  representanteId?: number | null; 
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
  representanteId?: number | null; 
}

// ============================================
// CUENTAS
// ============================================

export interface CuentaDTO {
  id: number;
  empresaId?: number | null;
  nombreCompleto: string;
  correo?: string;
  /** Distinto de nulo si la cuenta ya está vinculada a Google (no usa contraseña). */
  googleSub?: string | null;

  rol: 'ADMINISTRADOR' | 'CLIENTE_ADMINISTRADOR' | 'REPRESENTANTE' | string;
  estado?: 'PENDIENTE' | 'ACTIVA' | 'INACTIVA' | string;
  ultimoIngresoEn?: string | null;
  version?: number;
  creadoEn?: string;
  /** Solo al crear un representante o reenviar su contraseña: si el correo salió; nulo en el resto. */
  correoEnviado?: boolean | null;
}

/** Espejo de CrearRepresentanteDTO: lo único que el back-end acepta al registrar un representante. */
export interface CrearRepresentanteRequest {
  nombreCompleto: string;
  correo: string;
  /** Verdadero si ingresará con Google: no se genera contraseña ni se envía correo. */
  ingresaConGoogle?: boolean;
}

/** Espejo de CrearCuentaDTO: alta de una cuenta con cualquier rol (POST /api/cuentas). */
export interface CrearCuentaRequest {
  nombreCompleto: string;
  correo: string;
  rol: RolCuentaApi;
  /** Obligatoria salvo para ADMINISTRADOR (el back-end la ignora). */
  empresaId?: number | null;
  /** Verdadero si ingresará con Google: no se genera contraseña ni se envía correo. */
  ingresaConGoogle?: boolean;
}

export type RolCuentaApi = 'ADMINISTRADOR' | 'CLIENTE_ADMINISTRADOR' | 'REPRESENTANTE';

/** Espejo de CuentaGlobalDTO: cuenta tal como la ve el administrador de la plataforma. */
export interface CuentaGlobalDTO {
  id: number;
  empresaId: number | null;
  empresaNombre: string | null;
  nombreCompleto: string;
  correo: string;
  rol: RolCuentaApi;
  estado: 'PENDIENTE' | 'ACTIVA' | 'INACTIVA';
  ultimoIngresoEn: string | null;
  version: number;
  creadoEn: string;
  actualizadoEn: string;
  /** Verdadero si todavía no cambió la contraseña temporal. */
  contrasenaTemporalPendiente: boolean;
  /** Solo al crear o reenviar: si el correo salió; nulo en el resto. */
  /** Verdadero si la cuenta ya está vinculada a Google: no usa contraseña. */
  ingresaConGoogle: boolean;
  correoEnviado: boolean | null;
}

/** Espejo de CambiarRolRequestDTO: la versión evita pisar un cambio hecho por otra persona. */
export interface CambiarRolRequest {
  nuevoRol: RolCuentaApi;
  version: number;
  /** Obligatoria al pasar un ADMINISTRADOR a otro rol. */
  empresaId?: number | null;
}

/** Espejo de CambiarEstadoRequestDTO. */
export interface CambiarEstadoRequest {
  activa: boolean;
  version: number;
}

/** Espejo de CambiarContrasenaDTO. */
export interface CambiarContrasenaRequest {
  contrasenaActual: string;
  contrasenaNueva: string;
}

/** Espejo de EmpresaDTO (/api/empresas). */
export interface EmpresaDTO {
  id: number;
  nombre: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

/** Espejo de PanelGlobalDTO (/api/panel-global, RF-19). */
export interface ConteoDTO {
  clave: string;
  cantidad: number;
}

export interface ClientePrincipalDTO {
  empresaId: number;
  nombre: string;
  ingresos: number;
  entrevistas: number;
}

export interface PanelGlobalDTO {
  ingresosTotales: number;
  comprasAprobadas: number;
  totalEmpresas: number;
  totalEntrevistas: number;
  entrevistasPorEstado: ConteoDTO[];
  intencionGlobal: ConteoDTO[];
  clientesPrincipales: ClientePrincipalDTO[];
}

/** Espejo de CambioRolDTO: una fila de la bitácora de cambios de rol de una cuenta. */
export interface CambioRolDTO {
  id: number;
  cuentaId: number;
  autorId: number;
  rolAnterior: string;
  rolNuevo: string;
  creadoEn: string;
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

/** Lo que envía el administrador al crear o editar un paquete (RF-17). */
export interface PaqueteRequest {
  nombre: string;
  cantidadSalas: number;
  precio: number;
  esActivo?: boolean;
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
 * Lo que envía el front al comprar (POST /api/compras, RF-18). La empresa y la cuenta salen de la
 * sesión, y el monto, las salas y el estado del pago los decide el back-end con el pago simulado.
 * Los datos de la tarjeta de prueba no se guardan: solo los últimos 4 dígitos quedan en la referencia.
 */
export interface CompraRequest {
  paqueteId: number;
  claveIdempotencia: string;
  titular: string;
  numeroTarjeta: string;
  /** MM/AA */
  vencimiento: string;
  cvv: string;
}

/** Espejo de SaldoSalasDTO del back-end (GET /api/saldo). */
export interface SaldoSalasDTO {
  empresaId: number;
  /** Salas de las compras con pago aprobado. */
  acreditadas: number;
  /** Salas cuya llamada terminó con una grabación correcta. */
  consumidas: number;
  /** Enlaces vigentes todavía sin usar. */
  reservadas: number;
  /** acreditadas − consumidas. */
  saldo: number;
  /** Salas que todavía se pueden usar para generar enlaces nuevos. */
  disponibles: number;
}

/** Espejo de ConsumoSalaDTO del back-end (GET /api/saldo/consumos). */
export interface ConsumoSalaDTO {
  salaId: number;
  productoId: number;
  producto: string;
  nombreConsumidor: string | null;
  consumidaEn: string;
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


// ============================================
// GUÍAS DE PREGUNTAS
// ============================================


export interface GuiaDTO {
  id?: number;
  titulo: string;
  preguntas: string[];
  empresaId: number;
  cuentaId: number;
}
/** Espejo de CompletarPerfilDTO: formulario del primer ingreso con Google. */
export interface CompletarPerfilRequest {
  nombreCompleto: string;
  nombreEmpresa: string;
}

/** Espejo de EditarCuentaDTO: edición de nombre, correo y empresa (PUT /api/cuentas/{id}). */
export interface EditarCuentaRequest {
  nombreCompleto: string;
  correo: string;
  empresaId?: number | null;
  version: number;
}
