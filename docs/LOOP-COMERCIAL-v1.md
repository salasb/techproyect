# Loop Comercial (Quote-to-Cash) - Contrato v1

## 1. Definiciones Canonicas

### Quote (Cotización)
Documento inmutable en el tiempo una vez "Enviado". Representa una oferta formal.
- **Estados**:
    - `DRAFT`: Borrador editable. No visible para el cliente.
    - `SENT`: Enviada y Congelada (`frozenAt`). No editable.
    - `ACCEPTED`: Aceptada por el cliente. Gatilla opción de Facturar.
    - `REJECTED`: Rechazada.
    - `ARCHIVED`: Obsoleta (por nueva versión).

- **Versioning**:
    - Una cotización enviada (`SENT`) es inmutable.
    - Para corregir, se crea una **Revisión** (`revisionOfId`).
    - La revisión nace en `DRAFT` con `version = parent.version + 1`.

### Invoice (Factura)
Documento de cobro legal/tributario.
- **Estados**:
    - `DRAFT`: Pre-visualización.
    - `ISSUED`: Emitida/Enviada. Deuda vigente.
    - `PAID`: Pagada totalmente.
    - `VOID`: Anulada.
    - `PARTIALLY_PAID`: Abono parcial (opcional).

### Payment (Pago)
Registro de flujo de dinero.
- Puede ser automático (Stripe) o manual (Transferencia).
- Un pago pertenece a una Factura.

## 2. Reglas de Negocio (Invariantes)

### A. Cliente Obligatorio para Enviar
- Un proyecto puede nacer sin cliente (Lead/Prospecto interno).
- **Prohibido** pasar Quote a `SENT` si `project.clientId` es nulo.
- **UX**: Al intentar enviar, si no hay cliente, abrir modal "Asignar Cliente".

### B. Inmutabilidad (Freeze)
- Al transicionar a `SENT`, se registra `frozenAt` y snapshot de los items (si no están ya en `QuoteItem` inmutables).
- Cualquier intento de `UPDATE` sobre una Quote `SENT` debe fallar (Backend Guard).

### C. Idempotencia
- `acceptQuote(id)`: Si ya está `ACCEPTED`, retornar éxito (200) sin duplicar efectos secundarios (Audit, Email).
- `payInvoice(id)`: Si ya está `PAID`, no procesar cobro doble.

### D. Multi-Tenant y Compliance
- **Org PAUSED/PAST_DUE**: Solo lectura. No se pueden crear Quotes, Revisiones ni emitir Facturas.
- `AuditLog`: Cada cambio de estado mayor (`SENT`, `ACCEPTED`, `PAID`) debe generar un registro de auditoría.

## 3. Roles y Visibilidad

| Acción | Owner/Admin | Member | Viewer | Público (Token) |
|---|---|---|---|---|
| Crear Quote | ✅ | ✅ | ❌ | ❌ |
| Enviar Quote | ✅ | ✅ | ❌ | ❌ |
| Aceptar Quote| ✅ (Manual)| ❌ | ❌ | ✅ (Solo con Token) |
| Emitir Invoice| ✅ | ✅ | ❌ | ❌ |
| Registrar Pago| ✅ | ❌ | ❌ | ✅ (Solo vía Stripe) |

## 4. Flujo de Estados (Happy Path)

1.  **Draft**: Usuario crea cotización en Proyecto.
2.  **Send**: Usuario asigna Cliente y envía. Estado -> `SENT`. Inmutable.
3.  **Customer View**: Cliente recibe link. Ve PDF/Web View.
4.  **Accept**: Cliente acepta. Estado -> `ACCEPTED`.
5.  **Invoice**: Sistema/Usuario genera Factura desde Quote aceptada.
6.  **Pay**: Cliente paga. Estado Invoice -> `PAID`.
