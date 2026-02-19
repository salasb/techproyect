# Documentación Funcional: Procurement v1

## 1. Visión General
El módulo de Procurement permite gestionar las compras de la organización, integrándolas directamente con el inventario (entrada de stock) y los proyectos (imputación de costos reales).

## 2. Modelos de Datos

### Vendor (Proveedor)
- Reutiliza la tabla `Client` con un flag `isVendor: true`.
- Permite diferenciar entre clientes (quienes pagan) y proveedores (a quienes pagamos).

### PurchaseOrder (Orden de Compra - OC)
- **Campos**: `poNumber`, `organizationId`, `vendorId`, `status`, `totalNet`, `totalTax`, `totalBruto`, `notes`, `createdAt`, `updatedAt`.
- **Estados**:
  - `DRAFT`: Edición inicial.
  - `SENT`: Enviada al proveedor.
  - `APPROVED`: Aprobación interna (opcional para V1, integrada en SENT/APPROVED).
  - `PARTIALLY_RECEIVED`: Algunos items han sido recibidos.
  - `RECEIVED`: Recepción total.
  - `CANCELED`: Anulada.

### PurchaseOrderItem (Detalle de OC)
- **Campos**: `productId`, `description` (manual si no hay producto), `quantity`, `receivedQuantity`, `priceNet`, `taxRate`, `projectId` (opcional), `locationId` (destino default).

## 3. Reglas de Negocio
- **Imputación a Proyecto**: Si un ítem de la OC tiene un `projectId`, al momento de la recepción (`Goods Receipt`), se debe registrar un movimiento de costo en el proyecto.
- **Integración con Inventario**: Cada recepción de ítems genera un `InventoryMovement` tipo `IN` o `PURCHASE`.
- **Cálculos**: Los totales se recalculan en cada cambio de líneas.
- **Seguridad**: Solo miembros de la organización pueden ver sus OCs. Orgs en pausa no pueden crear o recibir OCs.

## 4. Flujo de Usuario
1. Crear Proveedor en `/vendors`.
2. Crear Nueva OC en `/purchases/new`.
3. Gestionar OC (Aprobar/Enviar).
4. Recepcionar items vía modal en `/purchases/[id]`.
   - Seleccionar ubicación de destino.
   - Ingresar cantidad recibida.
   - Generar movimientos de stock.
