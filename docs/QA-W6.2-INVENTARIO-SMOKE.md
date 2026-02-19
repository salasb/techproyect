# QA Smoke Test: Inventory v1 (Wave 6.2)

## Objetivo
Validar que el sistema de inventario (v1) funciona correctamente como "fuente de la verdad" para el stock, permitiendo movimientos de entrada, salida y ajustes, y reflejando estos cambios en el Kardex y en la vista de proyectos.

## Prerrequisitos
- Usuario logueado con rol de Admin o Miembro con permisos.
- Al menos un Producto creado.
- Al menos una Ubicación creada (e.g., Bodega Principal).

## Casos de Prueba

### 1. Gestión de Stock Global (/inventory)
- [ ] **Ver Listado**: Navegar a `/inventory`. Verificar que se listan los productos con su stock total (suma de todas las ubicaciones).
- [ ] **Búsqueda**: Buscar un producto por nombre o SKU.

### 2. Kardex y Ajustes (/inventory/products/[id])
- [ ] **Ver Detalle**: Hacer clic en un producto. Verificar que se muestra el detalle y el historial de movimientos (Kardex).
- [ ] **Ajuste Manual (IN)**:
    - Hacer clic en "Ajustar Stock".
    - Seleccionar "Entrada (+)" o "Compra".
    - Ingresar Cantidad (e.g., 10) y Ubicación.
    - Confirmar.
    - **Validación**: El stock total debe aumentar en 10. Aparece una nueva línea en el Kardex tipo IN o PURCHASE.
- [ ] **Ajuste Manual (OUT)**:
    - Hacer clic en "Ajustar Stock".
    - Seleccionar "Salida (-)" o "Venta".
    - Ingresar Cantidad (e.g., 5) y Ubicación.
    - Confirmar.
    - **Validación**: El stock total debe disminuir en 5. Aparece una nueva línea en el Kardex tipo OUT o SALE.

### 3. Transferencias
- [ ] **Transferir Stock**:
    - Hacer clic en "Ajustar Stock" (o botón dedicado si existe, o usar el modal de ajuste con tipo TRANSFER).
    - Seleccionar "Transferencia".
    - Origen: Bodega A. Destino: Bodega B.
    - Cantidad: 2.
    - Confirmar.
    - **Validación**:
        - Stock en Bodega A disminuye en 2.
        - Stock en Bodega B aumenta en 2.
        - Stock Global se mantiene igual.
        - Kardex muestra movimientos (OUT de A, IN a B).

### 4. Consumo en Proyectos (/projects/[id])
- [ ] **Asignar Material a Proyecto**:
    - Ir a `/inventory/movements/new` (Acción Rápida) o usar el modal en detalle de producto.
    - Tipo: "Salida (-)".
    - Seleccionar Proyecto activo.
    - Confirmar.
- [ ] **Verificar en Proyecto**:
    - Navegar al Proyecto seleccionado.
    - Ir a la pestaña "Inventario".
    - **Validación**: Debe aparecer el movimiento de consumo en la tabla de inventario del proyecto.

### 5. Exportación
- [ ] **Exportar CSV**:
    - Ir a `/inventory`.
    - Clic en "Exportar Inventario".
    - **Validación**: Se descarga un archivo CSV. Abrir y verificar que los datos son correctos y no hay fórmulas extrañas (seguridad).
