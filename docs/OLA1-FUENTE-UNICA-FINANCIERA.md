# OLA 1: Fuente Única Financiera (Financial Single Source of Truth)

## Problema Resuelto
Previamente, el sistema calculaba los valores financieros de un proyecto (venta, margen, costos) de manera dispersa:
- El `Dashboard` sumaba facturas directamente para obtener el revenue.
- La lista de `Projects` y la vista de detalle usaban `calculateProjectFinancials` importado de un utility y lo recalculaban on-the-fly.
- La exportación CSV y Reportes usaban variaciones de estas lógicas.
Esto resultaba en discrepancias ("Doble o Triple Fuente de Verdad") donde un mismo proyecto mostraba valores distintos dependiendo de la pantalla.

## Solución Implementada (Domain-Driven)
Se ha consolidado **toda** la lógica de cálculo financiero comercial en un único servicio: `FinancialDomain` (ubicado en `src/services/financialDomain.ts`). 

### Cambios Clave:
1. **Deprecación de llamadas locales:** Se han reemplazado todas las importaciones directas de `calculateProjectFinancials` en la UI y las acciones de exportación, forzando a todo el sistema a pasar por `FinancialDomain.getProjectSnapshot()`.
2. **Jerarquía de Valor:** `FinancialDomain` respeta el contrato comercial: si un proyecto tiene `quoteItems` (detalle de cotización), esa es la fuente absoluta del valor de venta. Si no tiene, se usa el `budgetNet` referencial del proyecto.
3. **Archivos Refactorizados:**
   - `src/services/dashboardService.ts`
   - `src/actions/exports.ts`
   - `src/components/projects/ProjectTable.tsx`
   - `src/components/projects/QuoteDocument.tsx`
   - `src/services/riskEngine.ts`
   - `src/services/projectFinancials.ts`
   - `src/app/api/projects/export/route.ts`
   - `src/app/(dashboard)/(org-required)/projects/page.tsx`

### Resultado Esperado
Un proyecto, sin importar desde dónde se consulte (Dashboard, Lista de Proyectos, Detalle, CSV exportado, Documento PDF de la Cotización), siempre mostrará exactamente el mismo Net Price, Gross Price y Margen. No hay recálculo en componentes de React, todo viene del dominio.
