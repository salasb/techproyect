# QA Checklist: Public Portal Hardening (Wave 5.5)

## 1. Share Links Security
- [ ] **Token Inválido**: Acceder a `/p/q/invalid-token` -> Muestra error "Enlace Inválido".
- [ ] **Token Expirado**: Modificar BD `expiresAt` < NOW -> Muestra error "Enlace Expirado".
- [ ] **Token Revocado**: Modificar BD `revokedAt` = NOW -> Muestra error "Acceso Revocado".
- [ ] **Rate Limiting**: Intentar 60 reqs/min -> Bloqueo temporal (si implementado en middleware/WAF).

## 2. Public Quote (`/p/q/[token]`)
- [ ] **Visualización**: Muestra detalles correctos (Cliente, Ítems, Totales).
- [ ] **Aceptación Normal**: Clic en "Aceptar" -> Estado cambia a ACCEPTED -> Muestra fecha aceptación.
- [ ] **Idempotencia**:
    - [ ] Abrir link en 2 pestañas.
    - [ ] Aceptar en P1.
    - [ ] Intentar aceptar en P2 -> No error, muestra estado aceptado (o refresh).
- [ ] **Auditoría**: Verificar en DB `AuditLog` evento `QUOTE_ACCEPTED_PUBLIC`.

## 3. Public Invoice (`/p/i/[token]`)
- [ ] **Visualización**: Muestra monto pendiente correcto.
- [ ] **Pago (Checkout)**: Clic "Pagar Ahora" -> Redirige a Stripe Checkout.
- [ ] **Pago Exitoso**:
    - [ ] Completar pago en Stripe (Test Mode).
    - [ ] Webhook recibido y procesado (200 OK).
    - [ ] Invoice en DB: `amountPaidGross` == `amountInvoicedGross`.
    - [ ] UI Pública: Muestra "Pagada" sin botón de pago.
- [ ] **Pago Fallido**:
    - [ ] Webhook `invoice.payment_failed` (si aplica).
    - [ ] Invoice sigue pendiente.

## 4. Webhooks & Integridad
- [ ] **Firma Inválida**: Enviar webhook con firma fake -> 400 Bad Request.
- [ ] **Replay Attack**: Reenviar mismo `eventId` -> 200 OK (Duplication detected), no duplica lógica.
- [ ] **Idempotencia Pago**: Enviar 2 veces `checkout.session.completed` -> Solo 1 registro de pago/auditoría.

## 5. General
- [ ] **Multi-tenancy**: Token de Org A no puede ver Org B (garantizado por diseño SHA-256 único).
- [ ] **Build**: `npm run build` pasa sin errores.
- [ ] **Lint**: `npm run lint` pasa sin errores.
