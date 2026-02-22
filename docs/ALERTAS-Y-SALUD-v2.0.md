# Motor de Alertas y Salud Global v2.0

## Propósito
El Motor de Alertas de Superadmin v2.0 tiene como objetivo automatizar la detección de riesgos en el ecosistema TechWise, permitiendo que el Superadmin actúe de forma proactiva ante problemas de facturación, setup o inactividad.

## Consumidores
- **Superadmin**: Único rol con acceso a la gestión global de alertas y notificaciones del Cockpit.

## Severidades
- **INFO**: Información relevante pero no urgente (ej: Trial iniciado).
- **WARNING**: Riesgo potencial que requiere atención en los próximos días (ej: Trial por vencer).
- **CRITICAL**: Problema inmediato que afecta la continuidad del servicio o la integridad (ej: Factura vencida, sin admins).

## Catálogo de Reglas v2.0

| ID de Regla | Título | Descripción | Severidad | Fuente de Verdad |
| :--- | :--- | :--- | :--- | :--- |
| `BILLING_PAST_DUE` | Pago Vencido | La suscripción está en estado past_due o unpaid. | CRITICAL | Subscription.status |
| `TRIAL_ENDING_SOON` | Trial venciendo | El periodo de prueba finaliza en menos de 3 días. | WARNING | Subscription.trialEndsAt |
| `BILLING_NOT_CONFIGURED` | Billing no configurado | La organización no tiene un método de pago o suscripción. | WARNING | Subscription model |
| `NO_ADMINS_ASSIGNED` | Sin Administradores | La organización no tiene miembros con rol OWNER/ADMIN. | CRITICAL | OrganizationMember count |
| `INACTIVE_ORG` | Inactividad Prolongada | No se registra actividad en los últimos 7 días. | INFO / WARNING | OrganizationStats.lastActivityAt |

## Ciclo de Vida de la Alerta
1. **Detección**: El motor evalúa las reglas y genera una alerta con un `fingerprint` único (`orgId:regla`).
2. **Notificación**: Se emite una `SuperadminNotification` in-app.
3. **Acción (Acknowledge)**: El superadmin marca la alerta como "conocida", deteniendo recordatorios pero manteniendo el estado en el cockpit.
4. **Resolución**: Si la condición desaparece (ej: el cliente paga), la alerta se mueve a `RESOLVED` automáticamente o por acción manual verificada.

## Fuera de Alcance v2.0
- Push Notifications a móvil (v2.1).
- Impersonación de usuario (v2.1).
- Acciones masivas (ej: suspender 10 orgs a la vez).
