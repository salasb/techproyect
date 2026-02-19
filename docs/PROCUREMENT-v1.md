# Contrato de Procurement v1

Este documento define las reglas de negocio, estados e invariantes del módulo de Adquisiciones.

## Estados de la Orden de Compra (PurchaseOrderStatus)

| Estado | Descripción | Transiciones Permitidas | Restricciones |
| :--- | :--- | :--- | :--- |
| `DRAFT` | Borrador inicial. | `SENT`, `CANCELED` | Puede ser editada libremente. |
| `SENT` | Enviada al proveedor. | `APPROVED`, `CANCELED`, `PARTIALLY_RECEIVED` | No editable (salvo notas). |
| `APPROVED` | Aprobada internamente. | `SENT`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELED` | Lista para recepción. |
| `PARTIALLY_RECEIVED` | Algunos ítems han sido recibidos. | `RECEIVED`, `CANCELED` (vía devoluciones en v2) | **Bloqueada**: No se puede cancelar si hay stock recibido. |
| `RECEIVED` | Todos los ítems recibidos (100%). | Ninguna (Final) | **Cerrada**: No editable. |
| `CANCELED` | Anulada. | Ninguna | Solo si no hay recepciones asociadas. |

## Reglas de Negocio e Invariantes

### 1. Numeración Correlativa (Idempotencia en Creación)
- El `poNumber` es secuencial **por organización**.
- Se utiliza un contador atómico en la entidad `Organization` para evitar colisiones bajo concurrencia.
- Restricción: `UNIQUE(organizationId, poNumber)`.

### 2. Recepciones e Idempotencia
- Cada proceso de recepción requiere un `receiptNumber` (ej: Número de Factura o Guía de Despacho del proveedor).
- Se registra una entidad `PurchaseOrderReceipt` que actúa como "Idempotency Key".
- Si se intenta procesar el mismo `receiptNumber` para la misma OC, el sistema ignorará la operación sin duplicar stock ni movimientos contables.
- Invariante: `receivedQty <= orderedQty`. No se permite sobre-recepción en v1.

### 3. Trazabilidad e Inventario
- Cada recepción genera automáticamente registros en `InventoryMovement`.
- Los movimientos de inventario deben referenciar el `receiptNumber` para auditoría.
- Si el ítem está vinculado a un proyecto, se genera un `CostEntry` automático por el monto neto recibido.

## Seguridad Multi-Tenant
- Todos los queries y mutaciones **deben** incluir `organizationId` en el predicado `where`.
- El acceso a `/purchases/[id]` debe dar 404 o Error si la OC no pertenece a la organización activa del usuario.

## Permisos (RBAC)
- **OWNER / ADMIN**: Acceso total (Crear, Aprobar, Recibir, Cancelar).
- **MEMBER**: Crear DRAFT, Ver listas.
- **VIEWER**: Solo lectura.
