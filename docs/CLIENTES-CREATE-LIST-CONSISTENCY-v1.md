# AUDITORÍA DE CONSISTENCIA: MÓDULO CLIENTES (v1.0)
Fecha: 16 de Marzo, 2026
Estado: REVISADO - ERROR DETECTADO

## 1. FLUJO ACTUAL (CONTRATO DEFECTUOSO)

### Componente de Creación
- **Trigger:** `NewClientDialog` o similar (se encuentra en `ClientsClientView` o componentes relacionados).
- **Acción:** `createClientAction` o `createQuickClient` en `src/actions/clients.ts`.

### Resolución de Contexto (Create)
- **Identity:** `ensureWriteAccess()` -> `resolveAccessContext()`.
- **Role:** Global (`SUPERADMIN`, `STAFF`, `USER`).
- **Org/Workspace:** `context.activeOrgId`.
- **Efecto:** Si es `SUPERADMIN`, `ensureWriteAccess` permite pasar incluso si `activeOrgId` es inconsistente, pero la acción lanza error si `orgId` es nulo.

### Resolución de Listado (Read)
- **Acción:** `getClients()` en `src/actions/clients.ts`.
- **Capa:** Supabase Data API (PostgREST).
- **Filtro:** **NINGUNO** (Select * from Client).
- **Scope:** Depende exclusivamente de RLS en Supabase.
- **Error:** Los Superadmins que no son miembros de la organización no ven los clientes creados vía Prisma, a pesar de tener éxito en la creación.

### Resolución de Búsqueda (Search)
- **Componente:** `AppHeader.tsx` (handleSearch).
- **Capa:** Supabase Client (Browser side).
- **Filtro:** **NINGUNO** (Select from Client by Name).
- **Scope:** RLS inconsistente.

## 2. CAUSA RAÍZ EXACTA

1. **Inconsistencia de Capas:** La creación usa Prisma (bypasses RLS) y el listado usa Supabase (enforces RLS).
2. **Ausencia de Filtro Explícito:** `getClients` y `handleSearch` confían en RLS pero no pasan el `organizationId` en la query. Si el usuario (Superadmin) no es miembro de la tabla `OrganizationMember`, Supabase bloquea el resultado.
3. **Manejo de Contexto "Ninguna":** En Preview URLs, la pérdida de cookies de sesión o contexto hace que `getWorkspaceState` devuelva `null`, pero si existe un `ActiveContext` en la DB, la Server Action lo recupera, creando en un scope que la UI (Header) no está visualizando.

## 3. CONTRATO CORREGIDO (PROPUESTA)

- **Fuente de Verdad:** `resolveAccessContext()` siempre proveerá el `activeOrgId`.
- **Regla de Bloqueo:** Si `activeOrgId` es nulo, el sistema debe bloquear `create/list/search` con un mensaje de "Selecciona una Organización".
- **Servicio Unificado:** Mover `list` y `search` a `ClientService` usando Prisma.
- **Sincronización:** Todas las queries deben incluir `.findMany({ where: { organizationId: activeOrgId } })`.

## 4. REGLAS DE VISIBILIDAD

- Un usuario **SOLO** ve clientes de su `activeOrgId`.
- Los Superadmins en "Modo Local" operan bajo las mismas reglas de visibilidad que un miembro de esa organización.
- Se prohíbe el listado global silencioso si no hay contexto.

## 6. RESOLUCIÓN FINAL

### Cambios Realizados
1.  **Unificación de Capa de Datos:** Se movieron todas las operaciones de Clientes (Create, List, Search, Update, Delete) a Prisma para evitar inconsistencias con RLS de Supabase, especialmente para Superadmins que operan en organizaciones ajenas.
2.  **Scoping Estricto:** Se implementó el filtrado obligatorio por `organizationId` en todas las consultas de `ClientService`.
3.  **Corrección de Contexto (Superadmin):** Se corrigió `switchWorkspaceContext` para que utilice `setActiveOrg`, asegurando la actualización de la tabla `ActiveContext` en la DB. Esto elimina el estado "Ninguna" en dominios de Preview donde las cookies pueden fallar.
4.  **UX Preventiva:**
    - `ClientsClientView` ahora bloquea el botón "Nuevo Cliente" si no hay un contexto activo.
    - Se muestra un "Empty State" informativo solicitando la selección de organización.
    - Las búsquedas en el Header ahora usan una Server Action unificada (`globalSearchAction`) con scoping de Prisma.
5.  **Trazabilidad:** Se agregaron `traceId` y logs estructurados en todas las acciones del módulo.

### Archivos Modificados
- `src/services/client-service.ts`: Núcleo de lógica unificada.
- `src/actions/clients.ts`: Server Actions actualizadas con contexto robusto.
- `src/actions/search.ts`: Nueva acción para búsqueda global unificada.
- `src/components/layout/AppHeader.tsx`: Integración con búsqueda del lado del servidor.
- `src/components/clients/ClientsClientView.tsx`: Mejoras de UX y validación de contexto.
- `src/actions/workspace.ts`: Fix de persistencia de contexto en DB.
- `src/lib/current-org.ts`: Robustez en la obtención del ID de organización.

### Evidencia de QA
Se ejecutó script técnico con éxito confirmando:
- [OK] Creación exitosa en organización específica.
- [OK] Visibilidad inmediata en listado filtrado.
- [OK] Visibilidad inmediata en búsqueda por nombre.
- [OK] Aislamiento total (no visible en otras organizaciones).
