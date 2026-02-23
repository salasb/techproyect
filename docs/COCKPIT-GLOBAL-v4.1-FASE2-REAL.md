# Cockpit Global v4.1 - Real Hardening & Fase 2

Este documento detalla la arquitectura de endurecimiento (**hardening**) implementada en la Fase 2 del Cockpit Global (`/admin`), enfocada en la resiliencia de datos, la normalización de errores y la operatividad real multi-tenant.

## 1. Contrato Operacional Unificado

Todas las operaciones de datos y acciones del servidor siguen ahora un contrato estricto para evitar filtraciones de errores técnicos (como `[object Object]`) a la interfaz de usuario.

### Bloques de Datos (`OperationalBlockResult<T>`)
- **`status`**: `ok` | `empty` | `degraded_config` | `degraded_service`.
- **`data`**: Payload tipado del bloque.
- **`message`**: Siempre un string amigable para el usuario.
- **`code`**: Identificador técnico para logs (ej. `MISSING_ADMIN_CONFIG`).
- **`meta`**: Telemetría (duración, conteo de filas, fuente).

### Acciones del Servidor (`OperationalActionResult<T>`)
- **`ok`**: Boolean de éxito.
- **`code`**: `OK` | `UNAUTHORIZED` | `DEGRADED_CONFIG` | `PREVIEW_LOCKED` | `SERVICE_ERROR`.
- **`message`**: Descripción útil para toasters/notificaciones.

## 2. Normalización de Errores

Se ha implementado `error-normalizer.ts` para interceptar cualquier excepción (Supabase, Prisma, Error nativo) y transformarla en un mensaje legible y un código trazable. **Queda prohibido mostrar objetos crudos en la UI.**

## 3. Comportamiento Preview vs Production

### Entorno Preview / Development
- **Gobernanza:** El botón "Aplicar Cambios Maestros" en `/admin/settings` está bloqueado por diseño.
- **UX:** Se muestra un mensaje explícito: *"Edición bloqueada: Entorno de Preview / Dev"*.
- **Acciones:** Intentar ejecutar acciones de escritura devolverá `PREVIEW_LOCKED`.

### Entorno Production
- **Gobernanza:** Funcionalidad completa permitida para usuarios en la `SUPERADMIN_ALLOWLIST`.
- **Modo:** Cambia automáticamente a `Operational` cuando se detecta la `SERVICE_ROLE_KEY`.

## 4. Checklist de Validación (QA)

| Ruta | Verificación | Resultado |
| :--- | :--- | :--- |
| `/admin` | Shell única, sin duplicados de sidebar/header. | **PASS** |
| `/admin/orgs` | Tabla renderiza o muestra placeholder sin `[object Object]`. | **PASS** |
| `/admin/settings` | Lectura OK, botón bloqueado en Preview con mensaje claro. | **PASS** |
| `Recalcular Salud` | Toast informa estado (Éxito o Safe Mode) correctamente. | **PASS** |

## 5. Riesgos Pendientes
1.  **Sincronización masiva:** La carga de >1000 organizaciones requiere paginación en el adapter.
2.  **Webhooks Monitoring:** Visualización de la cola de eventos de Stripe pendiente para Fase 3.

---
**TechWise Engineering** - v4.1 2026 - Operational Ready
