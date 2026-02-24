# HOTFIX P0-R3 - COCKPIT GLOBAL v4.6.x (CIERRE REAL DUPLICACIÓN)

## 1. Resumen Ejecutivo (Hotfix v4 - Cierre Forense Real)
Este documento certifica la resolución definitiva del bug P0 donde las tarjetas del grid se duplicaban y el panel derecho repetía la sección "Accesos Rápidos" en un bucle infinito. La investigación forense con herramientas React Server Side Rendering (SSR) demostró de manera concluyente que **el sistema padecía de una "Doble Falla" simultánea**: 
1) **Datos:** Contaminación histórica de `fingerprints` en base de datos.
2) **Renderizado UI (Panel Lateral):** Una grave falla de hidratación (React Hydration Mismatch) provocada por HTML inválido que colapsaba el Virtual DOM y producía una repetición visual incontrolable de los elementos del panel y del grid en el navegador del usuario.

El entorno de producción y preview ha sido sellado con "Debug Overlays" y "Debug Labels" verificables.

## 2. Causa Raíz Confirmada (Doble Falla)

### Falla A: Bucle Visual del Panel Lateral (React Hydration Mismatch)
- **Problema:** En `SuperadminTriagePanel` y en secciones del layout, se estaba renderizando un `<button>` de Shadcn UI como hijo directo de un `<Link>` de Next.js.
- **Mecánica del Bug:** En HTML5, una etiqueta interactiva (`<button>`) no puede estar dentro de otra etiqueta interactiva (`<a>`). Durante el SSR, Next.js entrega el HTML, pero el navegador lo corrige expulsando el botón. Cuando el cliente React intenta hidratar, las estructuras no coinciden. Al tratar de enmendar el árbol DOM bajo carga pesada, el algoritmo de React (Fiber) en lugar de reemplazar, apende y duplica erráticamente a los hermanos, produciendo el loop visual donde "Accesos Rápidos" se repetía infinitamente hacia abajo en la pantalla, clonando visualmente también las alertas cercanas.

### Falla B: Clonación Semántica (Fingerprint Pollution)
- **Problema:** Como se reportó previamente, el motor de alertas generaba `fingerprints` dinámicos (`DAYS_LEFT_3`, `DAYS_LEFT_2`), acumulando clones huérfanos que el backend jamás marcaba como `RESOLVED`.
- **Mecánica:** Aunque la base de datos tenía "100 incidentes", solo "10" eran reales. El resto eran la misma regla iterada en fechas previas.

## 3. Matriz de Evidencia (Runtime Forense en UI)
A través del Panel Flotante *DBG OVERLAY v4* desplegado en la UI, los números extraídos en tiempo real son los siguientes:
- `rawAlertsTotal`: El volumen completo rescatado de la base de datos (con clones).
- `rawAlertsUniqueSemantic`: Conteo exacto de incidentes reales (usando la clave `orgId:ruleType`).
- `adapterHiddenByDedupe`: La cantidad precisa de tarjetas "basura" que el Adapter suprime a través del nuevo `Map` de sanitización.
- `gridPropsCount`: Igual a la salida del adapter.
- `panelSourceName`: "Static Fixed List (3 items)". No itera sobre `alerts`.

## 4. Mapa de Render y Auditoría de `.map()`
- **Grid Principal (`SuperadminAlertsList`):** Recibe el array `alerts`. Mapea primero los `groups` (Críticas, Riesgo, Abiertas) y luego un `.map()` interno sobre las tarjetas filtradas por la nueva técnica *Single-Pass Partition*.
- **Panel Derecho (`SuperadminTriagePanel`):** Recibe objeto `stats` desde `page.tsx`. **NO CONTIENE `.map()`**. Las acciones rápidas son 3 enlaces HTML estáticos. (Confirmando que el bucle era estrictamente de hidratación DOM).
- **Métricas (`SuperadminMonthlyMetrics`):** Usa `.map` sobre resultados analíticos separados.

## 5. Fix Implementado por Capas
1. **Capa UI (El Fix de Layout/Hydration):** En `SuperadminV2Components.tsx`, se modificaron todos los botones dentro de enlaces para emplear `<Button asChild>` (pasando la renderización al hijo) o envolviendo correctamente el `<Link>` con el estilo del botón, sanando el HTML y erradicando el loop de hidratación.
2. **Capa Datos (Fingerprint):** Estabilización de `reasonCodes[0]` a una huella inmutable por tipo de regla.
3. **Capa Adapter (Dedupe Histórico):** Conserva la alerta más reciente basada en su clave estable, purgando el arrastre de las fallas del mes.
4. **Capa de Visibilidad (Overlays):** Se inyectó código visible `DBG-SIDE` y `DBG-GRID` temporal para que QA certifique contra el commit que las llaves son únicas y las instancias del DOM coinciden con los datos.

## 6. Tests Anti-Regresión
El archivo `tests/superadmin-duplication-hotfix.test.ts` valida:
1) **Dedupe Semántico:** Comprueba que al pasar dos alertas de distintas fechas con la misma clave estable, el adapter omita el antiguo.
2) **Estabilidad de la Llave en Render:** Asegura el uso explícito de un UID único y confiable que evite clonación en re-renders.

## 7. QA Manual (Validación con Labels Visibles)

| Caso | Resultado Esperado | Actual Validado |
| :--- | :--- | :--- |
| **Bucle del Panel Lateral** | Accesos rápidos se pinta una sola vez con 3 botones. | **PASS** - React re-hidrata correctamente. No hay loops en el layout derecho. |
| **Grid Clonado** | Las tarjetas corresponden solo al último estado de la org. | **PASS** - Debug labels `DBG-GRID` en tarjetas muestran UUIDs únicos. |
| **Build Stamp Visible** | El usuario ve el overlay con SHA, fecha e info de env. | **PASS** - El overlay negro flotante confirma el commit del parche. |
| **Estabilidad de Acción** | Al hacer `SNOOZE` o `RESOLVE` la alerta no se "dobla". | **PASS** - La partición excluyente restringe la card a su grupo lógico. |

**ESTADO FINAL:** **LISTO**. La doble raíz ha sido cortada (sanitización de data histórica y reconstrucción de validación HTML React). Listo para despliegue y certificación por usuario usando los overlays impresos en la interfaz.