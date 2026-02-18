# QA Checklist: Onboarding & Billing (Wave 3)

Este checklist contiene los casos de prueba fundamentales para validar la arquitectura SaaS de TechProyect.

## 1. Onboarding & Trial
- [ ] **TC-01: Registro de Nueva Organización**: Crear una org desde `/start` y verificar que redirige al Dashboard correctamente.
- [ ] **TC-02: Creación de Suscripción Trial**: En la DB, verificar que la nueva org tiene una `Subscription` con estado `TRIALING` y fecha de expiración a +14 días.
- [ ] **TC-03: Asignación de Roles**: Verificar que el creador de la org tiene el rol `owner` y estado `ACTIVE` en la membresía.

## 2. Multi-Tenancy (Switcher)
- [ ] **TC-04: Cambio de Organización**: Usar el `OrgSwitcher` para cambiar entre dos organizaciones y verificar que los datos (proyectos/clientes) se filtran correctamente.
- [ ] **TC-05: Creación de Org Adicional**: Verificar que un usuario existente puede crear una segunda organización desde el dropdown del Switcher.
- [ ] **TC-06: Persistencia de Contexto**: Refrescar la página y verificar que la organización activa persiste (vía cookie `app-org-id`).

## 3. Modo Lectura (PAUSE Enforcement)
- [ ] **TC-07: Expiración de Trial (Simulación)**: Cambiar `trialEndsAt` a una fecha pasada y verificar que el middleware detecta el estado y el `PaywallBanner` aparece.
- [ ] **TC-08: Bloqueo de Creación**: Intentar crear una Oportunidad o Cliente en una org `PAUSED` y verificar que el Server Action lanza el error de bloqueo.
- [ ] **TC-09: Bloqueo de Edición**: Intentar actualizar un producto en una org `PAUSED` y verificar el bloqueo por `ensureNotPaused`.
- [ ] **TC-10: Bloqueo de Eliminación**: Intentar borrar un ítem de cotización en una org `PAUSED` y verificar que la acción es impedida.

## 4. Lógica de Negocio & CRM
- [ ] **TC-11: Prospecto por Defecto**: Crear un cliente vía Quick Create y verificar que nace con `status: 'PROSPECT'`.
- [ ] **TC-12: Formalización de Cliente**: Convertir una Oportunidad en Proyecto y verificar que el cliente asociado cambia automáticamente a `status: 'CLIENT'`.
- [ ] **TC-13: Proyecto sin Cliente**: Verificar que se puede crear un proyecto/oportunidad sin asignar un cliente inicialmente.

## 5. Billing & UX
- [ ] **TC-14: Visibilidad de Estado**: Verificar que el `OrgSwitcher` muestra los badges correspondientes (Trial, Pro, Pausado) según el estado de la suscripción.
- [ ] **TC-15: Enlace de Activación**: Verificar que el botón "Activar Plan Pro" en el banner redirige a una (futura) ruta de checkout o aviso de pago.

---
**Resultado esperado**: Todos los tests deben pasar 'Verde' antes de considerar la Wave 3 completa.
