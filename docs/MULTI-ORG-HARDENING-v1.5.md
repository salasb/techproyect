# MULTI-ORG HARDENING v1.5

## Objetivo
El objetivo de la v1.5 es blindar la capa Multi-Org del sistema, garantizando un aislamiento total de datos entre organizaciones, proveyendo un resolver canónico para el "contexto operativo" (scope) y previniendo cualquier fuga de datos por manipulación de cookies o errores de estado, todo mientras se mantiene la flexibilidad operativa del Superadmin.

## Autorización Global vs Contexto Operativo
- **Autorización Global (`isSuperadmin`)**: Define hiper-privilegios en el sistema. Dictamina el acceso a rutas `/admin/*`. No otorga acceso directo indiscriminado a consultas comerciales sin un "contexto operativo" definido.
- **Contexto Operativo (`activeOrgId` / Scope)**: Define "sobre qué organización" se están ejecutando las operaciones comerciales (ej. leer cotizaciones, crear clientes). 

## Flujo de Resolución de activeOrg (Scope Resolver)
Se establecerá un único punto de verdad (`getOperationalScope` o extensión de `getWorkspaceState`) que retornará un objeto de Scope seguro para ser utilizado en consultas a la Base de Datos.

**Reglas de Resolución:**
1. **Identificar Usuario**: Extraer sesión de Supabase. Retornar error si no hay sesión.
2. **Leer Contexto Solicitado**: Leer `app-org-id` de las cookies.
3. **Validar Contexto vs Rol**:
   - Si es **SUPERADMIN**: Se confía en el `app-org-id` solicitado si la organización existe. Si no hay `app-org-id` o es inválido, el scope resulta en un estado `REQUIRE_CONTEXT_SELECTION`. Un Superadmin *debe* tener un contexto explícito para operar comercialmente.
   - Si es **USUARIO REGULAR**: Se verifica que exista una membresía `ACTIVE` para el `app-org-id` solicitado. Si es válido, ese es el scope. Si es inválido, manipulado o inexistente, se hace un fallback a la primera organización válida del usuario o se retorna un estado de error `INVALID_SCOPE`.

## Comportamiento ante Errores
- **Cookie Inválida / Manipulada**: 
  - Para usuarios normales: El sistema detecta que no hay membresía. El resolver de scope rechaza la solicitud. La UI no crashea, redirecciona o pide seleccionar contexto válido.
  - Para superadmins: Si la Org no existe, el scope solicita selección de contexto.
- **Sin Organización**: 
  - Si un endpoint comercial requiere scope y el usuario no tiene organizaciones, la API retorna explícitamente `403 Forbidden` (Scope requerido). La UI muestra el Empty State correspondiente.
- **Data Leaks (Prevención)**: Todos los endpoints bajo `/api/sales/*`, `/api/inventory/*`, etc. *deben* usar `where: { organizationId: scope.orgId }`. Nunca depender de inputs inyectados por el cliente si no han pasado por el resolver de scope.

## Checklist de QA y Matriz Anti-Fugas
1. [ ] **Superadmin Org A vs Org B**: Un Superadmin selecciona Org A, ve datos de Org A. Selecciona Org B, ve datos de Org B. Nunca una mezcla.
2. [ ] **User Org A tampering org B**: Un usuario de Org A altera su cookie a la ID de Org B. La API debe denegar acceso o hacer fallback a Org A.
3. [ ] **Cookie corrupta**: Valor basura en `app-org-id`. El sistema no falla (HTTP 500), se maneja controladamente forzando selección o fallback.
4. [ ] **API Endpoint Directo**: Llamar a `/api/sales/generate-note` sin cookie o con cookie inválida retorna error controlado, no inserta datos huérfanos.
5. [ ] **Admin Global Preservado**: Romper el contexto local (ej. borrar cookie) no expulsa al Superadmin del `/admin/orgs`.
