# Public Portal v1 (Wave 5.5)

Este documento define el contrato, estados y UX para el portal público de Cotizaciones e Invoices.

## A. Seguridad y Share Links

Todos los documentos públicos son accesibles únicamente a través de **Share Links**.

### Modelo de Seguridad
1.  **Token**:
    *   Generado criptográficamente (32 bytes -> 64 hex chars).
    *   **Nunca** se almacena en BD. Solo se almacena su hash (SHA-256).
2.  **Validación**:
    *   Al recibir request: `hash(token_url)` -> buscar en DB.
    *   Check `revokedAt`.
    *   Check `expiresAt`.
3.  **Rate Limiting**:
    *   Protección contra fuerza bruta y enumeración.
    *   Límite por IP para endpoints públicos.

### Estados del Link
*   **VALID**: Token correcto, no expirado, no revocado. Muestra documento.
*   **INVALID**: Token no existe. UI: "Enlace Inválido".
*   **EXPIRED**: Fecha actual > `expiresAt`. UI: "Enlace Expirado" + CTA Contacto.
*   **REVOKED**: `revokedAt` no es nulo. UI: "Acceso Revocado".

---

## B. Public Quote (`/p/q/[token]`)

### Estados de Cotización
| Estado | Descripción | Acciones Disponibles |
| :--- | :--- | :--- |
| **DRAFT/SENT** | Cotización abierta. | Botón "Aceptar Cotización". |
| **ACCEPTED** | Ya aceptada. | Muestra "Aceptada el [fecha]". Sin acciones. |
| **EXPIRED** | Expirada por fecha. | Muestra "Expirada". CTA Contacto. |
| **CANCELED** | Cancelada por admin. | Muestra "Cancelada". |

### Flujo de Aceptación
1.  Usuario hace clic en "Aceptar".
2.  **Idempotencia**: Si ya está aceptada, mostrar mensaje de éxito (no error).
3.  **Auditoría**: Registrar evento `QUOTE_ACCEPTED_PUBLIC` con IP y User Agent.
4.  **Feedback**: Redirect a la misma página con estado actualizado (ACCEPTED).

---

## C. Public Invoice (`/p/i/[token]`)

### Estados de Invoice
| Estado | Descripción | Acciones Disponibles |
| :--- | :--- | :--- |
| **PENDING** | Pendiente de pago. | Botón "Pagar Ahora" (Stripe). |
| **PAID** | Pagada totalmente. | Muestra "Pagada". Descargar Comprobante. |

### Flujo de Pago (Stripe)
1.  **Initiate**: Clic en "Pagar Ahora".
    *   Valida estado (no pagada).
    *   Crea/Recupera Checkout Session de Stripe.
    *   Metadata incluye `organizationId`, `invoiceId`, `shareLinkId`.
2.  **Checkout**: Usuario paga en página de Stripe.
3.  **Webhook** (`checkout.session.completed`):
    *   Verifica firma.
    *   Verifica idempotencia (eventId).
    *   Actualiza Invoice a `PAID` (si `payment_status` es `paid`).
    *   Registra auditoría `INVOICE_PAID_STRIPE`.

---

## D. Hardening Checklist

### Webhooks
*   [ ] Verificar firma `stripe-signature`.
*   [ ] Usar `rawBody` para construcción de evento.
*   [ ] Procesar solo si `eventId` no existe en `StripeEvent`.
*   [ ] Manejo de errores 500 para reintentos de Stripe (solo en fallos transitorios).

### UX
*   [ ] Páginas `noindex, nofollow`.
*   [ ] Errores amigables pero seguros (no leakear info).
