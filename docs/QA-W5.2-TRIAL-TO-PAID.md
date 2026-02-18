# QA Checklist: Wave 5.2 - Trial→Paid Conversion

Este documento detalla los casos de prueba críticos para validar el embudo de conversión y el sistema de experimentos.

## 1. Webhooks e Idempotencia
- [ ] **TRIAL_WILL_END**: Simular evento en Stripe CLI. Verificar que se crea `ActivationEvent` y se envía email al owner.
- [ ] **Duplicidad**: Re-enviar el mismo `event.id` de Stripe. Verificar que NO se duplican los eventos en DB.
- [ ] **CHECKOUT_COMPLETED**: Completar flujo de pago. Verificar cambio de status de la organización a `ACTIVE`.

## 2. Paywall UX (Read-Only)
- [ ] **Estado Paused**: Forzar status `PAUSED` en una org. Verificar aparición del banner en Header.
- [ ] **Intercepción**: Intentar crear un nuevo proyecto. Verificar que aparece el Modal "Modo lectura" en lugar de ejecutar la acción.
- [ ] **Acceso a Billing**: Verificar que el link en el banner y modal redirige correctamente a `/settings/billing`.

## 3. Experimentos (Validación)
- [ ] **Asignación Estable**: Entrar como el mismo usuario desde distintos navegadores. Verificar que la variante del banner es la misma.
- [ ] **Diferentes Orgs**: Verificar que Org A y Org B pueden tener variantes distintas (A vs B).
- [ ] **Override Admin**: Probar cambiar la variante manualmente desde `/superadmin/activation` (si aplica) o DB y ver el cambio reflejado.

## 4. Lifecycle Reminders
- [ ] **D-3 Email**: Verificar contenido del email (asunto y body) según la plantilla.
- [ ] **D-1 Nudge**: Simular fecha de expiración mañana. Entrar al Dashboard. Verificar que aparece el Nudge de urgencia.

## 5. Superadmin Dashboard
- [ ] **Visualización Funnel**: Los números deben coincidir con la sumatoria de `ActivationEvent` filtrados.
- [ ] **Lista de Riesgo**: Verificar que las orgs con trial < 48h y 0 proyectos aparecen al inicio.
