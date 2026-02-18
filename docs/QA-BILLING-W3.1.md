# QA Checklist: Billing Real & Multi-Org Hardening (Wave 3.1)

Este checklist valida la integración real con Stripe y el endurecimiento de la seguridad multi-tenencia.

## 1. Stripe Checkout & Sesiones
- [ ] **TC-01: Iniciar Suscripción**: Botón "Activar Plan" redirige a Stripe Checkout con el `organizationId` en metadata.
- [ ] **TC-02: Retorno Exitoso**: Al pagar, Stripe redirige a `/dashboard?checkout=success`.
- [ ] **TC-03: Cancelar Checkout**: Botón volver en Stripe redirige a `/settings/billing?checkout=cancel`.

## 2. Webhooks & Sincronización (Stripe a DB)
- [ ] **TC-04: Sincronización Post-pago**: Verificar en la DB que la suscripción cambia a `ACTIVE` tras `checkout.session.completed`.
- [ ] **TC-05: Manejo de Pago Fallido**: Simular `invoice.payment_failed` y verificar que el estado pasa a `PAST_DUE`.
- [ ] **TC-06: Cancelación en Stripe**: Cancelar en el dashboard de Stripe y verificar que en TechProyect pasa a `CANCELED`.
- [ ] **TC-07: Idempotencia**: Enviar el mismo evento de webhook dos veces y verificar que no hay errores ni duplicados.

## 3. Customer Portal
- [ ] **TC-08: Acceso al Portal**: Botón "Gestionar Suscripción" abre el Stripe Customer Portal.
- [ ] **TC-09: Actualización de Tarjeta**: Cambiar tarjeta en el portal y volver exitosamente.

## 4. Enforcement de PAUSE (Read-only real)
- [ ] **TC-10: Bloqueo Global**: En estado `PAUSED`, verificar que NO se puede crear NADA (Oportunidad, Cliente, Proyecto, Tarea).
- [ ] **TC-11: Navegación Permitida**: En estado `PAUSED`, verificar que se pueden ver detalles de proyectos y exportar PDF.
- [ ] **TC-12: Banner de Bloqueo**: El banner de paywall es persistente y claro sobre el estado de modo lectura.

## 5. Multi-tenancy & Seguridad
- [ ] **TC-13: Switcher Contextual**: Cambiar org y verificar que el estado de suscripción en el header cambia dinámicamente.
- [ ] **TC-14: Aislamiento de Datos**: Intentar acceder a una URL de proyecto de la Org B teniendo activa la Org A (Debe denegar o filtrar).
- [ ] **TC-15: Fix UX Sidebar**: Verificar que no hay ítems duplicados en el sidebar en ningún tamaño de pantalla (Desktop/Mobile).

---
**Resultado esperado**: 100% de éxito en entorno de pruebas de Stripe (Test Mode).
