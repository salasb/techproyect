# QA Checklist: Team Mode Operacional (Wave 4.2.1)

Este documento detalla los pasos para verificar que las funcionalidades de equipo son seguras, operativas y respetan los límites de asientos.

## 👥 Miembros e Invitaciones

- [ ] **1. Invitar Miembro (ADMIN/MEMBER/VIEWER)**
  - Acceder a `/settings/team`.
  - Invitar a un email con rol VIEWER.
  - Verificar que se genera el link y aparece en "Invitaciones Pendientes".

- [ ] **2. Idempotencia de Invitación**
  - Intentar invitar al MISMO email antes de que acepte.
  - Verificar que NO se crea un nuevo registro, sino que se actualiza el existente (sentCount++).

- [ ] **3. Expiración de Invitación**
  - Forzar expiración en DB (opcional) o verificar que una invitación marcada como EXPIRED/REVOKED bloquea el acceso en `/join`.

- [ ] **4. Join con Sesión Activa**
  - Crear invitación -> Abrir link logueado con el email invitado.
  - El sistema debe procesar la unión directamente y redirigir al dashboard.

- [ ] **5. Join sin Sesión (Auth Wall)**
  - Abrir link de invitación en incógnito.
  - Debe redirigir a Login/Signup.
  - Tras login exitoso, debe procesar la invitación pendiente.

## 🪑 Control de Asientos (Seat Limit)

- [ ] **6. Bloqueo por Límite Alcanzado**
  - Si la organización tiene 1/1 asientos, intentar aceptar una invitación.
  - Verificar el mensaje de error: "Límite de asientos alcanzado".
  - Verificar que se registra un evento `SEAT_LIMIT_BLOCK` en auditoría.

## 🔐 Roles y Permisos (RBAC)

- [ ] **7. Cambio de Roles**
  - Un OWNER puede cambiar el rol de un ADMIN.
  - Un MEMBER NO puede ver las opciones de gestión de equipo.

- [ ] **8. Seguridad del Owner**
  - El OWNER no puede eliminarse a sí mismo si es el único dueño.
  - Verificar que no se puede "degradar" al último OWNER de la organización.

- [ ] **9. OrgSwitcher Multi-org**
  - Usuario en Org A (Admin) y Org B (Viewer).
  - Verificar que el Switcher cambia correctamente el `orgId` y los permisos se ajustan.

## 🛡️ Multi-tenancy & Billing

- [ ] **10. Cross-organization Security**
  - Intentar revocar una invitación de la Org B usando una sesión de la Org A (vía API/Action).
  - Debe retornar 403 o error de permisos.

- [ ] **11. Billing Guard**
  - (Simulado) Si la suscripción está CANCELLED o PAST_DUE, el botón "Invitar" debe estar deshabilitado o arrojar error al intentar procesar.

---
**Fecha de Verificación:** 2026-02-18
**Versión:** 4.2.1 (Build Green)
