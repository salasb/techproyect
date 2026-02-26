# Cockpit Global v4.7.2.3: Remate de Confiabilidad y Unicidad Visual

## Resumen de Cambios
Esta actualización finaliza la estabilización del Cockpit Global, resolviendo problemas de duplicación visual y sincronizando el Centro de Notificaciones con el motor de alcances (scope).

### 1. Higiene Operacional Única (Tarea A)
- **Problema**: La tarjeta de aviso de higiene se repetía en el panel derecho bajo ciertas condiciones de re-renderizado.
- **Solución**: Se movió la lógica de renderizado de la `hygiene-card` desde el componente `SuperadminTriagePanel` directamente al layout `aside` de `src/app/admin/page.tsx`.
- **Garantía**: Al estar en el layout estructural de la página (fuera de componentes de datos), se garantiza su unicidad absoluta.
- **Test**: Actualizados los tests de integridad para validar que el componente de triage ya no la renderiza internamente.

### 2. Notificaciones con Scope y Dedupe (Tarea B)
- **Consistencia de Alcance**: El Centro de Notificaciones ahora respeta el `scopeMode` seleccionado (Solo producción / Producción + Trial / Diagnóstico). Si una organización está oculta por higiene, sus notificaciones también lo están.
- **Deduplicación Semántica**: Se implementó un motor de deduplicación en el servidor que agrupa notificaciones por `fingerprint` (Incidente), mostrando solo el evento más reciente.
- **Archivado Idempotente**: La acción de "Archivar" ahora marca como leídas **todas** las notificaciones unread asociadas al mismo incidente, evitando que duplicados antiguos aparezcan tras archivar el principal.
- **Capacidad**: Se aumentó el buffer de lectura inicial a 100 notificaciones para garantizar un listado útil tras el proceso de dedupe.

## Matriz de QA Final
| Componente | Respeto a Scope | Sin Duplicados | Estado |
| :--- | :--- | :--- | :--- |
| **KPIs Superiores** | Sí (Recalculado) | N/A | **PASS** |
| **Panel de Triage** | Sí (Único) | Sí | **PASS** |
| **Higiene Card** | Sí (Única en Aside) | Sí | **PASS** |
| **Notificaciones** | Sí (Deduplicadas) | Sí | **PASS** |
| **Directorio Orgs** | Sí | Sí | **PASS** |

**Estado Final: LISTO**
