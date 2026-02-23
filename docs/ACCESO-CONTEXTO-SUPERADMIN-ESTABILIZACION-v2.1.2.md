# ESTABILIZACIÓN ACCESO SUPERADMIN + CONTEXTO v2.1.2

Este documento detalla la política de entrada y gestión de contexto implementada para resolver bloqueos críticos de QA (crash en dashboard, redirección errónea).

## 1. Contrato de Entrada (Entry Policy)

La lógica de decisión post-login y en la ruta raíz (`/`) es ahora determinista y basada en el `workspace-resolver`.

| Rol | Contexto (Org Activa) | Ruta Recomendada | Comportamiento |
| :--- | :--- | :--- | :--- |
| **SUPERADMIN** | **Null / Ninguna** | `/admin` | Entrada al **Cockpit Global**. Evita crash en dashboard local. |
| **SUPERADMIN** | **Válido (OrgID)** | `/dashboard` | Entrada al **Modo Operativo Local**. Muestra banner de contexto. |
| **USER / ADMIN** | **Null / Ninguna** | `/start` | Flujo de onboarding o selección de organización. |
| **USER / ADMIN** | **Válido (OrgID)** | `/dashboard` | Flujo normal de operación. |

## 2. Guards Implementados

### Dashboard Guard (`/dashboard`)
Se implementó un guard estricto server-side antes de cargar datos:
- Si el usuario es Superadmin y NO tiene `activeOrgId`:
  - **Acción**: Redirección inmediata a `/admin`.
  - **Resultado**: Se previene la ejecución de loaders de métricas con `orgId=null` (Causa raíz del digest 1073133380).

### Admin Guard (`/admin`)
- Permite acceso a cualquier usuario con rol `SUPERADMIN`, independientemente de si tiene o no membresías u organizaciones activas.

## 3. Fix Creación de Organización (Error 500)
Se blindó la acción `createOrganizationAction`:
- **Pre-check de Perfil**: Se asegura (upsert) que el registro `Profile` exista antes de iniciar la transacción de creación de organización.
- **Atomicidad**: Creación de Org + Membership + Subscription + Stats en una sola transacción.
- **Manejo de Error**: Captura de excepciones y mensajes claros en lugar de crash genérico.

## 4. Componentes de UX
- **OrgSwitcher**: Actualizado con `data-testid` y labels claros ("Organización Activa" vs "Seleccionar Contexto").
- **AppHeader**: Muestra explícitamente la identidad (Email + Rol) y el modo (Global vs Local).
- **Workspace Doctor**: Expone ahora la propiedad `recommendedRoute` para facilitar debugging.

## 5. Estado Actual
- **Build**: ✅ Passing
- **Tests**: ✅ Unitarios y de integración de acceso. (Test E2E de routing requiere ajuste de mock de auth).
- **Riesgos**: Dependencia de cookies para persistencia de contexto. Si las cookies se borran, el sistema degrada correctamente a la ruta recomendada (safe fallback).
