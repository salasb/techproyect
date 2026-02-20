# Superadmin Access Control v1

Este documento enumera los flujos y mecánicas mediante las cuales el creador del sistema (Superadmin) controla y audita quién accede a usar el sistema.

## Ciclos de Suscripción / Acceso
1. **Signup Típico**: El usuario crea o se auto-provisiona una organización. Por defecto, recibe una Trial de 14 días.
2. **Flujo de Aprobación Manual (Opcional)**: Si en el entorno se configura `MANUAL_APPROVAL_REQUIRED=1`, la organización nacerá con status `PENDING`. El Superadmin verá esto en su vista (`/admin/orgs`) y deberá cambiarlo a `ACTIVE`.
3. **Trial y Fin de Trial**: El sistema vigila `trialEndsAt`. Cuando expira, el status debería cruzar a `PAST_DUE` mediante cronjobs / webhooks.
4. **Pausa de Acceso**: Un Superadmin puede suspender el acceso cambiando el status de la Organización a `INACTIVE` mediante el botón rojo en la grilla de `/admin/orgs`.

## Acciones de Modificación de Facturación (COMP / Extend)
Bajo `src/app/actions/admin-actions.ts`, los Superadmins tienen a disposición herramientas definitivas para omitir cobros si así lo requiere el negocio:
- **COMP**: Torna el estado de Suscripción a `ACTIVE`, definiendo `compedUntil` a 1 año en el futuro y fuente a `COMPED`. Otorgamiento manual para obviar la pasarela de pago.
- **Extend Trial**: Suma "X" cantidad de días a la expiración original del trial. Mantiene a la organización en flujo regular de captación de pago pero demora la barrera.

## Auditoría y Trazabilidad
Toda manipulación (`updateOrganizationStatus`, `updateOrganizationPlan`, `compSubscriptionAction`, etc.) requiere de validación estricta de que el llamador posee rol `SUPERADMIN` en su Profile Prisma y es inmune a secuestros de sesión que no verifiquen la DB.
Cualquier evento inyectará datos duros en la tabla `AuditLog`.
