# Workspace Onboarding (v1)

## Descripción General
Este documento detalla el comportamiento del flujo de Onboarding de organizaciones introducido en la versión v1, que elimina el estado de "usuario nuevo" falso y mejora la experiencia general del usuario que no tiene una organización asignada.

## Estados del Workspace
El sistema cuenta con tres posibles estados controlados por `app/dashboard/page.tsx` y su interfaz con `workspace-resolver.ts`:

1. **Active (Con datos)**
   El usuario posee al menos un `OrganizationMember`. Se renderizan los KPIs normalmente filtrados por la organización activa y conectada a Stripe.

2. **Onboarding / Pendiente (Sin Org)**
   El usuario no tiene una membresía asociada ni hay restos en la base de datos de actividades pasadas. Carga un banner principal con 3 CTAs principales:
   - Crear Organización (Ruta: `/start`)
   - Seleccionar Existente (Ruta: `/org/select`)
   - **Modo Exploración**: Acceso de solo lectura a la interfaz del dashboard, permitiendo visualizar datos demo ficticios cargados (usando el parámetro `?explore=true`).

3. **Modo Exploración (Exploratory)**
   Los usuarios en este estado tendrán un banner azul persistente advirtiendo que los datos mostrados ("Pipeline", "Earned Margin", "Top Clients") son solo demostrativos y de solo lectura.

## Workspace Resolver y Auto-Repair
La función de resolución central existe en `src/lib/auth/workspace-resolver.ts` (exclusivo para Node Runtime, libre de Prisma en el middleware Edge).

Si un usuario se autentica pero la consulta inicial de Memberships devuelve 0:
1. **Attempt A**: Intenta recuperar vía un `organizationId` huérfano dentro de la tabla `Profile`.
2. **Attempt B**: Si falla el primero, revisa la tabla `AuditLog`. Si este usuario creó eventos asociados a un `organizationId`, asume que era un integrante válido y le otorga el rol de `OWNER`.
3. **Attempt C**: Si el entorno tiene `AUTO_PROVISION=1`, creará una organización temporal "Mi Organización".

En los casos 1, 2 y 3, el resolvedor restaurará la cookie `app-org-id` silenciosamente y el usuario accederá sin más fricciones al dashboard estándar.

## Superadmin & Diagnóstico

### Bootstrap Superadmin
Por razones estructurales de la plataforma (acceso remoto o creadores), existe la ruta API `/api/_admin/bootstrap-superadmin`:
- **Método**: POST
- **Headers Requeridos**: `X-Admin-Token` debe coincidir con la env var `SUPERADMIN_BOOTSTRAP_TOKEN`.
- **WhiteList**: El correo del usuario (`user.email`) debe existir explícitamente en la variable separada por comas `SUPERADMIN_ALLOWLIST`.
- **Efecto**: Actualizará el `Profile.role` a `SUPERADMIN` en la base de datos de Prisma y guardará un evento explícito en `AuditLog`. 

### Debug API
La ruta `/api/_debug/workspace` es un punto de diagnóstico seguro (Safe DEV endpoint).
Solo emitirá resultados valiosos de las tablas y cookies de la sesión del usuario si y solo si la variable de entorno `DEBUG_WORKSPACE` es `"1"` y el rol global es de hecho `SUPERADMIN`.
