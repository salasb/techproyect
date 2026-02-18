# PLG Conversion & Lifecycle - TechWise (Wave 5.2)

Este documento define la arquitectura de conversión, los eventos canónicos y las reglas de negocio para el embudo Trial→Paid.

## 1. Eventos Canónicos (Funnel)

Para medir el éxito del producto, estandarizamos los siguientes eventos en la tabla `ActivationEvent`:

| Evento | Origen | Descripción |
| --- | --- | --- |
| `TRIAL_STARTED` | Webhook / Signup | Inicio del periodo de prueba. |
| `TRIAL_WILL_END` | Webhook Stripe | Notificación de "3 días restantes" recibida. |
| `TRIAL_EXPIRED` | Webhook Stripe | Fin del periodo de prueba sin conversión. |
| `UPGRADE_CLICKED` | UI | Usuario hace clic en "Upgrade" o "Activar Plan". |
| `CHECKOUT_STARTED` | Stripe Checkout | Usuario entra a la pasarela de pago. |
| `CHECKOUT_COMPLETED` | Webhook Stripe | Conversión exitosa a plan pagado. |
| `SUBSCRIPTION_ACTIVE` | Webhook Stripe | Suscripción renovada o activada. |
| `PAYMENT_FAILED` | Webhook Stripe | Intento de cobro fallido. |
| `PAUSED_ENTERED` | Webhook / Engine | La organización entra en modo lectura (read-only). |
| `PAUSED_EXITED` | UI / Payment | La organización recupera acceso total. |

## 2. Reglas del Paywall (Enforcement)

Cuando una organización tiene status `PAUSED`, `PAST_DUE` o `CANCELED`:
- **Read-Only**: Se interceptan los Server Actions de escritura.
- **Visual**: Se muestra un banner persistente en el Header.
- **Modal**: Al intentar una acción bloqueada, se dispara un modal explicativo con CTA a Billing.

## 3. Lifecycle Reminders

- **D-3 (Stripe logic)**: Gatillado por `customer.subscription.trial_will_end`. Envía email y notificación in-app.
- **D-1 (Lazy check)**: Al entrar al Dashboard, si falta 1 día para expirar y no hay evento de checkout, se muestra un nudge de alta urgencia.

## 4. Framework de Experimentos (A/B)

Decisión de variante basada en `hash(organizationId)` para asegurar estabilidad.

### Experimentos Iniciales
1. **Paywall Copy**:
   - Var A: "Modo lectura activo. Activa tu plan para continuar." (Funcional)
   - Var B: "Tu trial ha terminado. No pierdas el acceso a tus cotizaciones." (Urgencia)
2. **Checklist Order**:
   - Var A: Proyecto -> Cotización -> Enviar (Natural)
   - Var B: Proyecto -> Equipo -> Cotización (Social focus)
