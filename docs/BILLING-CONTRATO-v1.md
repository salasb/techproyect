# Contrato de Facturación y Estados (v1)

Este documento define la lógica de estados de suscripción, transiciones y permisos dentro de la plataforma, usando Stripe como fuente de verdad.

## 1. Estados de Suscripción

| Estado (Prisma/Stripe) | Descripción | Modo de Acceso | Comportamiento UI |
| :--- | :--- | :--- | :--- |
| `TRIALING` | Período de gracia inicial (14 días). | **Full Access** | Badge "TRIAL" |
| `ACTIVE` | Suscripción pagada y al día. | **Full Access** | Badge "PRO" |
| `PAST_DUE` | Fallo de pago. Stripe intentará cobrar. | **Read-Only** | Banner de Alerta |
| `PAUSED` | Suscripción pausada manualmente o por impago crítico. | **Read-Only** | Badge "PAUSED" |
| `CANCELED` | Suscripción terminada. | **Read-Only** | Bloqueo de Acciones |

## 2. Lógica de Sincronización (Webhooks)

La sincronización es unidireccional: **Stripe → Base de Datos Local**.

- **Checkout Completed**: Activa la suscripción y vincula el `providerCustomerId`.
- **Subscription Updated**: Sincroniza cambios de plan, estado (`PAUSED`, `ACTIVE`) y fechas de periodo.
- **Subscription Deleted**: Marca la organización como `CANCELED` inmediatamente.

## 3. Seguridad e Idempotencia

- **Idempotencia**: Todos los eventos de Stripe se registran en la tabla `StripeEvent`. Si un evento ya fue procesado, se ignora para evitar duplicidad.
- **Verificación de Firma**: Solo se aceptan peticiones firmadas legítimamente por Stripe.
- **Lazy Loading**: El cliente de Stripe se inicializa solo en runtime para evitar fallos de compilación si faltan variables de entorno.

## 4. Enforcement de Solo Lectura

El guard `ensureNotPaused(orgId)` debe ejecutarse al inicio de **toda** Server Action que realice operaciones de escritura:
- Crear registros (Clientes, Proyectos, Oportunidades).
- Actualizar datos.
- Eliminar o archivar.

Si la suscripción no es `ACTIVE` o `TRIALING` (válido), la acción lanzará un error capturable por la UI.
