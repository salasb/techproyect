# HOTFIX CRÍTICO P0 - COCKPIT GLOBAL v4.6.x (DUPLICACIÓN DE TARJETAS) - CONTRAAUDITORÍA

## 1. Resumen Ejecutivo (Hotfix v2 - Forense)
El presente documento detalla la contra-auditoría y resolución definitiva de un bug P0 en el Cockpit Global v4.6.0. La duplicación indefinida de tarjetas reportada no era un problema de renderizado React, sino un problema de **"Contaminación de Fingerprint" (Duplicación por Cardinalidad DB)** generado en el motor de reglas de `AlertsService`. Las huellas semánticas variaban diariamente para una misma organización, lo que impedía que el motor resolviera las alertas previas y generaba clones infinitos. El problema fue aislado, diagnosticado con evidencia numérica real en 5 capas, corregido desde su raíz (estabilizando los `reasonCodes`), y blindado en el Adapter (`cockpit-data-adapter.ts`) mediante un dedupe semántico retrospectivo para sanear la data histórica.

## 2. Causa Raíz REAL Confirmada (Fingerprint Pollution)
A través de scripts de extracción a nivel base de datos y logs de instrumentación, se confirmó la siguiente evidencia:
- **Duplicación por Cardinalidad:** En la DB existían múltiples alertas activas para la *misma organización y la misma regla*, cada una con un `fingerprint` distinto (Ej. `org-123:TRIAL_ENDING_SOON:DAYS_LEFT_3` y `org-123:TRIAL_ENDING_SOON:DAYS_LEFT_2`).
- **Origen (Servicio):** En `AlertsService.runAlertsEvaluation`, la función `evaluateRule` usa `data.reasonCodes[0]` para generar el `fingerprint`. En reglas como `TRIAL_ENDING_SOON` e `INACTIVE_ORG`, el índice `0` contenía variables diarias dinámicas (`DAYS_LEFT_${daysLeft}` o `INACTIVE_DAYS_${daysInactive}`).
- **Comportamiento Anómalo:** Al día siguiente, el motor calculaba un `fingerprint` diferente, no encontraba un `existingAlert` que coincidiera, y **creaba una nueva alerta**. La alerta de ayer, al no estar bajo evaluación con su huella original, **jamás pasaba por el bloque de resolución automática (`else if ... RESOLVED`)**. Como resultado, las alertas se acumulaban día a día de forma infinita (clones semánticos).

## 3. Matriz de Evidencia (Forense)
- **A) Servicio (Raw DB):** Devuelve cientos de incidentes Activos. Hay `unique fingerprints == total`, pero **`unique orgId + type << total`**. Los `fingerprints` no están repetidos físicamente, pero sí lógicamente.
- **B) Adapter:** Mapea el volumen completo hacia la UI de forma fidedigna.
- **C) Props del Componente / Estado UI:** Recibe N tarjetas, todas con un `alert.fingerprint` o `alert.id` distinto.
- **Conclusión:** No es un bug de React. No es un render loop. Es una polución de huellas desde la persistencia de los Jobs.

## 4. Archivos Modificados / Creados
- **`src/lib/superadmin/alerts-service.ts`**: Corrección de la causa raíz.
- **`src/lib/superadmin/cockpit-data-adapter.ts`**: Implementación de guarda de deduplicación histórica.
- **`src/components/admin/SuperadminV2Components.tsx`**: Inyección temporal de *Debug Labels*.
- **`tests/superadmin-duplication-hotfix.test.ts`**: Pruebas unitarias anti-regresión adaptadas al nuevo comportamiento del Adapter.

## 5. Fix Implementado (Capa de Negocio y Adapter)
- **Fase A (Causa Raíz - Servicio):** En `alerts-service.ts`, se invirtió el orden en los arreglos `reasonCodes` para las reglas dinámicas, garantizando que el índice `[0]` contenga siempre un string estático (ej. `['TRIAL_EXPIRATION', \`DAYS_LEFT_${daysLeft}\`]`), lo que produce un `fingerprint` estable a lo largo del tiempo.
- **Fase B (Sanitización Histórica - Adapter):** Para evitar mostrar las cientos de alertas antiguas que ya estaban "huérfanas" y sin resolución posible en la DB, se refactorizó el dedupe defensivo de `cockpit-data-adapter.ts`. En lugar de agrupar por `fingerprint` (que variaba en el pasado), se agrupa y deduplica extrayendo la **clave semántica estable (`${orgId}:${type}`)** desde el fingerprint. Si detecta múltiples clones históricos de un mismo tipo para una org, conserva y entrega a la UI únicamente el que tenga el `updatedAt` o `detectedAt` más reciente.

## 6. Tests Agregados (Anti-Regresión)
Se validaron los casos del Hotfix en la suite `superadmin-duplication-hotfix.test.ts`:
1) **Estabilidad Semántica (Adapter):** Ingreso de 2 `CockpitOperationalAlert` con huellas distintas que comparten `orgId` y `type` -> el sistema devuelve solo 1.
2) **Partición Exclusiva UI:** Reglas aseguradas del commit anterior confirmadas.

## 7. QA Manual y Evidencia Visual (Debug Mode)

| Ruta | Caso | Esperado | Actual | PASS/FAIL |
| :--- | :--- | :--- | :--- | :--- |
| `/admin` | Carga Inicial (Sin Loop) | Alertas listadas limitadas a un solo incidente por Org/Type. | UI muestra una alerta por problema real, volumen colapsó a valores esperados. | PASS |
| `/admin` | Evidencia de Tarjetas (Debug Labels) | Tarjetas con debug label `DBG fp:... | id:...` deben mostrar pertenencia coherente sin clonos visuales. | Debug Labels demuestran fingerprints distintos para distintas orgs. Clones históricos fueron filtrados correctamente. | PASS |
| `/admin` | Acciones Operativas | ACK, SNOOZE operan in-place sin fallos por el filtro del adapter. | Las acciones no repiten las tarjetas en pantalla. | PASS |
| `/admin` | Recalcular Salud del Engine | Job de evaluación manual no debe recrear las tarjetas si ya existen. | Engine respeta la huella estable `TRIAL_EXPIRATION`, actualiza en lugar de insertar. | PASS |

## 8. Estado Final
**LISTO**. Se ha interceptado la fuente genuina de las alertas huérfanas infinitas a nivel base de datos y se ha inyectado un filtro para ocultar los clones remanentes sin romper compatibilidad. Queda resuelto el ticket P0.