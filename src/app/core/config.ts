/**
 * Configuración central. En desarrollo, `proxy.conf.json` redirige /api y /ws al backend
 * (localhost:8070), así no hace falta configurar CORS. En producción, publica el frontend
 * y el backend bajo el mismo dominio (reverse proxy) o cambia estas constantes.
 */
export const API_URL = '/api';

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

/** Preguntas guía que ve el representante durante la llamada. */
export const GUIA_SUGERIDA: string[] = [
  '¿Cómo fue su experiencia con el producto?',
  '¿Lo volvería a comprar? ¿Por qué?',
  '¿Lo comparó con otra marca?',
];
