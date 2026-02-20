# CORE COMERCIAL REVALIDATION v1.6 (MULTI-ORG SAFE)

## Objetivo
La versión 1.6 tiene como objetivo barrer todo el Core Comercial del sistema (Proyectos, Cotizaciones, Facturas, Inventario) para asegurar que *cada* acceso a datos (lectura o escritura) respete estrictamente el aislamiento por organización (Multi-Org) utilizando el resolver canónico `requireOperationalScope()` introducido en la v1.5.

## Alcance Comercial Cubierto (Auditoría de Superficies)
Se deben revisar y blindar las siguientes áreas:

**Matriz de Endpoints y Scope Canónico (Cubierto vs Pendiente):**

| Recurso / Módulo | Archivo/Endpoint | Estado Scope Canónico | Riesgo Detectado |
| :--- | :--- | :--- | :--- |
| **Notas de Venta** | `api/sales/generate-note/route.ts` | ✅ **Cubierto** (v1.5) | N/A |
| **Inventario (Export)** | `api/inventory/export/route.ts` | ✅ **Cubierto** (v1.5) | N/A |
| **CRM (Lectura)** | `src/actions/crm.ts` | ❌ **Pendiente** | Consultas globales sin `organizationId` (`getPipelineProjects`, `getClientDetails`) |
| **CRM (Escritura)** | `src/actions/crm.ts` | ❌ **Pendiente** | `getOrganizationId` no valida contexto, asume cookie válida ciegamente |
| **Proyectos** | `src/app/actions/projects.ts` | ❌ **Pendiente** | Reemplazar `getOrganizationId()` por canónico |
| **Cotizaciones** | `src/app/actions/quotes.ts` | ❌ **Pendiente** | Reemplazar `getOrganizationId()` por canónico |
| **Facturas** | `src/app/actions/invoices.ts` | ❌ **Pendiente** | Reemplazar `getOrganizationId()` por canónico |
| **ítems (Cotización)** | `src/actions/quote-items.ts` | ❌ **Pendiente** | Reemplazar `getOrganizationId()` por canónico |
| **Inventario/Productos** | `src/actions/products.ts` | ❌ **Pendiente** | Uso de contexto débil |
| **Clientes** | `src/actions/clients.ts` | ❌ **Pendiente** | Uso de contexto débil |

## Reglas de Aislamiento por Organización
1. **Scope Requerido**: Toda API o Server Action comercial *debe* invocar `requireOperationalScope()`.
2. **Filtro Explícito Obligatorio**: Todas las consultas a la base de datos (Prisma `findMany`, `count`, `update`, `create`, `delete`) deben incluir explícitamente `organizationId: scope.orgId` en su cláusula `where` o equivalente.
3. **Jerarquía Validada**: Si se opera sobre un recurso anidado (ej. QuoteItem), se debe validar que el recurso padre (Quote -> Project) pertenece al `scope.orgId`.
4. **Cero Confianza al Cliente**: Nunca se debe confiar en un `organizationId` o un identificador de recurso enviado por el cliente sin cruzarlo con el `scope.orgId` del backend.

## Errores Controlados de Scope
- **`ScopeError`**: Excepción canónica lanzada por `requireOperationalScope()` si el contexto es inválido (`UNAUTHORIZED`, `NO_ORG_CONTEXT`, `INVALID_ORG_CONTEXT`).
- **Respuesta API**: Las API Routes deben capturar `ScopeError` y responder con un HTTP Status 403 (Forbidden) o 401 (Unauthorized) estructurado, nunca con un 500 o un crash.
- **Server Actions**: Las Server Actions deben retornar un objeto `{ success: false, error: '...' }` capturado de forma limpia.

## Observabilidad
- Mejorar los logs en los catch de errores de scope.
- Extender `workspace-doctor` con `commercialScopeReady = true/false`.

## Checklist QA Manual del Loop Comercial
1. [ ] Superadmin cambia a Org A.
2. [ ] Crea un Proyecto en Org A.
3. [ ] Emite Nota de Venta para ese Proyecto en Org A.
4. [ ] Cambia de contexto a Org B.
5. [ ] Verifica que el Proyecto de Org A *no* es visible ni operable.
6. [ ] Manipula la URL/cookie para intentar leer el Proyecto de Org A estando en el scope de Org B -> El sistema rechaza con Error Controlado.

## Estado Final Esperado
Un Core Comercial congelado en cuanto a su arquitectura de seguridad, donde sea matemáticamente imposible fugar datos entre organizaciones, pavimentando el camino seguro para Billing y Team Mode.
