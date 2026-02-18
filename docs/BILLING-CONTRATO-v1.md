# Contrato de Estados de Billing (Wave 3.1)

Este documento define la fuente de verdad y las transiciones de estado para la monetización de TechProyect.

## 1. Fuente de Verdad
**Stripe** es la única fuente de verdad para el estado de la suscripción. La sincronización se realiza exclusivamente a través de **Webhooks**.

## 2. Mapa de Estados

| Estado Stripe | Estado TechProyect | Permisos | Descripción |
| :--- | :--- | :--- | :--- |
| `trialing` | `TRIALING` | **Total** | Periodo de prueba gratuito (14 días). |
| `active` | `ACTIVE` | **Total** | Suscripción pagada y al día. |
| `past_due` | `PAST_DUE` | **Lectura** | Intento de cobro fallido. Bloqueo de escritura. |
| `unpaid` | `PAUSED` | **Lectura** | Cobro fallido persistente. Solo visualización. |
| `paused` | `PAUSED` | **Lectura** | Suscripción pausada manualmente. |
| `canceled` | `CANCELED` | **Lectura** | Suscripción terminada. |

## 3. Comportamiento Read-Only (PAUSED/CANCELED)

Cuando una organización no está en `ACTIVE` o `TRIALING`:
- **Permitido**: Navegar por dashboards, ver detalles, exportar reportes/PDFs.
- **Prohibido**: 
  - Crear nuevas oportunidades, clientes o proyectos.
  - Editar cualquier registro existente.
  - Eliminar datos.
  - Registrar nuevos movimientos de stock o facturas.

## 4. Transiciones Críticas
- **Checkout Success**: `TRIALING` -> `ACTIVE`.
- **Trial Expired (No card)**: `TRIALING` -> `PAUSED` (Gestionado por lógica interna si no hay suscripción activa en Stripe).
- **Payment Failed**: `ACTIVE` -> `PAST_DUE` -> `PAUSED`.
- **Cancellation**: `ACTIVE` -> `CANCELED`.

## 5. Idempotencia & Seguridad
- Los webhooks verifican la firma (`STRIPE_WEBHOOK_SECRET`).
- Se utiliza el `organizationId` en la `metadata` de Stripe para vincular eventos.
