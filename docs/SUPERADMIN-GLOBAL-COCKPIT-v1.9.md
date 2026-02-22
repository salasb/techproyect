# SUPERADMIN GLOBAL COCKPIT v1.9 (Read-First + Operación Segura)

## 1. Propósito
El Cockpit Global de Superadmin permite monitorizar la salud operativa y comercial de todo el ecosistema TechWise desde un punto centralizado. Facilita la detección temprana de riesgos y la asistencia técnica mediante la navegación segura al contexto local de las organizaciones.

## 2. Acceso y Seguridad
- **Permisos**: Reservado exclusivamente para usuarios con `Profile.role = SUPERADMIN`.
- **Aislamiento**: Se mantiene el uso de `requireOperationalScope()` para operaciones locales. El cockpit utiliza una capa de lectura global que bypass-ea el scope local pero solo para fines de agregación y visualización centralizada.
- **Acciones**: En v1.9 las acciones son principalmente de lectura y navegación (Switch Context).

## 3. Diferencia entre Vistas
| Característica | Vista Global | Contexto Local (Impersonation) |
| :--- | :--- | :--- |
| **URL Root** | `/admin` | `/dashboard`, `/projects`, etc. |
| **Poder** | Ver todas las organizaciones | Ver datos de UNA organización |
| **Cookie** | `app-org-id` puede estar vacía o ser ignorada | `app-org-id` es obligatoria |
| **UI** | Panel Global TechWise | App estándar + Banner de Operating Context |

## 4. Módulos del Cockpit
### 4.1 KPIs Globales
- **Org Health**: Ratio de organizaciones Saludables vs Riesgo.
- **Billing Pulse**: Suscripciones activas, trials por vencer, pagos fallidos.
- **Actividad**: WAU/MAU global.

### 4.2 Tabla Centralizada de Organizaciones
- **Estado**: Activa, Trial, Pendiente, Inactiva.
- **Salud**: OK, Riesgo, Crítico (basado en reglas de negocio).
- **Billing**: Estado de suscripción Stripe.
- **Acciones**: Ver Detalle, Entrar a Contexto (Switch).

### 4.3 Inteligencia de Riesgo (v1.9)
Clasificación automática basada en:
- `Subscription.status` (past_due, unpaid).
- `OrganizationStats.lastActivityAt` (Inactividad > 7 días).
- Configuración de Billing (ausencia de `stripeCustomerId`).

## 5. Acciones Permitidas
- **Switch Context**: Cambiar la cookie `app-org-id` y navegar al dashboard local de la organización seleccionada.
- **Refresh State**: Forzar una re-sincronización de estadísticas (opcional).
- **Audit View**: Ver logs de auditoría global filtrados por organización.

## 6. Auditoría v1.9
Se registrarán los siguientes eventos con `source = superadmin_cockpit`:
- `SUPERADMIN_COCKPIT_VIEWED`
- `SUPERADMIN_ORG_DETAIL_VIEWED`
- `WORKSPACE_CONTEXT_SWITCHED` (Existente, pero validado para Cockpit)

## 7. Evolución (Roadmap v2.0)
- Acciones masivas (broadcast de mensajes).
- Edición global de parámetros de organización.
- Integración profunda con Sentinel para resolución automática de alertas.
