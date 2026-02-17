# QA Checklist - Wave 1: Versionado, Promoción y Cierres

Este checklist valida que los cambios realizados en la Ola 1 cumplen con las nuevas reglas de negocio y mantienen la integridad del sistema.

## 1. Cotizaciones Versionadas
- [ ] **CP-01**: Enviar una cotización y verificar que se genera el snapshot v1 (congelado).
- [ ] **CP-02**: Intentar editar una cotización enviada y verificar que se crea automáticamente la versión v2.
- [ ] **CP-03**: Verificar que el historial de versiones muestra los totales correctos para cada iteración.
- [ ] **CP-04**: Aceptar la v1 de una cotización cuando existe una v2 (Verificar reglas de precedencia).

## 2. Contactos y Promoción
- [ ] **CP-05**: Crear un Proyecto asociado a un `PROSPECT`. Enviar cotización y verificar cambio automático a `CLIENT`.
- [ ] **CP-06**: Validar que se puede crear un Cliente sin RUT inicialmente (solo nombre/contacto).

## 3. Cierres y Razones
- [ ] **CP-07**: Cerrar un Proyecto como "CANCELADO" y verificar que el sistema obliga a seleccionar una razón.
- [ ] **CP-08**: Verificar que la razón de cierre se guarda y se visualiza en el historial/log del proyecto.

## 4. Dashboard (Tareas Unificadas)
- [ ] **CP-09**: Verificar que el widget de tareas muestra acciones provenientes tanto de Proyectos como de Oportunidades del CRM.
- [ ] **CP-10**: Validar que el orden de las tareas prioriza las fechas de vencimiento más próximas.
