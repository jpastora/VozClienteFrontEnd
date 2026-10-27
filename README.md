# Voz Cliente — Frontend

Aplicación web de **Voz Cliente** (vozcliente.com), plataforma de videollamadas para capturar y analizar con IA la voz de clientes entrevistados sobre los productos de una empresa.

Proyecto de Ingeniería del Software 3 · Universidad Cenfotec · C2 2026 · **Brightcode Labs**

---

## Tabla de contenidos

1. [Stack tecnológico](#1-stack-tecnológico)
2. [Equipo](#2-equipo)
3. [Estrategia de ramas](#3-estrategia-de-ramas)
4. [Reglas del repositorio](#4-reglas-del-repositorio)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Estándar de codificación Angular y TypeScript](#6-estándar-de-codificación-angular-y-typescript)
7. [Guía de estilo de interfaz](#7-guía-de-estilo-de-interfaz)
8. [Pruebas unitarias](#8-pruebas-unitarias)
9. [Seguridad y configuración](#9-seguridad-y-configuración)
10. [Versionado](#10-versionado)

---

## 1. Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | Angular (TypeScript en modo estricto) |
| Entorno | Node.js LTS y npm |
| Calidad de código | ESLint y Prettier |
| Pruebas | Jasmine y Karma |
| Contenedores | Docker y Docker Compose |
| Integración continua | GitHub Actions |
| Gestión del proyecto | Asana |

> Todos los integrantes deben usar la misma versión de Node.js y de Angular CLI para evitar diferencias entre ambientes (riesgo R-C03).

## 2. Equipo

| Integrante | Rol | Rama personal |
|---|---|---|
| Joseph Pastora Ramos | Coordinador general | `joseph` |
| Eduardo Chacón Zamora | Coordinador de desarrollo | `eduardo` |
| Juan Diego González Víquez | Coordinador de desarrollo | `juandiego` |
| Matías Lutz | Coordinador de calidad | `matias` |
| Trayce González Brenes | Coordinadora de soporte | `trayce` |

## 3. Estrategia de ramas

| Rama | Propósito | Ambiente |
|---|---|---|
| `main` | Versión estable para entregas y demostraciones | Producción |
| `qa` | Pruebas funcionales, de regresión y de rendimiento | Calidad |
| `dev` | Integración del trabajo del equipo | Desarrollo |
| `<nombre>` | Rama personal de trabajo de cada integrante | Desarrollo (local) |
| `hotfix/VC-###-descripcion` | Corrección urgente de un error crítico en `main` | — |

**Flujo:** `rama personal → dev → qa → main`

1. Cada integrante trabaja en su rama personal y la sincroniza con `dev` al iniciar cada jornada:
   ```bash
   git checkout <nombre>
   git pull origin dev
   ```
2. Opcionalmente, para tareas grandes, se crean ramas de funcionalidad desde la rama personal: `feature/VC-123-descripcion` o `bugfix/VC-124-descripcion`, donde `VC-123` es el identificador de la tarea en Asana.
3. Los cambios se integran a `dev` mediante pull request.
4. La Coordinadora de soporte integra `dev → qa` al cierre del sprint y `qa → main` cuando la Coordinación de calidad aprueba.
5. Los `hotfix` salen de `main` y se sincronizan de vuelta con `dev`.

## 4. Reglas del repositorio

- **Prohibido el commit directo** a `dev`, `qa` y `main`; todo cambio entra por pull request.
- **Mensajes de commit** con Conventional Commits:
  ```
  tipo(alcance): descripción [VC-123]
  ```
  Tipos permitidos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`.
  Ejemplo: `feat(producto-lista): agregar filtro por estado [VC-031]`
- **Frecuencia:** al menos un commit por jornada y `push` al finalizarla; ningún trabajo permanece solo en una máquina.
- **Pull request:** vinculado a una historia de usuario, de tamaño reducido, con al menos una aprobación de la Coordinación de desarrollo y la integración continua en verde.
- **Merges a ramas principales:** solo la Coordinadora de soporte, quien resuelve los conflictos con apoyo del autor.
- **Qué se sube:** código fuente, pruebas, documentación y configuración sin secretos.
- **Qué no se sube:** credenciales, archivos `.env`, grabaciones reales, `node_modules/`, `dist/` ni archivos generados.

## 5. Estructura del proyecto

```
src/
├── app/
│   ├── core/                    # Servicios globales, interceptores, guards
│   ├── shared/                  # Componentes, pipes y directivas reutilizables
│   ├── producto/
│   │   ├── producto-lista/
│   │   │   ├── producto-lista.component.ts
│   │   │   ├── producto-lista.component.html
│   │   │   ├── producto-lista.component.scss
│   │   │   └── producto-lista.component.spec.ts
│   │   └── producto.service.ts
│   ├── sala/
│   └── transcripcion/
├── assets/
├── environments/
└── styles/                      # Variables de color, tipografía y componentes vc-
```

## 6. Estándar de codificación Angular y TypeScript

Basado en la guía de estilo oficial de Angular.

### 6.1 Idioma

- Identificadores del **dominio del negocio en español sin tildes**: `producto`, `sala`, `transcripcion`.
- **Términos técnicos en inglés**: `Component`, `Service`, `Guard`, `Interceptor`.
- Documentación y comentarios en español.

### 6.2 Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos | kebab-case con sufijo del tipo | `producto-lista.component.ts` |
| Clases | PascalCase | `ProductoListaComponent` |
| Selectores | Prefijo `vc-` en kebab-case | `vc-producto-lista` |
| Variables y funciones | camelCase | `totalProductos` |
| Constantes | MAYUSCULAS_CON_GUION_BAJO | `MAX_PARTICIPANTES` |
| Interfaces y tipos | PascalCase, sin prefijo `I` | `Producto`, `SalaResponse` |
| Observables | camelCase con sufijo `$` | `productos$` |
| Clases CSS | Prefijo `vc-` en kebab-case | `vc-tarjeta-metrica` |
| Controles de interfaz | Prefijo de tres letras + camelCase | `btnGuardarProducto`, `txtNombreProducto` |

### 6.3 Reglas de código

- `const` por defecto y `let` solo si el valor cambia; **nunca `var`**.
- Comparaciones siempre con `===` y `!==`.
- Un componente por archivo.
- La lógica de negocio y las llamadas HTTP viven en servicios, nunca en componentes.
- TypeScript en **modo estricto**; prohibido `any` salvo justificación documentada.
- Sangría de **2 espacios**, comillas simples y punto y coma, según la configuración de Prettier.
- ESLint y Prettier se ejecutan en la integración continua; un pull request con errores no se integra.

### 6.4 Documentación con JSDoc

Obligatoria en servicios y funciones públicas, con `@param` y `@returns`:

```typescript
/**
 * Obtiene los productos activos de la empresa.
 *
 * @param empresaId identificador de la empresa
 * @returns flujo con la lista de productos
 */
obtenerProductos(empresaId: number): Observable<Producto[]> {
  return this.http.get<Producto[]>(`${this.apiUrl}/empresas/${empresaId}/productos`);
}
```

## 7. Guía de estilo de interfaz

La interfaz adopta el sistema visual de Brightcode Labs.

### 7.1 Paleta de colores

| Color | Hexadecimal | Uso | Proporción |
|---|---|---|---|
| Code Black | `#0B0B0C` | Texto principal, encabezados de tabla y botón primario | ~55 % |
| Paper | `#F4F4F2` | Fondo general | ~25 % |
| Deep Circuit | `#0F4C55` | Bloques y fondos secundarios, estado hover | Hasta 15 % |
| Filament | `#FFB703` | Acento: foco, una cifra o un botón destacado | Menos de 5 % |
| Concrete | `#C9C9C6` | Bordes, separadores y estados deshabilitados | — |

```scss
:root {
  --vc-code-black: #0B0B0C;
  --vc-paper: #F4F4F2;
  --vc-deep-circuit: #0F4C55;
  --vc-filament: #FFB703;
  --vc-concrete: #C9C9C6;
}
```

**Accesibilidad:** contraste mínimo de texto de 4.5:1 (WCAG). **Filament nunca se usa como color de texto sobre fondos claros**; se usa como relleno con texto Code Black o como borde.

### 7.2 Tipografía

| Elemento | Fuente | Tamaño |
|---|---|---|
| Título principal (H1) | Archivo Narrow, negrita | 32 px |
| Título de sección (H2) | Archivo Narrow, negrita | 24 px |
| Subtítulo (H3) | IBM Plex Sans, seminegrita | 20 px |
| Texto de párrafo | IBM Plex Sans, regular | 16 px, interlineado 1.6 |
| Etiquetas y metadatos | IBM Plex Mono, regular | 12 px |

### 7.3 Componentes

| Componente | Prefijo | Aspecto y estados |
|---|---|---|
| Botón primario | `btn` | Fondo Code Black, texto Paper, esquinas de 4 px. Hover: Deep Circuit. Deshabilitado: Concrete. |
| Botón secundario | `btn` | Fondo transparente, borde Code Black de 1 px y texto Code Black. |
| Campo de texto | `txt` | Fondo blanco, borde Concrete de 1 px, etiqueta superior. Foco: borde Deep Circuit y contorno Filament de 2 px. Error: borde y mensaje en rojo accesible. |
| Lista desplegable | `ddl` | Igual al campo de texto con flecha; opción seleccionada con fondo Deep Circuit y texto Paper. |
| Tabla | `tbl` | Encabezado Code Black con texto Paper; filas alternas Paper y blanco; encabezado fijo. |
| Lista de selección | `lst` | Elementos con borde Concrete; activo con fondo Deep Circuit y texto Paper. |
| Botón de opción | `rdo` | Círculo con borde Code Black; seleccionado con relleno Deep Circuit; etiqueta a la derecha. |
| Casilla de verificación | `chk` | Cuadro con borde Code Black; marcada con relleno Deep Circuit y visto Paper. |
| Etiqueta | `lbl` | IBM Plex Sans 16 px, Code Black; asociada a su control. |
| Mensaje de estado | `msg` | Bloque con icono y texto; éxito, advertencia y error se distinguen por icono y texto, no solo por color. |
| Diálogo modal | `dlg` | Fondo Paper, borde superior Filament de 4 px, fondo atenuado y cierre con Escape. |
| Tarjeta de métrica | `crd` | Fondo Paper con borde Concrete; cifra principal en Archivo Narrow; una sola cifra destacada con subrayado Filament. |
| Sala de videollamada | `vid` | Fondo Code Black, controles con iconos y texto; estado visible de micrófono y cámara. |

### 7.4 Accesibilidad obligatoria

- Todos los controles son operables con teclado.
- El foco se muestra con un contorno visible.
- Área táctil mínima de **44 × 44 px**.
- Cada campo tiene su etiqueta asociada (`<label for>`).

## 8. Pruebas unitarias

- Herramientas: Jasmine y Karma.
- Cobertura mínima: **60 % en componentes y servicios**.
- Se escriben junto con el código, dentro de la misma historia de usuario.
- Nombre de las pruebas: `metodo_condicion_resultadoEsperado`.

```typescript
it('obtenerProductos_empresaSinProductos_retornaListaVacia', () => {
  // ...
});
```

Ejecución:

```bash
npm install
npm run lint
npm test -- --code-coverage
```

## 9. Seguridad y configuración

- Ninguna credencial se escribe en el código ni en `environments/`; las claves sensibles residen en el backend.
- Los archivos `.env` están excluidos en `.gitignore`.
- Si se expone una clave por error, se revoca y se regenera de inmediato (riesgo R-C04).

## 10. Versionado

- Versionado semántico `MAYOR.MENOR.PARCHE`, siempre sobre `main`.
- Primera entrega: `v0.1.0`. Entrega final: `v1.0.0`.
- Al cierre de cada sprint se crea una etiqueta.

---

© 2026 Brightcode Labs · Universidad Cenfotec
