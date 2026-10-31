# Voz Cliente — Frontend de videollamada (Angular + WebRTC)

Videollamada entre un **representante** y un **consumidor**. El navegador del representante graba el
**canal del cliente** (audio + video que llega por WebRTC) a `.webm` con `MediaRecorder` y lo sube
a `POST /api/v1/grabaciones` al finalizar.

## Ejecutar

```bash
npm install
npm start            # http://localhost:4200 (proxy a http://localhost:8070 para /api y /signaling)
```

Antes: aplica los cambios de [BACKEND-SENALIZACION.md](./BACKEND-SENALIZACION.md).

## Rutas

| Quién | URL | Qué hace |
|---|---|---|
| Consumidor | `/sala/<token>` | Pide nombre + aceptación de grabación → `PATCH /api/salas/{token}/responder` → entra a la llamada |
| Representante | `/representante/<token>?entrevistaId=12` | Entra, espera al consumidor, graba su canal, sube el `.webm` al finalizar |

Orden recomendado: abrir primero la sala del representante, luego compartir el enlace `/sala/<token>`.

## Flujo técnico

1. Ambos cargan la sala (`GET /api/salas/{token}`) y validan que no esté expirada.
2. Se conectan por WebSocket a `/signaling?token=<token>` y envían `join`; el representante crea la oferta SDP, el consumidor responde, y se intercambian candidatos ICE.
3. Con la conexión establecida, el representante empieza a grabar el stream remoto (VP9/VP8 + Opus).
4. Si la conexión se degrada: aviso «Conexión inestable. Reintentando… N s», reinicio de ICE cada 8 s sobre la misma conexión (no se pierde la grabación) y, tras 30 s, cierre con `esParcial=true`.
5. Al finalizar se envía `leave`, se detiene el grabador y se sube el archivo con barra de progreso. Si falla la subida: reintentar o descargar copia local.

## Estructura

```
src/app/
  core/            config, modelos, APIs HTTP, señalización WebSocket, WebRTC, grabador
  videollamada/    componente (lobby, llamada, subida), directiva de <video>
```

Ajustes en `src/app/core/config.ts`: servidores ICE/TURN, tiempo de reintento y preguntas de la guía.

## Requisitos y límites

- **HTTPS obligatorio** fuera de `localhost` (si no, el navegador bloquea cámara y micrófono).
- **TURN** recomendado en producción: solo con STUN algunas redes (NAT simétrico, corporativas) no conectan.
- Grabar `.webm` requiere Chrome, Edge o Firefox; Safari soporta `MediaRecorder` con limitaciones.
- La grabación vive en memoria hasta subirse: si el representante cierra la pestaña antes, se pierde.
