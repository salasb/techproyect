# Inventario v1 - Fuente de Verdad y Contrato

## 1. Principios de Diseño
1.  **InventoryMovement es la Fuente de Verdad**: El stock actual (`ProductStock`) es simplemente la suma agregada de todos los movimientos históricos.
    - `ProductStock` actualiza su valor tras cada movimiento (modelo snapshot/caché), pero si hay inconsistencia, se debe reconstruir desde `InventoryMovement`.
2.  **Multi-Tenancy Estricto**: Todo acceso a productos, ubicaciones y movimientos debe estar filtrado por `organizationId`.
3.  **Auditoría**: Cada movimiento registra quién lo hizo (`userId`) y cuándo.
4.  **Integración con Proyectos**: Los movimientos de salida (OUT) pueden estar asociados a un `projectId` para tracking de consumo.

## 2. Modelo de Datos (Schema)

### Enums
```prisma
enum MovementType {
  IN        // Entrada (Compra, Devolución)
  OUT       // Salida (Consumo, Venta, Pérdida)
  ADJUST    // Ajuste de Inventario (Corrección)
  TRANSFER  // Transferencia (Salida de A + Entrada a B)
}
```

### Entidades

**1. Product (Existente)**
- `sku` (Unique per Org)
- `name`
- `costNet` (Costo Promedio o Último Costo)

**2. Location (Existente)**
- `name`
- `description`
- *Ejemplos: "Bodega Central", "Pañol Obra A", "Camioneta 1"*

**3. InventoryMovement (Modificado)**
- `id`: UUID
- `organizationId`: UUID
- `productId`: UUID (Relación a Product)
- `locationId`: UUID (Relación a Location)
- `type`: MovementType
- `quantity`: Float (Siempre positivo. La lógica de negocio determina signo según Type)
- `projectId`: UUID? (Opcional, para OUT)
- `userId`: UUID (Quién ejecutó la acción)
- `createdAt`: DateTime
- `description`: String?

**4. ProductStock (Derivado)**
- `productId`
- `locationId`
- `quantity`: Float (Stock actual)
- `minStock`: Float (Alerta)

## 3. Lógica de Movimientos

### Cálculo de Stock
$$ Stock_{final} = Stock_{inicial} + \Delta $$

| Tipo | Operación en Stock |
| :--- | :--- |
| **IN** | `+ quantity` |
| **OUT** | `- quantity` (Validar que `Stock >= quantity` si configuración lo exige) |
| **ADJUST** | `= quantity` (Crea un movimiento de diferencia: `New - Old`) |
| **TRANSFER** | 2 Movimientos: **OUT** de Origen + **IN** a Destino (Transaccional) |

### Integración con Proyectos
- Cuando se registra un **OUT** con `projectId`:
    - El sistema resta stock de la bodega seleccionada.
    - Queda registrado que ese proyecto consumió X cantidad.
    - Futuro (Cost Model): `quantity * product.costNet` = Costo del Proyecto.

## 4. Reglas de Negocio
1.  **Idempotencia**: Evitar duplicados en clicks rápidos. Frontend debe deshabilitar botón. Backend podría usar `dedupeKey` opcional.
2.  **Bloqueo por Suscripción**: Si la organización está `PAUSED` o `PAST_DUE`, el `InventoryService` debe rechazar creación de movimientos (Read-only).
3.  **Inventario Negativo**: Por defecto permitido en v1 (soft warning), a menos que se configure estricto.

## 5. API & Servicios (Server Actions)

`InventoryService` methods:
- `createMovement(data: CreateMovementDTO)`
- `getStock(productId, locationId)`
- `getProjectConsumption(projectId)`
- `recalculateStock(productId, locationId)` (Admin/Repair tool)

## 6. Seguridad (Exportación)
- Al generar CSV de movimientos/inventario:
    - Escapar celdas que inician con `=`, `+`, `-`, `@`.
    - Ejemplo: `=1+1` se guarda como `'=1+1`.
