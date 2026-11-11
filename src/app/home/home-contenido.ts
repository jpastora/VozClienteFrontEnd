/**
 * Textos del home público (Figura 3 del informe de diseño). Se separan de las plantillas para
 * revisarlos y ajustarlos en un solo lugar. Las cifras describen reglas del producto, no resultados.
 */

/** Enlace de la barra de navegación hacia una sección del home. */
export interface EnlaceSeccion {
  id: string;
  texto: string;
}

/** Cifra destacada de la sección de propuesta. */
export interface CifraPropuesta {
  valor: number;
  unidad: string;
  descripcion: string;
  destacada: boolean;
}

/** Paso del flujo de uso. */
export interface PasoUso {
  numero: string;
  titulo: string;
  descripcion: string;
}

/** Tarjeta de la cuadrícula de funcionalidades. */
export interface Funcionalidad {
  clave: 'videollamada' | 'canal' | 'transcripcion' | 'analisis' | 'reportes';
  titulo: string;
  descripcion: string;
}

/** Línea de la transcripción de ejemplo. */
export interface LineaTranscripcion {
  tiempo: string;
  texto: string;
}

/** Secciones a las que lleva la barra de navegación (los id existen en home.component.html). */
export const ENLACES_SECCION: EnlaceSeccion[] = [
  { id: 'como-funciona', texto: 'Cómo funciona' },
  { id: 'resultados', texto: 'Resultados' },
  { id: 'funcionalidades', texto: 'Funcionalidades' },
  { id: 'paquetes', texto: 'Paquetes' },
];

/** Etiquetas de la cinta animada. */
export const CAPACIDADES: string[] = [
  'Intención de compra',
  'Detección de competencia',
  'Transcripción diferida',
  'Videollamada propia',
  'Canal del cliente aislado',
  'Reportes por producto',
  'Enlaces de un solo uso',
];

/** Reglas del producto que se muestran como cifras. */
export const CIFRAS: CifraPropuesta[] = [
  { valor: 1, unidad: 'canal', descripcion: 'Solo la voz del cliente se transcribe y se analiza.', destacada: true },
  { valor: 2, unidad: 'personas', descripcion: 'Por sala: el representante y el consumidor, sin terceros.', destacada: false },
  { valor: 7, unidad: 'días', descripcion: 'De vigencia para cada enlace único de entrevista.', destacada: false },
];

/** Flujo de uso en cuatro pasos (crear producto → enlace → videollamada → análisis). */
export const PASOS: PasoUso[] = [
  {
    numero: '01',
    titulo: 'Registra tus productos',
    descripcion: 'Crea el catálogo que quieres evaluar. Cada producto acumula sus propias entrevistas y estadísticas.',
  },
  {
    numero: '02',
    titulo: 'Genera el enlace de sala',
    descripcion: 'Un enlace único por entrevista, válido por 7 días. El consumidor entra solo con su nombre, sin crear cuenta.',
  },
  {
    numero: '03',
    titulo: 'Entrevista por videollamada',
    descripcion: 'La sala graba aparte el canal del cliente y guía al representante con preguntas sugeridas.',
  },
  {
    numero: '04',
    titulo: 'Analiza con IA',
    descripcion: 'Whisper transcribe la voz del cliente y la IA identifica la intención de compra y las marcas de la competencia.',
  },
];

/** Cuadrícula de funcionalidades. */
export const FUNCIONALIDADES: Funcionalidad[] = [
  {
    clave: 'videollamada',
    titulo: 'Videollamada propia',
    descripcion: 'Sin Zoom ni Meet: la sala es parte de la plataforma y controla el audio de cada participante.',
  },
  {
    clave: 'canal',
    titulo: 'Voz del cliente aislada',
    descripcion: 'El canal del consumidor se graba por separado para que el análisis no mezcle al entrevistador.',
  },
  {
    clave: 'transcripcion',
    titulo: 'Transcripción con Whisper',
    descripcion: 'Texto con marcas de tiempo, procesado después de la llamada.',
  },
  {
    clave: 'analisis',
    titulo: 'Intención y competencia',
    descripcion: 'Clasifica la intención de compra y cuenta las menciones de otras marcas.',
  },
  {
    clave: 'reportes',
    titulo: 'Reportes por producto',
    descripcion: 'Estadísticas por periodo y reporte descargable en PDF.',
  },
];

/** Entrevista ficticia de la demostración (datos de ejemplo). */
export const TRANSCRIPCION_DEMO: LineaTranscripcion[] = [
  { tiempo: '00:12', texto: 'Lo compré hace dos meses y lo uso casi todos los días.' },
  { tiempo: '00:31', texto: 'Antes tenía unos de otra marca, pero se gastaban muy rápido.' },
  { tiempo: '00:58', texto: 'Sí, lo volvería a comprar, aunque el precio me pareció alto.' },
];