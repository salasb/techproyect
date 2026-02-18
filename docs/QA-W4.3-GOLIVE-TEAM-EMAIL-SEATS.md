# QA Checklist - Wave 4.3 (Go-Live Team + Email + Seats)

Este documento valida que TechProyect esté listo para producción con un funnel de activación robusto y controles de seguridad.

## Casos de Prueba

### 1. Emails de Invitación
- [ ] Enviar invitación (Dev: verificar consola; Prod: verificar Resend).
- [ ] El asunto del correo es personalizado con el nombre de la organización.
- [ ] El link de "Unirme al Equipo" apunta al dominio correcto (`APP_BASE_URL`).

### 2. Idempotencia y Reenvío
- [ ] Reenviar invitación desde el Dashboard.
- [ ] Verificar que el link anterior se invalida y el nuevo llega con el tipo `RESEND`.
- [ ] Verificar que no se crean registros duplicados en `UserInvitation` (se actualiza el existente).

### 3. Rate Limiting (Anti-Abuso)
- [ ] Intentar enviar más de 5 invitaciones en 1 hora (debe salir Toast de error).
- [ ] Intentar enviar más de 20 en un día (debe bloquear).
- [ ] Intentar reenviar la misma invitación más de 5 veces en 1 hora (debe bloquear).

### 4. Control de Asientos (Seats)
- [ ] En plan SOLO (1 asiento), intentar aceptar una invitación siendo ya un miembro (debe bloquear).
- [ ] En plan TEAM, sincronizar vía Stripe quantity=3 y verificar que bloquea la 4ta aceptación.
- [ ] Eliminar un miembro y verificar que se puede aceptar una nueva invitación inmediatamente.

### 5. Stripe Webhook Sync
- [ ] Simular `customer.subscription.updated` con `quantity=5` y verificar `seatLimit` en DB.
- [ ] Simular `PAST_DUE` y verificar que el middleware bloquea escrituras.

### 6. Activation Funnel
- [ ] Crear nueva organización -> Verificar `attributes.ORG_CREATED` en `OrganizationStats`.
- [ ] Convertir oportunidad a proyecto -> Verificar `FIRST_PROJECT_CREATED`.
- [ ] Enviar primera cotización -> Verificar `FIRST_QUOTE_SENT`.
- [ ] Crear primera factura -> Verificar `FIRST_INVOICE_CREATED`.

### 7. Seguridad Multi-Tenant
- [ ] Intentar unir a un usuario con un token de otra organización.
- [ ] Verificar que los contadores de rate limit son aislados por `organizationId`.

### 8. Build Green
- [ ] `npm run lint` no devuelve errores críticos.
- [ ] `npm run build` finaliza con exit code 0.
