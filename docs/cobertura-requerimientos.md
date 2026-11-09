# Cobertura de requerimientos del frontend (RFW) - v1.2

Estado al cierre de F1 y F2 (alumnos). Verificado con lint, tipos, pruebas y build.

| ID | Requerimiento | Estado | Dónde |
|---|---|---|---|
| RFW-01 | SPA React + TypeScript estricto con Vite, sin `any` | Hecho | `tsconfig.app.json` (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes); sin `any` en `src` |
| RFW-02 | Estructura por funcionalidades y una sola capa de acceso a la API | Hecho | `src/features/*`, `src/shared/api/client.ts` (ningún `fetch` fuera del cliente) |
| RFW-03 | Rutas protegidas por rol con carga diferida | Hecho | `src/app/App.tsx`, `ProtectedRoute` |
| RFW-04 | Login, cierre, recuperación, cambio obligatorio, sesión vencida con retorno a la ruta | Hecho | `src/features/auth` |
| RFW-05 | Estado del servidor con TanStack Query | Hecho | `hooks/` de cada módulo |
| RFW-06 | Formularios con React Hook Form + Zod y errores del servidor por campo | Hecho | `form-schemas.ts`, `applyServerErrors` |
| RFW-07 | Tablas con paginación, orden, filtros y búsqueda en el servidor | Hecho | `DataTable`, `useTableState` |
| RFW-08 | Menú y pantallas según el rol | Hecho | `src/app/navigation.ts`, `Can`, `ProtectedRoute roles` |
| RFW-09 | Identidad visual por colegio | Hecho | `features/identity` |
| RFW-10 | Estados de carga, vacío y error; avisos; confirmación en acciones de dinero | Parcial | Carga, vacío, error y avisos hechos. La confirmación de acciones de dinero llega con Pagos |
| RFW-11 | Evitar doble envío en dinero (`Idempotency-Key`) | Pendiente | Llega con Pagos (los botones ya se deshabilitan al enviar) |
| RFW-12 | Descarga de PDF y Excel | Pendiente | Ficha de matrícula, plantilla de importación y reportes |
| RFW-13 | Impresión de constancias y reportes | Pendiente | Llega con Pagos y Reportes |
| RFW-14 | Responsive desde 360 px, teclado, etiquetas y contraste | Hecho | Etiquetas, `aria-*`, foco visible, tabla con desplazamiento horizontal |
| RFW-15 | Textos en español centralizados y formatos es-PE | Hecho | `src/shared/texts.ts`, `src/shared/utils/format.ts` |
| RFW-16 | Panel del Director con gráficos | Pendiente | Requiere los endpoints de reportes (B6) |
| RFW-17 | Tipos generados desde OpenAPI | Hecho | `npm run api:types` |
| RFW-18 | Manejo global de errores | Hecho | `ErrorBoundary`, pantalla de error de ruta |
| RFW-19 | PWA | Fase 3 | - |

## Módulos de pantalla

| Módulo | Backend | Frontend |
|---|---|---|
| Acceso y sesión | B1 | Hecho |
| Alumnos: listado, ficha, alta, edición, estado, foto, apoderados | B4 | Hecho |
| Alumnos: importación desde Excel | B4 | Pendiente (falta la forma de la respuesta de validación) |
| Matrículas | B4 | Pendiente |
| Estructura académica y configuración | B3 | Pendiente |
| Usuarios, roles y auditoría | B2 | Pendiente |
| Tarifas, cuotas y pagos | B5 (sin construir) | Pendiente |
| Deudas y reportes | B6 (sin construir) | Pendiente |
| Avance de unidades y asistencia | Fases 1B y 2 | Pendiente |

## Brechas del contrato de la API

- `GET /alumnos/{id}` no incluye los apoderados; la ficha los mostrará apenas se agreguen (el esquema ya los acepta).
- Los esquemas de respuesta de alumnos, apoderados y catálogos no están descritos en OpenAPI; el frontend los valida con Zod.
- `POST /auth/login` no declara su cuerpo; `GET /auth/me` no entrega la lista de permisos (la interfaz se guía por roles).
