# Cockpit Global v4.7.2.3: Remate Final de Consistencia

## Resumen de Cambios
Esta actualización cierra las últimas inconsistencias visuales y operacionales detectadas tras la implementación de la Agrupación Operativa.

### 1. Higiene Operacional Única
- **Problema**: La tarjeta de aviso de higiene se repetía en el panel derecho.
- **Solución**: Se centralizó el renderizado en `SuperadminTriagePanel`, eliminando cualquier duplicado en las secciones del grid.
- **Verificación**: Test unitario (`cockpit-ui-hardening.test.tsx`) valida que siempre existe exactamente 1 instancia de `hygiene-card`.

### 2. Centro de Notificaciones con Scope
- **Problema**: Las notificaciones mezclaban datos de producción con Test/Demo y presentaban entradas duplicadas.
- **Solución**: 
  - El motor de notificaciones ahora respeta el `scopeMode` activo (Solo producción / Diagnóstico).
  - Se implementó un **Dedupe Semántico** por `alert.fingerprint` para mostrar solo el evento más reciente por incidente.
  - Se añadió el nombre de la organización a cada entrada para dar contexto inmediato.
- **UI**: En modo diagnóstico, el panel se etiqueta explícitamente como "Notificaciones (diagnóstico)".

### 3. Consistencia de Orgs Afectadas
- **Problema**: El KPI de organizaciones afectadas mostraba 0 erróneamente.
- **Solución**: El conteo ahora se deriva del dataset filtrado en el servidor, asegurando coherencia matemática: `Total = Visibles + Ocultos`.

## QA Final
| Caso | Resultado Esperado | Resultado Actual |
| :--- | :--- | :--- |
| Tarjeta Higiene | Única en el panel derecho | **PASS** |
| Notificaciones | Filtradas por Scope + Sin duplicados | **PASS** |
| KPI Orgs | > 0 si hay incidentes abiertos | **PASS** |
| Coherencia | KPIs superiores == Grid == Triage | **PASS** |
