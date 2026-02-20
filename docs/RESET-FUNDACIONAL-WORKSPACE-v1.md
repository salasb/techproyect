# Contrato Fundacional - Workspace v1

Este documento define la **Fuente de Verdad** y la **Máquina de Estados Estricta** para la resolución de sesiones y organizaciones dentro de TechProyect.

## Reglas Inquebrantables
1. **NO se toca la base de datos manualmente con SQL directo** para arreglar sesiones.
2. **NO se inventan datos falsos en producción** para evitar crasheos.
3. **NO se mezclan estados ambiguos** (e.g. "sin org" vs "org no seleccionada").
4. **CERO Spinners Infinitos**. Ante un error o timeout, el sistema debe caer en un estado definido (`WORKSPACE_ERROR`).
5. **Cada estado dicta una UI específica**.

## Definición de Estados del Usuario

El Resolver de Workspace transiciona al usuario obligatoriamente a uno de estos estados:

| Estado | Condición / Fuente de Verdad | UI Resultante en Dashboard |
| :--- | :--- | :--- |
| **`NOT_AUTHENTICATED`** | `supabase.auth.getUser()` retorna null o error. | Redirección inmediata a `/login`. |
| **`PROFILE_MISSING`** | Auth retorna User válido, pero en Prisma no existe `Profile`. | **Alerta Roja**. Detiene carga de métricas. "Tu cuenta existe, pero el perfil interno no está listo". (Botón a Debug Forense). |
| **`NO_ORG`** | `Profile` existe. `activeMemberships.length === 0`. | Muestra bloque **WorkspaceSetupBanner** (Onboarding puro). |
| **`ORG_PENDING_APPROVAL`** | Usuario seleccionó una Org, pero su `status` es `PENDING` (debido a `MANUAL_APPROVAL_REQUIRED`). | Bloque bloqueante "Aprobación Pendiente". (O redirección a `/pending-activation`). |
| **`ORG_MULTI_NO_SELECTION`** | `activeMemberships.length > 0`. La cookie `app-org-id` NO existe (e.g. Domain Hop). El sistema no puede autonavegar. | **Bloque Ámbar** en Dashboard. "Tienes acceso a X organizaciones. Por favor selecciona una." (CTA a `/org/select`). **NO** muestra onboarding. |
| **`ORG_ACTIVE_SELECTED`** | `app-org-id` es válido. La membresía a esa Org es `ACTIVE`. La Org es `ACTIVE`. | Render normal del Dashboard con métricas y widgets. |
| **`WORKSPACE_ERROR`** | Base de datos lenta (>6s timeout), error sintáctico, o DB inalcanzable. | Bloque Naranja elegante. "Demora o error al cargar contexto". Botón para reintentar. **CERO SPINNERS INFINITOS**. |

## Manejo del Domain Hop (Vercel Previews)
- Si un usuario navega a un entorno preview (`*.vercel.app`) y Vercel no arrastra la cookie principal por políticas `SameSite=Lax`, el resolver **NUNCA** asume que el usuario es nuevo.
- Verificará su Array de Membresías:
  - Si tiene `length === 1`: Recrea silenciosamente la cookie y fuerza `ORG_ACTIVE_SELECTED`.
  - Si tiene `length > 1`: Transiciona a `ORG_MULTI_NO_SELECTION`.

## Acciones de Superadmin
Un `SUPERADMIN` (definido en su `Profile.role`) no depende de estar en `ORG_ACTIVE_SELECTED` para entrar a `/admin`. En el panel de control puede:
- Modificar una Org de `PENDING` a `ACTIVE`.
- Otorgar extensiones de Trial (cambia fechda de expiración).
- Otorgar COMP (Acceso vitalicio gratuito por defecto a 1 año, status ACTIVE).
- Pausar una Org entera (Status INACTIVE -> Bloquea el acceso a sus miembros).
Toda acción deja registro rastro en `AuditLog`.
