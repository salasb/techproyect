# QA Checklist - Wave 0: Saneamiento Canónico

Este checklist valida que los cambios realizados en la Ola 0 cumplen con las reglas de negocio y no introducen regresiones.

## 1. Navegación y Modos (IA v2)
- [ ] **CP-01**: Verificar que el Sidebar muestra los grupos: Command Center, Vender, Ejecutar, Cobrar, Inventario, Reportes, Configuración.
- [ ] **CP-02**: Activar "Modo Solo" en Configuración y verificar que desaparecen los links de "Usuarios" y "Pagos".
- [ ] **CP-03**: Desactivar "Modo Solo" y verificar que la complejidad (Usuarios/Pagos) retorna sin pérdida de datos.

## 2. Proyectos y Clientes
- [ ] **CP-04**: Crear un proyecto sin seleccionar cliente (Debe permitir).
- [ ] **CP-05**: Intentar mover un proyecto a etapa "Cotización" sin cliente (Debe bloquear y requerir asignación).
- [ ] **CP-06**: Asignar cliente a un proyecto existente y avanzar de etapa (Debe permitir).

## 3. Motor de Tareas y Dashboard
- [ ] **CP-07**: Agregar 3 tareas a un proyecto (Verificar visualización en detalle).
- [ ] **CP-08**: Verificar en el Dashboard que la bandeja de tareas muestra las acciones de todos los proyectos activos.
- [ ] **CP-09**: Validar que la lista principal de proyectos muestra la tarea pendiente más urgente de forma automática.

## 4. Inventario y Atajos
- [ ] **CP-10**: Acceder al "Escáner QR" desde el botón del Command Center (Dashboard).
- [ ] **CP-11**: Verificar tooltip informativo "¿Qué es Kardex?" en el catálogo de productos.
- [ ] **CP-12**: Abrir modal de Movimiento de Stock y verificar claridad de etiquetas: Entrada (+), Salida (-) y Transferencia.
