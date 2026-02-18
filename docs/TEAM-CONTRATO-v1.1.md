# Contrato Team Mode v1.1

Este documento define las reglas de negocio y comportamiento técnico para el módulo de equipos en TechWise.

## 1. Estados de Invitación
Toda invitación (`UserInvitation`) transita por los siguientes estados:

| Estado | Descripción | Transición |
| :--- | :--- | :--- |
| **PENDING** | Invitación enviada pero no resuelta. | `createdAt`, `sentAt` |
| **ACCEPTED** | El usuario aceptó la invitación. | `acceptedAt` |
| **EXPIRED** | Se alcanzó la fecha `expiresAt` (7 días por defecto). | Automático o validado en runtime |
| **REVOKED** | El administrador canceló la invitación. | `revokedAt` |

## 2. Reglas de Invitación (Idempotencia)
- **Email Único PENDING**: No se permite crear una nueva invitación si ya existe una `PENDING` para el mismo `email` + `organizationId` que no haya expirado.
- **Resend**: Al reenviar, se actualiza `sentAt` y se incrementa `sentCount`, pero se mantiene el mismo token (o se regenera si es necesario por seguridad, manteniendo 1 sola activa).
- **Revoke**: Una invitación revocada ya no permite el acceso a `/join`.

## 3. Seat Enforcement (Gestión de Asientos)
El sistema bloquea la entrada de nuevos miembros si se supera el límite del plan.

- **seatsUsed**: Conteo de `OrganizationMember` con estado `ACTIVE`.
- **seatsLimit**: 
  - **SOLO Mode**: 1 asiento.
  - **TEAM Mode**: Según suscripción (Stripe) u `Organization.planSeats`.
- **Bloqueo**: 
  - Al aceptar invitación: Si `seatsUsed >= seatsLimit`, se bloquea el proceso con mensaje: *"La organización alcanzó su límite de asientos. Contacta al Owner."*
  - Al enviar invitación: Se permite enviar siempre que `seatsUsed + pendingInvites < seatsLimit * 2` (Evitar spam masivo en planes pequeños).

## 4. Matriz de Permisos (RBAC)

| Acción | OWNER | ADMIN | MEMBER | VIEWER |
| :--- | :---: | :---: | :---: | :---: |
| Invitar Miembros | ✅ | ✅ | ❌ | ❌ |
| Revocar/Reenviar Invitación | ✅ | ✅ | ❌ | ❌ |
| Cambiar Roles (Admin/Member/Viewer) | ✅ | ✅ | ❌ | ❌ |
| Cambiar de MEMBER a OWNER | ✅ | ❌ | ❌ | ❌ |
| Remover Admin/Owner | ✅ (sólo a otros) | ❌ | ❌ | ❌ |
| Remover Member/Viewer | ✅ | ✅ | ❌ | ❌ |
| Ver Configuración de Equipo | ✅ | ✅ | ✅ | ✅ |

### Seguridad Crítica
- Una organización **nunca** puede quedarse sin `OWNER`.
- Solo el `OWNER` puede degradar su propio rol si existe otro `OWNER`.

## 5. Eventos de Auditoría (AuditLog)
Todas las acciones críticas deben registrarse con `action` y `details`:
- `INVITE_SENT`: Incluye email y rol.
- `INVITE_REVOKED`: Incluye email.
- `INVITE_ACCEPTED`: Incluye userId.
- `MEMBER_ROLE_CHANGED`: Incluye oldRole -> newRole.
- `MEMBER_REMOVED`: Incluye userId eliminado.
- `SEAT_LIMIT_BLOCK`: Intento fallido por límite.
- `STRIPE_SEATS_SYNC`: Sincronización de cantidad de asientos con Stripe.

## 6. Sincronización con Stripe (Preparado)
Si la suscripción es "licensed" (cobro por asiento):
- Al cambiar `seatsUsed` (Aceptar/Remover), se ajusta `quantity` en el `SubscriptionItem` de Stripe.
- Errores en Stripe se loguean pero no bloquean la experiencia del usuario (tolerancia a fallos).
