# QA-GOLIVE-W3.2: Checklist de Facturación y Seguridad

Este documento detalla los casos de prueba críticos para validar la Wave 3.2 y asegurar la robustez del sistema en producción.

## 🛡️ Casos de Prueba: Seguridad y Facturación

### 1. Ciclo de Vida de Suscripción (Trial & Expiration)
- [ ] **Trial Activo**: Crear nueva organización. Verificar que permite crear proyectos y tareas (Estado: `TRIALING`).
- [ ] **Expiración de Trial**: Manipular `trialEndsAt` en DB al pasado. Verificar que `ensureNotPaused` lanza error en acciones de escritura.
- [ ] **Modo Read-Only**: En una org con trial vencido o suscripción `PAUSED`, intentar borrar un proyecto. Verificar que falla.
- [ ] **Banner de Bloqueo**: Verificar que aparece el banner persistente con el CTA "Activar" cuando la cuenta está bloqueada.

### 2. Pasarela de Pagos (Stripe Checkout)
- [ ] **Checkout Exitoso**: Iniciar checkout, completar en Stripe Test. Verificar redirección a `/dashboard?checkout=success`.
- [ ] **Activación Instantánea**: Tras el checkout, verificar que el webhook sincronizó el estado a `ACTIVE` localmente.
- [ ] **Portal de Cliente**: Probar que el botón "Gestionar Suscripción" abre el Customer Portal de Stripe.

### 3. Webhooks e Idempotencia
- [ ] **Verificación de Firma**: Enviar un webhook falso sin firma. Verificar que responde 400.
- [ ] **Idempotencia (Replay)**: Re-enviar el mismo `event.id` de Stripe. Verificar que responde 200 pero no aplica efectos duplicados (revisar tabla `StripeEvent`).
- [ ] **Sincronización de Fallos**: Simular `invoice.payment_failed`. Verificar que el estado cambia a `PAST_DUE`.

### 4. Seguridad Multi-Tenant
- [ ] **Aislamiento de Cookies**: Intentar cambiar el valor de `app-org-id` por el ID de una organización ajena. Verificar que el middleware detecta el fraude, limpia la cookie y redirige.
- [ ] **Auditoría de Switch**: Cambiar entre 2 organizaciones. Verificar en la tabla `AuditLog` que existe el registro `ORG_SWITCH` con el userId y orgId correctos.

### 5. Reglas de Negocio (Sales Pipeline)
- [ ] **Proyecto sin Cliente**: Crear proyecto omitiendo el cliente. Verificar éxito.
- [ ] **Bloqueo de Cotización**: Intentar "Enviar Cotización" en un proyecto sin cliente. Verificar que el sistema exige seleccionar uno.
- [ ] **Promoción de Cliente**: Crear un Prospecto. Asociarlo a un proyecto. Enviar Cotización. Verificar que el status del cliente cambia automáticamente a `CLIENT`.
- [ ] **Congelamiento de Versiones**: Enviar una cotización. Verificar que se crea un registro en `Quote` con `frozenAt`. Intentar editarla y verificar que se genera una vN+1.

## 🛠️ Verificación Técnica
- [ ] `npm run build` sin errores (validación de Stripe Lazy Init).
- [ ] Ausencia de duplicados en el sidebar (User Profile centralizado).
- [ ] Logs de servidor limpios durante el flujo de webhook.
