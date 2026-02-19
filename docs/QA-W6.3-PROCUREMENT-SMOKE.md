# QA Smoke Test: Procurement v1 (Wave 6.3)

Este documento detalla los pasos para realizar una prueba de humo (smoke test) de las funcionalidades de adquisiciones.

## 1. Gestión de Proveedores
- [ ] Navegar a `/vendors`.
- [ ] Crear un nuevo proveedor con RUT y Email.
- [ ] Verificar que el proveedor aparezca en la lista con el tag "Proveedor".

## 2. Creación de Orden de Compra (OC)
- [ ] Navegar a `/purchases/new`.
- [ ] Seleccionar el proveedor creado en el paso 1.
- [ ] Agregar al menos un ítem:
    - [ ] Seleccionar un producto del catálogo (debe auto-llenar costo y descripción).
    - [ ] Seleccionar un proyecto activo.
- [ ] Verificar que los totales (Neto, IVA, Bruto) se calculen correctamente.
- [ ] Guardar la OC.

## 3. Estados y Flujo de OC
- [ ] Entrar al detalle de la OC recién creada (`/purchases/[id]`).
- [ ] Click en **"Marcar como Enviada"**. Verificar cambio de estado a "SENT".
- [ ] (Opcional) Exportar a PDF/Imprimir mediante el botón de impresora.

## 4. Recepción de Ítems (Gestión de Stock)
- [ ] En el detalle de la OC ("SENT"), click en **"Recibir Ítems"**.
- [ ] En el modal:
    - [ ] Ingresar una cantidad parcial (menor a la solicitada).
    - [ ] Seleccionar una bodega/ubicación de destino.
- [ ] Procesar la recepción.
- [ ] **Verificar impactos**:
    - [ ] La OC debe pasar a estado "PARTIALLY_RECEIVED".
    - [ ] Navegar a `/inventory` y verificar que el stock del producto aumentó en la bodega seleccionada.
    - [ ] Navegar al detalle del proyecto asignado y verificar que la OC aparece en la nueva pestaña "Compras".

## 5. Integración con Proyectos
- [ ] Navegar a `/projects/[id]` del proyecto usado en la OC.
- [ ] Abrir la pestaña **"Compras"**.
- [ ] Verificar que la OC aparezca listada con su monto bruto y estado correcto.
- [ ] Hacer click en "Explorar OC" y verificar que redirige al detalle de la OC.

## 6. Cancelación
- [ ] Crear otra OC en estado "DRAFT".
- [ ] Click en **"Cancelar OC"**.
- [ ] Confirmar y verificar que el estado cambia a "CANCELED".

---
**Resultado esperado**: Todas las transacciones deben quedar registradas en la bitácora de auditoría y los estados deben ser consistentes en toda la plataforma.
