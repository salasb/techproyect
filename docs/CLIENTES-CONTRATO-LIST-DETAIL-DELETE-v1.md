# CONTRATO DE DOMINIO: MÓDULO CLIENTES (v1.0)
Fecha: 16 de Marzo, 2026
Autor: Staff Engineer / Arquitecto de TechProyect

## 1. ESTADO ACTUAL Y AUDITORÍA

### A. LIST (Listado)
- **Componente:** `ClientsClientView.tsx` (Client Component) renderizado por `ClientsPage` (Server Component).
- **Fuente de Datos:** `getClients()` Server Action -> `ClientService.list(orgId)` (Prisma).
- **ID utilizado:** `client.id` (UUID).
- **Problema detectado:** Muestra registros incluso cuando la UI indica "Ninguna" debido a que `resolveAccessContext` recupera el último `activeOrgId` de la base de datos para Superadmins, mientras que el Header client-side puede estar desincronizado.

### B. DETAIL (Detalle)
- **Ruta:** `/clients/[id]`
- **Fuente de Datos:** `getClientDetails(id)` de `@/actions/crm`.
- **Capa de Datos:** Supabase Client (PostgREST).
- **Manejo de Contexto:** Usa `requireOperationalScope()`.
- **Causa del fallo:** Si el ID del cliente no pertenece al `orgId` resuelto por el scope activo, la consulta `.eq('organizationId', scope.orgId)` devuelve vacío, disparando un error de "no encontrado" que la UI enmascara como "ID inválido".

### C. DELETE (Eliminación)
- **Acción:** `deleteClientAction(id)` de `@/actions/clients`.
- **Capa de Datos:** Prisma.
- **Validación:** `ensureWriteAccess()` + `where: { id, organizationId: orgId }`.
- **Causa del fallo:** Misma que el detalle; desajuste entre el `orgId` de la entidad y el `orgId` del contexto actual.

### D. SEARCH (Búsqueda)
- **Acción:** `globalSearchAction(query)` (Prisma).
- **Scope:** Filtrado por `organizationId` activo.

## 2. CAUSA RAÍZ EXACTA

**Inconsistencia de Scoping y Desincronización de Contexto.**

1.  **Desalineación de Capas:** El listado y eliminación usan **Prisma**, el detalle usa **Supabase API**.
2.  **Filtro de Contexto Silencioso:** El listado funciona con el contexto recuperado de DB (ActiveContext), pero el detalle/delete fallan si ese contexto no coincide exactamente con el `organizationId` del registro, o si el Superadmin cree estar en modo "Global" pero las funciones operacionales le fuerzan a un "Tenant Scope".
3.  **Error de Enmascaramiento:** El mensaje "ID inválido" en el detalle oculta un fallo de **Scoping/Permissions** (Registro fuera de contexto).
4.  **Duplicidad Cliente/Prospecto:** No existe una separación clara de entidades; se usa el mismo modelo `Client` con un enum `status` que se gestiona de forma inconsistente en las acciones.

## 3. CONTRATO CORREGIDO

### A. Fuente de Verdad Única
- Todo el módulo usará **ClientService** (Prisma) como única fuente. Se eliminan las llamadas directas a Supabase API en el dominio de Clientes.

### B. Semántica del ID y Scoping
- El ID es un UUID canónico.
- **REGLA DE ORO:** Si un usuario tiene acceso `GLOBAL` (Superadmin), el sistema debe permitir `detail` y `delete` ignorando el filtro de `organizationId` local SI Y SOLO SI no hay un contexto activo seleccionado. Si hay un contexto seleccionado, se respeta el filtro para evitar errores operacionales.

### C. Manejo de Contexto "Ninguna"
- Si `activeOrgId` es nulo:
    - **Superadmin:** Puede listar/detallar todos los clientes (Modo Global).
    - **Usuario normal:** Bloqueo total del módulo con mensaje claro.

### D. Cliente vs Prospecto
- Se unificará la lógica para que no haya duplicados. Un cliente es un prospecto que ha avanzado en el pipeline.
