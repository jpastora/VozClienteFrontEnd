# vc-frontend (T-09 · Proyecto Angular base)

SPA de Voz Cliente en Angular 22 (señales, TypeScript estricto, CSS). Selectores con prefijo `vc-`.
Estructura al estilo de los proyectos del profesor: una carpeta por componente con `nombre.ts/.html/.css`,
más `interfaces/` y `services/`.

    src/app/
      app.ts · app.routes.ts · app.config.ts
      interfaces/usuario.ts        tipos (UsuarioInfo, RolInfo)
      services/session.ts          @Service, sesión en memoria
      guards/role.ts               guarda por rol
      shell/                       layout con navegación
      button/ field/ metric-card/ badge/ dialog/   componentes vc-
      ui-demo/                     catálogo de componentes (ruta /ui)
      auth/ products/ rooms/ transcription/ analysis/ reports/ packages/ admin/   M1–M8
      public-room/                 módulo público del consumidor
    src/styles.css                 tokens del estilo (paleta y tipografías)

Los colores de `src/styles.css` se muestrearon de los prototipos del informe (Code Black #0b0b0c, Paper #f4f4f2, Deep Circuit #0f4c55, Filament #ffb703, Concrete #c9c9c6); confirmarlos contra el Plan general.

    npm install
    npm start        # http://localhost:4200
    npm run build
