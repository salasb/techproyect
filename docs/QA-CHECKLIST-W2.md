# QA Checklist - Wave 2: Sentinel Copilot

Este checklist cubre la validación del motor Sentinel, el Command Center y el Dashboard de Superadmin.

## 1. Motor Sentinel (Core)
- [ ] **TC-01**: Verificación de Alerta S0 (Margen Bajo). Crear proyecto con margen < 15% y validar generación de Alerta + Tarea.
- [ ] **TC-02**: Verificación de Alerta S1 (Stock Crítico). Bajar stock de un producto por debajo de su mínimo y validar alerta.
- [ ] **TC-03**: Verificación de Tarea S2 (Follow-up Quote). Cotización enviada hace > 5 días sin respuesta genera tarea automática.
- [ ] **TC-04**: Persistencia de Alertas. Validar que las alertas se mantengan en el sistema tras recarga y cambio de estado.

## 2. Command Center (Copiloto)
- [ ] **TC-05**: Panel de Alertas Sentinel. Verificar filtros por severidad (S0 a S3).
- [ ] **TC-06**: Siguiente Mejor Acción. Validar que el panel muestre la tarea con mayor prioridad y su justificación.
- [ ] **TC-07**: Tareas Automáticas. Verificar que las tareas creadas por Sentinel tengan un distintivo visual claro.

## 3. Notificaciones y Acciones
- [ ] **TC-08**: Badge del Navbar. El contador de notificaciones se actualiza en tiempo real al generar alertas.
- [ ] **TC-09**: Acción "ACK". Al dar ACK a una alerta, su estado cambia y se refleja en el centro de notificaciones.
- [ ] **TC-10**: Acción "Resolve". Al resolver una alerta, desaparece de la lista de pendientes.

## 4. Superadmin SaaS
- [ ] **TC-11**: Métricas de Activación. Validar el cálculo de "Días a la 1ra cotización enviada" por organización.
- [ ] **TC-12**: Riesgo de Churn. Verificar que las organizaciones inactivas por > N días se marquen en rojo en el listado global.
