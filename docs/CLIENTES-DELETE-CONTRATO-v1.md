# CONTRATO DE ELIMINACIÓN DE CLIENTES (v1.0)
Fecha: 17 de Marzo, 2026
Autor: Staff Engineer / TechProyect

## 1. DIAGNÓSTICO DE CAUSA RAÍZ
El error "No se pudo completar la eliminación en la base de datos" se debe a una violación de integridad referencial. El modelo `Client` tiene relaciones obligatorias o restrictivas con:
- `Project`: `onDelete: NoAction` (Restrictivo por defecto en la mayoría de DBs con Prisma).
- `Opportunity`: Sin política explícita (Default: `Restrict`).
- `PurchaseOrder`: Relación como Vendor (Default: `Restrict`).

Intentar un `prisma.client.delete()` sobre registros con estas dependencias resulta en un error 400/500 de base de datos que el servicio captura de forma genérica.

## 2. RELACIONES AUDITADAS
| Entidad | Relación | Política onDelete | Impacto en Delete |
| :--- | :--- | :--- | :--- |
| **Contact** | 1:N | Cascade | Borrado automático (OK) |
| **Interaction** | 1:N | Cascade | Borrado automático (OK) |
| **Project** | 1:N | NoAction/Restrict | Bloquea el borrado si hay proyectos |
| **Opportunity** | 1:N | Restrict | Bloquea el borrado si hay oportunidades |
| **PurchaseOrder**| 1:N | Restrict | Bloquea el borrado si actuó como proveedor |

## 3. POLÍTICA DE ELIMINACIÓN ADOPTADA
Se adopta una **Estrategia Híbrida de Seguridad**:

### A. Hard Delete Permitido
Solo si el cliente está "aislado" (sin Opportunities, Projects ni PurchaseOrders). Esto es útil para limpiar errores de digitación o pruebas.

### B. Hard Delete Bloqueado (Historial Comercial)
Si existen dependencias comerciales, el sistema **impedirá** el borrado físico. Se deberá informar al usuario la razón exacta. 

### C. Estrategia de Archivado (Futuro)
Se recomienda implementar un campo `isArchived: Boolean` para permitir ocultar clientes con historial sin romper la integridad. Por ahora, el sistema simplemente bloqueará la acción destructiva con un mensaje claro.

## 4. CONTRATO TÉCNICO (Backend)
El `ClientService.delete` debe:
1. Verificar conteo de dependencias.
2. Si count > 0, devolver `{ ok: false, code: 'DEPENDENCIES_EXIST', message: '...' }`.
3. Si count == 0, ejecutar `prisma.client.delete`.

## 5. NOTAS DE UX
- El botón "Eliminar" en la UI debe mostrar un diálogo de confirmación que advierta sobre el borrado permanente.
- Si el borrado falla por dependencias, el toast debe ser informativo, no un error técnico críptico.
