# SGE - Frontend

SPA multi-colegio para el Sistema de Gestión Escolar. Está construida con React, TypeScript estricto y Vite; se sirve como contenido estático y consume la API Laravel.

## Requisitos

- Node.js 20.19+ o 22.12+ (LTS recomendado).
- npm.
- API backend disponible en `http://localhost:8000`.

## Instalación y configuración

```powershell
npm install
Copy-Item .env.example .env.local
```

`.env.local` contiene únicamente variables públicas del frontend:

```env
VITE_API_URL=http://localhost:8000
VITE_SUBDOMINIO_DEV=salesianinnova
```

`VITE_API_URL` es el origen del backend; el cliente agrega `/api` según el contrato. En desarrollo, la identidad se consulta usando `VITE_SUBDOMINIO_DEV`. En producción se usa la primera etiqueta del hostname.

Para desarrollo local:

1. Inicia el backend Laravel en `http://localhost:8000`.
2. Configura Sanctum/CORS en el backend para aceptar el origen Vite (`http://localhost:5173`), cookies con credenciales y el dominio frontend como dominio stateful.
3. En otra terminal, ejecuta `npm run dev`.

La sesión usa cookies de Sanctum y solicita `/sanctum/csrf-cookie` antes de las operaciones mutables. No se almacenan tokens o datos de sesión en `localStorage` ni `sessionStorage`.

## Comandos

```powershell
npm run dev
npm run api:types
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run api:types` genera `src/api/schema.d.ts` desde `docs/api.json`. El archivo de contrato disponible en este repositorio se llama `api.json` (no `openapi.json`).

## Estructura

- `src/app`: proveedores, enrutamiento, layout y páginas globales.
- `src/features`: API, componentes, hooks, páginas y esquemas por funcionalidad.
- `src/shared`: cliente HTTP, UI, utilidades y textos comunes.
- `src/api`: tipos generados desde el contrato OpenAPI.

La pantalla de inicio de sesión envía email y contraseña sin el subdominio: la especificación indica que el subdominio identifica la institución visualmente y que el backend valida la pertenencia del usuario. El contrato `docs/api.json` aún no declara el `requestBody` del login; el cliente adapta ese endpoint con los campos que usa el formulario hasta que se complete el contrato. Las demás operaciones utilizan los tipos generados.

El esquema actual de `GET /v1/auth/me` no incluye permisos efectivos del usuario. `Can`, `usePermisos` y la guardia de ruta admiten `permisos`/`permissions` cuando el backend los exponga; mientras no estén en el contrato y la respuesta, el frontend no supone permisos que no puede verificar.

## Integración frontend/backend

Levanta el backend Laravel en `http://localhost:8000` y el frontend con `npm run dev`. Para despliegue, `npm run build` genera `dist/`; configura el servidor estático con fallback de rutas SPA y publica el backend bajo el origen indicado por `VITE_API_URL`.
