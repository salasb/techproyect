# OLA 1B: Alineación de Tendencias Financieras

## Problema Detectado
Aunque los KPIs principales (Grandes números en el Dashboard) ya consumían `FinancialDomain`, los gráficos de tendencias (`Revenue Pulse`) y el listado de `Top Clients` seguían calculando valores sumando facturas brutas de forma manual. Esto generaba un riesgo de divergencia visual y lógica, especialmente en el manejo de impuestos y tasas de cambio.

## Solución Implementada
Se ha migrado la lógica de agregación en `DashboardService` para que utilice los snapshots de `FinancialDomain`, garantizando una única fuente de verdad en toda la pantalla.

### Cambios Clave:
1. **Unificación de Cálculo en Tendencias:** En `getFinancialTrends`, se reemplazó la lógica manual por el uso de `FinancialDomain.getProjectSnapshot()`. Esto asegura que los ingresos y costos reportados en el gráfico de líneas coincidan con la lógica de negocio de los proyectos (priorizando QuoteItems sobre presupuestos base).
2. **Corrección de Top Clients:** `getTopClients` ahora utiliza el snapshot del dominio para determinar el `totalInvoicedGross` de cada proyecto, alineando la distribución de ingresos por cliente con los totales de facturación reportados.
3. **Soporte Multi-Moneda en Charts:** Se introdujo el factor de conversión (`rate`) basado en la tasa del dólar (`dollarValue`) en los cálculos de tendencias y clientes, permitiendo que los gráficos reflejen valores normalizados si la organización opera en USD.

## Archivos Modificados
- `src/services/dashboardService.ts`
- `src/app/(dashboard)/dashboard/page.tsx`

## Resultado
Se ha eliminado la "fuga" de lógica financiera. Los gráficos y los KPIs del Dashboard ahora son 100% coherentes entre sí.
