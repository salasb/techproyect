# Plan de QA - TEAM Mode v4.2

Este documento detalla los 18 casos de prueba críticos para validar la implementación de TEAM Mode Wave 4.2.

## 1. Invitaciones e Idempotencia
- [ ] **CP-01**: Enviar invitación con éxito (Admin/Owner). Verificar email (o link en consola).
- [ ] **CP-02**: Reenviar invitación (Resend). Verificar que el `sentCount` aumenta y `sentAt` se actualiza.
- [ ] **CP-03**: Idempotencia: Intentar invitar a un email con invitación PENDING activa. Ver que no se duplica.
- [ ] **CP-04**: Revocar invitación. Verificar que el link deja de funcionar.
- [ ] **CP-05**: Invitación expirada: Forzar `expiresAt` en el pasado y verificar bloqueo al intentar unirse.
- [ ] **CP-06**: Enviar invitación desde una organización en modo SOLO (Debe estar bloqueado o pedir upgrade).

## 2. Proceso de Unión (Join) y Auth
- [ ] **CP-07**: Unirse siendo un usuario NO logueado (Debe pedir login y luego procesar invite).
- [ ] **CP-08**: Unirse siendo un usuario YA logueado. Verificar que se añade a la organización correcta.
- [ ] **CP-09**: Intentar unirse con un token inválido o manipulado.
- [ ] **CP-10**: Usuario ya miembro: Intentar aceptar invite de una org donde ya es ACTIVE.

## 3. Seat Enforcement (Límites)
- [ ] **CP-11**: Bloqueo por límite: Intentar unirse cuando `seatsUsed >= seatsLimit`. Mensaje claro esperado.
- [ ] **CP-12**: Invitar estando al límite: Verificar regla de advertencia o bloqueo según contrato.
- [ ] **CP-13**: Sincronización Stripe: Al unirse un miembro, verificar (en logs) que se intenta actualizar la cantidad en Stripe.

## 4. Multi-tenancy y Seguridad (RLS)
- [ ] **CP-14**: Cambio de Org: Usuario en Org A intenta acceder a recursos de Org B vía URL directa/API (Debe fallar via RLS).
- [ ] **CP-15**: Org Switcher: Verificar que el switcher muestra solo las organizaciones donde el usuario es miembro.
- [ ] **CP-16**: Safety: Intentar dejar una organización sin OWNER (Cambiar rol o remover el último owner). Debe fallar.

## 5. Billing y Estados
- [ ] **CP-17**: Org en PAUSE/PAST_DUE: Los miembros deben poder entrar, pero no crear proyectos/invitar (Read-only check).
- [ ] **CP-18**: AuditLog: Verificar entradas para `INVITE_SENT`, `INVITE_ACCEPTED`, `MEMBER_REMOVED`, y `SEAT_LIMIT_BLOCK`.

## Notas de Verificación
- Las pruebas de email en DEV deben verificarse vía consola o UI de "Copy Link".
- RLS debe probarse intentando `SELECT` desde Supabase con el UID del usuario.
