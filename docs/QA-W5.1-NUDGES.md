# QA Checklist - Wave 5.1: Nudges & Lifecycle

## Escenarios de Activación (In-app)
- [ ] **Q01**: Usuario nuevo entra al dashboard -> Ve "Paso 1: Crear Proyecto" pendiente.
- [ ] **Q02**: Usuario crea proyecto -> El checklist marca Paso 1 como DONE instantáneamente (o al recargar).
- [ ] **Q03**: Usuario en modo SOLO -> El checklist NO muestra el paso de "Invitar miembros".
- [ ] **Q04**: Usuario en modo TEAM -> El checklist SÍ muestra el paso de "Invitar miembros".
- [ ] **Q05**: Usuario envía cotización -> El hito `FIRST_QUOTE_SENT` se registra y el checklist se completa.

## Motor de Nudges (Notificaciones)
- [ ] **Q06**: No hay proyecto -> Aparece notificación `N_01` en el AppHeader.
- [ ] **Q07**: Usuario hace "Dismiss" en un nudge -> El registro se guarda en la DB y el nudge no vuelve a aparecer para ese usuario en esa org.
- [ ] **Q08**: Usuario hace "Snooze" -> El nudge desaparece y vuelve a aparecer después de 48h.
- [ ] **Q09**: Org PAUSED -> Los nudges de "Tip" aparecen pero el CTA redirige a la página de Billing/Upgrade.

## Mensajería de Ciclo de Vida (Email)
- [ ] **Q10**: Bienvenida -> Se registra un `EmailEvent` al crear la org.
- [ ] **Q11**: Simulación D+1 sin proyecto -> Se genera un evento de email con dedupeKey `miss_proj_...`.
- [ ] **Q12**: Opt-out -> Usuario desactiva "Product Tips" -> No recibe el email de D+1 pero SÍ el de Trial Ending.
- [ ] **Q13**: Rate limit -> Intentar disparar 2 emails de lifecycle en 1 hora para el mismo usuario -> El segundo debe ser bloqueado por el servicio.

## Integración Stripe
- [ ] **Q14**: Webhook `trial_will_end` -> La consola muestra el log de recepción y se dispara el email de Recordatorio (3d o 1d).
- [ ] **Q15**: Idempotencia Webhook -> Enviar el mismo evento de Stripe 2 veces -> El log de EmailEvent solo registra un envío.
