/**
 * Configuración central. En desarrollo, `proxy.conf.json` redirige /api y /ws al backend
 * (localhost:8070), así no hace falta configurar CORS. En producción, publica el frontend
 * y el backend bajo el mismo dominio (reverse proxy) o cambia estas constantes.
 */
export const API_URL = '/api';

/**
 * Dominio con el que se arman los enlaces que se envían a consumidores y representantes
 * (p. ej. 'https://abc123.ngrok-free.app'). Si queda vacío se usa el dominio con el que
 * abriste la aplicación.
 */
export const URL_PUBLICA = '';

export const urlBase = (): string => (URL_PUBLICA || location.origin).replace(/\/+$/, '');

/** Cuenta que crea las salas mientras no haya sesión real (datos de prueba V2: 1 = Carlos Mendoza, administrador). */
export const CUENTA_ID_PRUEBA = 1;

/** Endpoint WebSocket de señalización (SignalingSocketHandler). Se le añade ?token=<token>. */
export const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/signaling`;

/**
 * Servidores ICE. STUN solo sirve cuando ambos están en redes "abiertas".
 * Para producción añade un servidor TURN (p. ej. coturn), si no, algunos clientes
 * detrás de NAT simétrico o redes corporativas no podrán conectar.
 */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  // { urls: 'turn:turn.tudominio.com:3478', username: '...', credential: '...' },
];

/** Segundos que se reintenta la conexión antes de dar la llamada por perdida. */
export const SEGUNDOS_REINTENTO = 30;

/**
 * Duración máxima de la grabación (minutos), contada desde que ambos están conectados.
 * Cada canal del consumidor (audio + video) pesa ~10-20 MB por minuto y el servidor acepta hasta
 * 200 MB por archivo, así que 10 min es el tope seguro. Con 20 min habría que bajar el bitrate de
 * video (recorder.service.ts) o subir el límite del servidor (GrabacionService.MAX_BYTES).
 */
export const MINUTOS_MAX_GRABACION = 10;

/** Segundos antes del límite en que se avisa a ambos de que la grabación está por terminar. */
export const SEGUNDOS_AVISO_LIMITE = 60;

/** Preguntas guía que ve el representante durante la llamada. */
export const GUIA_SUGERIDA: string[] = [
  '¿Cómo fue su experiencia con el producto?',
  '¿Lo volvería a comprar? ¿Por qué?',
  '¿Lo comparó con otra marca?',
];