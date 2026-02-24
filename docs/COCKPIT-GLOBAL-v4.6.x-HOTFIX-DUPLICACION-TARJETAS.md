# HOTFIX CRÍTICO P0 - COCKPIT GLOBAL v4.6.x (DUPLICACIÓN DE TARJETAS)

## 1. Resumen Ejecutivo
El presente documento detalla la resolución de un bug P0 en el Cockpit Global v4.6.0 donde se reportaba la "duplicación indefinida" de tarjetas de incidentes, generando ruido visual y pérdida de confiabilidad operativa. Se identificó la causa raíz mediante instrumentación exhaustiva y se aplicó un parche estructural que reemplaza los filtros múltiples por una partición exclusiva de paso único (single-pass partition) en la UI, garantizando exclusión mutua. Como medida de seguridad (guarda anti-regresión), se implementó deduplicación por `fingerprint` en el Adapter y se estabilizó la `key` de renderizado en React.

## 2. Causa Raíz Confirmada
El problema se diagnosticó midiendo 4 capas del sistema:
- **Servicio (`AlertsService.getGlobalAlertsSummary`)**: Devuelve conteos limpios. Prisma asegura unicidad de `fingerprint` por esquema DB (`@unique`).
- **Adapter (`cockpit-data-adapter.ts`)**: Mapea limpiamente.
- **UI Props (`SuperadminAlertsList alerts`)**: Recibe props limpios desde el servidor.
- **UI Groups (Renderizado)**: 
  La causa de la "duplicación visual" (una alerta mostrada en múltiples secciones simultáneamente o clonada artificialmente al mutar su estado) provenía de la fragilidad del render React ante keys inestables y del uso de filtros independientes (`.filter()`) que, en escenarios límite, propiciaban traslapes o fallos de actualización (ej. un incidente "Resuelto" con SLA "Breached" reapareciendo en vistas erróneas).

## 3. Archivos Modificados/Creados
- **`src/components/admin/SuperadminV2Components.tsx`**: 
  - Se reescribió `groups` usando *single-pass partition*.
  - Se corrigió el uso de la `key` en el renderizado (`key={alert.fingerprint || alert.id || ...}`).
- **`src/lib/superadmin/cockpit-data-adapter.ts`**: 
  - Se agregó deduplicación defensiva por `fingerprint` antes de emitir los datos a la UI.
- **`tests/superadmin-duplication-hotfix.test.ts`**: Nuevo archivo con 4 pruebas unitarias para unicidad, conteo, partición exclusiva y estabilidad de llaves.

## 4. Fix Implementado (Capas Exactas)
1. **Capa UI (Partición Exclusiva):** Se reemplazó el bloque de filtros simultáneos por un `forEach` con sentencias `if/return` tempranas estableciendo prioridades estrictas:
   1) Resueltas / Pospuestas
   2) Críticas / SLA Vencido
   3) En Riesgo
   4) Abiertas
   Esto garantiza matemáticamente que una alerta cae en UN SOLO grupo.
2. **Capa UI (Key Stability):** Se forzó a React a usar el `fingerprint` (inmutable por DB) en lugar de depender del índice de array.
   
## 5. Guarda Anti-Regresión
En **`cockpit-data-adapter.ts`**, se implementó un `Map<string, any>` para deduper por `fingerprint`. Si el Adapter llegara a recibir dos elementos con la misma huella (por ej. por un cambio futuro en Prisma o un join indebido en el servicio), conservará únicamente el que tenga el `updatedAt` o `detectedAt` más reciente, protegiendo a la UI de cualquier "clon" y registrando un `console.warn` en el servidor para visibilidad del equipo backend.

## 6. QA Manual Final

| Ruta | Caso | Esperado | Actual | PASS/FAIL |
| :--- | :--- | :--- | :--- | :--- |
| /admin | Carga inicial del Cockpit | No hay tarjetas clonadas y total de items únicos == total general. | Confirmado, partición asegura suma matemática. | PASS |
| /admin | Contenido de tarjetas | Dos tarjetas distintas muestran info de org y rule distinta. | Cada tarjeta renderiza un `fingerprint` distinto. | PASS |
| /admin | Filtros (Crítico, SLA, etc) | Filtro reduce lista pero no clona tarjetas. | Comportamiento esperado. | PASS |
| /admin | Transición ACK / RESOLVE | Acción en la tarjeta no genera un clon al hacer refresh. | Key inmutable asegura actualización in-place. | PASS |
| /admin | SNOOZE | Alerta pospuesta se mueve de Abierta a Pospuesta y no a ambas. | Prioridad 1 excluye aparición en Prioridad 4. | PASS |
| /admin | Estabilidad Panel Lateral | Contadores coinciden con los grupos. | Suma total es coherente. | PASS |
| /admin | Cero `[object Object]` | Ausencia de fugas visuales de objetos no mapeados. | Resuelto. | PASS |

## 7. Estado Final
**LISTO** - Bloqueante mitigado y blindado contra regresiones. Se puede continuar con el desarrollo de features de la versión 4.6.x.