# AUDITORÍA COMERCIAL Y DE RENDIMIENTO (v1.0)
Fecha: 18 de Marzo, 2026
Autor: Principal Product Engineer / TechProyect

## 1. INCONSISTENCIAS DE DOMINIO Y CAUSA RAÍZ

### A. Cotizaciones: Redundancia "Borrador"
- **Causa Raíz:** La tarjeta de cotización muestra un `Badge` dinámico basado en si es un snapshot o un borrador vivo, y simultáneamente muestra un `StatusBadge` que lee el estado de la entidad. Para borradores, ambos canales de información coinciden, generando ruido visual.
- **Contrato UX:** Se debe priorizar el nombre del cliente y el monto, dejando un único indicador de estado claro.

### B. Reportes: Paneles en Cero
- **Causa Raíz:** 
    1. Uso del SDK de Supabase en Server Components, sujeto a fallos de RLS/permisos en Preview.
    2. Relaciones mal mapeadas (`company:Client(*)`) que fallan silenciosamente.
    3. Filtros excesivos en el frontend sobre datos ya incompletos.
- **Solución:** Migración total de los reportes financieros a **Prisma (Server-only)**.

### C. Vista Cotización: Caos en Header
- **Causa Raíz:** Falta de agrupación lógica. "Aceptación Digital" (switch de habilitación) compite visualmente con botones de acción directa como "Volver" o "Imprimir".
- **Diferenciación:**
    - `Aceptación Digital`: Activa la capacidad de que el cliente firme online.
    - `Aceptar`: Cambia el estado de la cotización internamente.

### D. Rendimiento: Latencia Percibida
- **Causa Raíz:** Consultas secuenciales pesadas y serializaciones redundantes.
- **Estrategia:** Paralelizar consultas con `Promise.all` y eliminar serializaciones manuales innecesarias mediante tipos planos.

## 2. CHECKLIST QA
- [ ] Cotizaciones: Tarjeta muestra un único estado.
- [ ] Reportes: Venta neta y proyecciones reflejan datos reales de Prisma.
- [ ] Header Quote: Agrupación Navegación | Estado | Configuración | Exportación.
- [ ] Dashboard: Carga más fluida por paralelización de servicios.
