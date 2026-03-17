# AUDITORÍA DE CONSISTENCIA COMERCIAL (v1.1)
Fecha: 17 de Marzo, 2026
Autor: Principal Product Engineer / TechProyect

## 1. INCONSISTENCIAS DETECTADAS

### A. Dashboard Stale (Onboarding Infinito)
- **Causa Raíz Exacta:** El Dashboard condiciona la visibilidad de la Guía de Activación a `realProjectsCount === 0`. Sin embargo, si la organización tiene proyectos en estados específicos (ej. ELIMINADOS o ARCHIVADOS) que Prisma cuenta pero el listado de Supabase no muestra, o si hay un desajuste de RLS, el Dashboard se confunde.
- **Fuente de Verdad Actual:** `prisma.project.count({ where: { organizationId: orgId } })`.
- **Fuente de Verdad Corregida:** Mantener Prisma pero asegurar que se cuentan solo proyectos **activos** y visibles para el usuario.

### B. Cotizaciones en $0
- **Causa Raíz Exacta:** El listado `/quotes` prioriza el valor persistido en la tabla `Quote` (`lastQuote.totalNet`). Si este registro se creó con valor 0 (fallo de persistencia inicial), el listado muestra `$0`. En cambio, el detalle del proyecto suma los ítems en tiempo de ejecución.
- **Fuente de Verdad Actual:** `Quote.totalNet` (persistido).
- **Fuente de Verdad Corregida:** Cálculo dinámico sumando `priceNet * quantity` de los ítems de la cotización, ignorando el campo `totalNet` de la cabecera si este es nulo o 0, para garantizar consistencia con el Proyecto.

## 2. CONTRATO FINAL POR DOMINIO

### Dashboard
- La Guía de Activación se colapsará automáticamente si existe al menos 1 proyecto.
- Se priorizarán los KPIs comerciales (`Invoiced`, `Margin`, `Receivable`).

### Quotes
- Una cotización NUNCA debe mostrar `$0` si tiene ítems asociados con precio.
- Se unificará el servicio de cálculo entre `ProjectDetail` y `QuotesPage`.

## 3. CHECKLIST QA
- [ ] Dashboard: Con proyectos reales, la guía no bloquea la vista de KPIs.
- [ ] Quotes: Registros con ítems muestran montos reales alineados con el proyecto.
- [ ] Consistencia: El monto en `/projects` y `/quotes` para el mismo ID es idéntico.
