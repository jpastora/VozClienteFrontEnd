# Backend: señalización WebSocket por salas

El frontend se conecta a `ws://<host>/signaling?token=<token>` (WebSocket nativo, sin STOMP) y
envía mensajes JSON (`join`, `offer`, `answer`, `ice`, `leave`). Tu `WebSocketConfig` actual
(`/signaling`) sirve tal cual; solo hay que cambiar el handler y un par de cosas más.

## 1. Por qué cambiar el handler

El `SignalingSocketHandler` actual reenvía cada mensaje a **todas** las sesiones conectadas.
Con una sola llamada funciona, pero con dos salas simultáneas el audio/video de una se negociaría
con la otra. La solución: agrupar las sesiones por `token` de sala.

```java
package com.eduardo.vozclientebackend.websockets;

import com.eduardo.vozclientebackend.repository.SalaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class SignalingSocketHandler extends TextWebSocketHandler {

    private static final int MAX_PARTICIPANTES = 2; // representante + consumidor
    private static final String ATTR_TOKEN = "token";

    private final SalaRepository salaRepository;

    // token de sala -> sesiones conectadas a esa sala
    private final Map<String, Set<WebSocketSession>> salas = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {
        String token = UriComponentsBuilder.fromUri(session.getUri()).build()
            .getQueryParams().getFirst("token");

        if (token == null || !salaRepository.existsByToken(token)) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Sala no encontrada."));
            return;
        }

        Set<WebSocketSession> sala = salas.computeIfAbsent(token, t -> ConcurrentHashMap.newKeySet());
        synchronized (sala) {
            if (sala.size() >= MAX_PARTICIPANTES) {
                session.close(CloseStatus.POLICY_VIOLATION.withReason("La sala ya está llena."));
                return;
            }
            sala.add(session);
        }
        session.getAttributes().put(ATTR_TOKEN, token);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        // "ping" es el keep-alive del frontend (evita que nginx/Docker cierre sockets inactivos).
        if ("ping".equals(message.getPayload())) return;

        String token = (String) session.getAttributes().get(ATTR_TOKEN);
        if (token == null) return;

        for (WebSocketSession otra : salas.getOrDefault(token, Set.of())) {
            if (otra.isOpen() && !otra.getId().equals(session.getId())) {
                // WebSocketSession no admite envíos concurrentes.
                synchronized (otra) {
                    otra.sendMessage(message);
                }
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String token = (String) session.getAttributes().get(ATTR_TOKEN);
        if (token == null) return;

        Set<WebSocketSession> sala = salas.get(token);
        if (sala != null) {
            sala.remove(session);
            if (sala.isEmpty()) salas.remove(token);
        }
    }
}
```

`SalaRepository.existsByToken` ya lo usas en `SalaService`.

## 2. Tamaño de mensaje WebSocket

Tomcat limita cada mensaje de texto a **8 KB** por defecto, y una oferta SDP con audio + video
puede acercarse o superarlo (la conexión se cierra con error 1009). Añade a tu `WebSocketConfig`:

```java
@Bean
public ServletServerContainerFactoryBean createWebSocketContainer() {
    ServletServerContainerFactoryBean container = new ServletServerContainerFactoryBean();
    container.setMaxTextMessageBufferSize(64 * 1024);
    return container;
}
```

(`org.springframework.web.socket.server.standard.ServletServerContainerFactoryBean`.)

## 3. Tamaño máximo de subida (importante)

Spring limita cada archivo a **1 MB** por defecto; una videollamada grabada lo supera en segundos.
En `application.properties`:

```properties
spring.servlet.multipart.max-file-size=500MB
spring.servlet.multipart.max-request-size=500MB
```

## 4. Docker

Si el frontend se sirve con nginx en un contenedor y hace de proxy hacia el backend, `/signaling`
necesita las cabeceras de upgrade (sin ellas el WebSocket falla con 400/426):

```nginx
location /api/ {
    proxy_pass http://backend:8070;
}

location /signaling {
    proxy_pass http://backend:8070;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 3600s;
}
```

Si no usas proxy y el frontend llama directo al backend, cambia `API_URL` y `WS_URL` en
`src/app/core/config.ts` (y habilita CORS en el backend para `/api`).

## 5. Observaciones sobre lo que ya tienes

- **Una grabación por entrevista:** `GrabacionService` rechaza una segunda grabación (`existsByEntrevistaId`).
  El frontend sube un único archivo al finalizar; si la conexión se pierde del todo, sube lo grabado con `esParcial=true`.
- **Errores:** las `IllegalStateException`/`RuntimeException` salen como HTTP 500. Un `@RestControllerAdvice`
  que devuelva 404/409/410 mejoraría los mensajes en pantalla.
- **Duración del .webm:** `MediaRecorder` genera archivos sin metadato de duración (no se puede saltar en el reproductor).
  Si lo necesitas, corrige en servidor con `ffmpeg -i in.webm -c copy out.webm`.
- **Entrevista:** el frontend recibe `entrevistaId` por query (`/representante/<token>?entrevistaId=12`) o por un campo en el lobby,
  porque no vi el controlador de entrevistas.
- **Seguridad:** `permitAll()` y `setAllowedOrigins("*")` están bien para desarrollo local; antes de producción
  restringe los orígenes y protege los endpoints del representante.
