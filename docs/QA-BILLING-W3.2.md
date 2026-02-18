# Plan de QA: Billing & Multi-Org (Wave 3.2)

## 1. Infraestructura y Estabilidad
- [ ] **Build Check**: Ejecutar `npm run build` y verificar que no hay errores de inicialización de Stripe.
- [ ] **Lazy Loading**: Verificar que el sistema funciona incluso si `STRIPE_SECRET_KEY` cambia en caliente.
- [ ] **Idempotencia**: Simular el envío doble de un webhook (usando Stripe CLI o Postman) y verificar que solo se procesa una vez en `StripeEvent`.

## 2. Onboarding y Multi-Tenancy
- [ ] **Registro de 1 Paso**: Crear una nueva organización desde `/start` y verificar que se crea con trial de 14 días.
- [ ] **Cookie Context**: Intentar cambiar manualmente el valor de `app-org-id` en las cookies del navegador a un ID de otra organización y verificar que el Middleware lo detecta y redirige/limpia.
- [ ] **Org Switcher**: Verificar que los badges coinciden con el estado real de la base de datos.

## 3. Enforcement (Read-Only)
- [ ] **Past Due Flow**: Cambiar manualmente el estado de una suscripción a `PAST_DUE` en la DB.
    - [ ] Intentar crear un cliente. Debe fallar con el mensaje de "ACCIÓN BLOQUEADA".
    - [ ] Verificar que se puede navegar y ver datos (Read-only).
- [ ] **Trial Expiration**: Cambiar `trialEndsAt` a una fecha pasada.
    - [ ] Verificar que el sistema entra en modo pausado automáticamente.

## 4. Stripe Webhooks
- [ ] `checkout.session.completed`: Verificar activación inmediata tras pago.
- [ ] `customer.subscription.updated`: Probar la pausa de suscripción desde el Dashboard de Stripe.
- [ ] `customer.subscription.deleted`: Verificar cancelación total.
