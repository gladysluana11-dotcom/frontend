# SGE Frontend - Sistema de Gestión Escolar (Cloud Business Solutions)
SPA multi-colegio. Especificación en docs/requerimientos.md (secciones 3, 5 y 8) y contrato de la API en docs/openapi.json. Léelos antes de cada tarea.

## Stack
React + TypeScript estricto (Vite), React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS + shadcn/ui, openapi-typescript + openapi-fetch, Vitest + Testing Library, ESLint + Prettier. El backend es otro repositorio (Laravel, solo API en /api/v1).

## Reglas obligatorias
- TypeScript en modo estricto. Prohibido any sin justificación escrita.
- Estructura por funcionalidades: src/app, src/features/[módulo] (api, componentes, hooks, páginas, esquemas), src/shared (cliente HTTP, ui, utilidades, textos) y src/api (tipos generados). Nada de fetch directo en componentes: todo pasa por el cliente de la API y hooks de TanStack Query.
- Tipos de la API generados desde docs/openapi.json; nunca escribirlos a mano.
- Autenticación: sesión de Sanctum por cookie (credentials include y CSRF). Prohibido guardar tokens o datos sensibles en localStorage o sessionStorage.
- Los errores de la API (message, errors, code) se normalizan en un solo lugar y se muestran por campo en los formularios.
- La autorización real está en el backend. En la interfaz solo se ocultan acciones según los permisos del usuario.
- Nunca calcular saldos, estados de cuota ni vacantes en el frontend; se muestran los valores que entrega la API.
- Operaciones de dinero: botón deshabilitado al enviar y cabecera Idempotency-Key.
- Textos en español centralizados, formatos es-PE (soles y fecha dd/mm/aaaa). Sin dangerouslySetInnerHTML.
- Responsive desde 360 px, accesible con teclado, con etiquetas y contraste adecuados. Estados de carga, vacío y error en toda pantalla.
- Cada funcionalidad incluye pruebas (Vitest y Testing Library). Mantener lint, typecheck y build sin errores.
- Nunca leer ni modificar archivos .env ni subir credenciales.

## Forma de trabajar
Antes de programar, escribe un plan corto y espera mi aprobación. Trabaja en pasos pequeños, ejecuta lint, typecheck y pruebas, y resume los cambios.