# AUDITORÍA DE CONSISTENCIA COMERCIAL (v1.0)
Fecha: 17 de Marzo, 2026
Autor: Principal Product Engineer / TechProyect

## 1. INCONSISTENCIAS DETECTADAS Y CAUSA RAÍZ

### A. Dashboard: KPIs en $0
- **Causa Raíz:** El motor de KPIs (`DashboardService.getGlobalKPIs`) aplica un filtro temporal estricto de 30 días por defecto. Si la facturación ocurrió antes de ese periodo, el sistema muestra `$0` a pesar de tener proyectos con montos reales.
- **Solución:** Permitir la visualización acumulada (YTD o Histórico) por defecto o asegurar que el "Command Center" refleje la cartera total activa.

### B. Dashboard: "Siguiente Mejor Acción" Decorativa
- **Causa Raíz:** La recomendación de "Generar Cotización" se basa en un flag de onboarding (`FIRST_QUOTE_SENT`) que solo cambia cuando una cotización es marcada como enviada. No es contextual a los proyectos actuales.
- **Solución:** Derivar las acciones de proyectos reales que tengan estado `LEVANTAMIENTO` y 0 ítems o cotización no enviada.

### C. Flujo "Generar Cotización": Render Error
- **Causa Raíz:** La página `/projects/[id]/quote` y su componente `QuoteDocument` pueden estar recibiendo datos financieros nulos o tipos inconsistentes (ej. fechas como strings vs objetos Date) que disparan errores de hidratación o renderizado en el servidor.
- **Solución:** Sanitizar los inputs financieros antes de pasarlos a componentes de documento y asegurar que `calculateProjectFinancials` maneje fallbacks robustos.

## 2. CONTRATO FINAL DEL FLUJO COMERCIAL

1. **Dashboard:** Refleja la sumatoria de todos los proyectos activos, sin importar la fecha de creación, para dar visibilidad total de cartera.
2. **Acción Contextual:** Si el dashboard dice "Generar Cotización", debe proveer el link directo al proyecto que requiere la acción.
3. **Persistencia de Quote:** La visualización de cotización debe ser un reflejo exacto de los ítems del proyecto, sin excepciones de render.

## 3. CHECKLIST QA
- [ ] Dashboard: KPIs muestran montos acumulados reales.
- [ ] Dashboard: La acción sugerida incluye link al proyecto específico.
- [ ] Proyecto: "Generar Cotización" abre el documento sin error de Server Components.
