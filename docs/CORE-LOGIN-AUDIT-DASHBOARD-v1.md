# AUDITORÍA DE CONSISTENCIA CORE (v1.0)
Fecha: 17 de Marzo, 2026
Autor: Principal Product Engineer / TechProyect

## 1. INCONSISTENCIAS DETECTADAS Y CAUSA RAÍZ

### A. Login: Contraseña Invisible
- **Causa Raíz:** Falta de clases de color de texto explícitas en el componente `LoginForm.tsx`. Al usar fondos oscuros (`dark:bg-zinc-950`), el texto heredado no tiene suficiente contraste, haciendo que los caracteres (enmascarados o no) sean imperceptibles.
- **Solución:** Aplicar `text-foreground` o `dark:text-white` de forma explícita.

### B. Auditoría Financiera: Render Error
- **Causa Raíz:** La Server Action `performFinancialAudit` utiliza el SDK de Supabase (PostgREST). En entornos de Preview, las tablas de costos e ítems suelen tener restricciones de esquema `public` que disparan errores de "permission denied". Al ser una excepción no controlada dentro de un flujo de datos, rompe el renderizado del componente.
- **Solución:** Migrar la acción a **Prisma** para lectura directa con privilegios de servidor.

### C. Dashboard: KPIs en $0
- **Causa Raíz:** Fragmentación de la capa de datos. Mientras el listado de proyectos usa Prisma, el Dashboard sigue usando el SDK de Supabase con un timeout agresivo de 6s. Si la query falla o expira, los KPIs reciben un array vacío.
- **Solución:** Unificar la carga de datos del Dashboard en **Prisma**. Eliminar el timeout artificial y asegurar que los agregados financieros usen la misma fuente que el detalle del proyecto.

## 2. CONTRATO FINAL

### Fuente de Verdad
- **Identidad:** Supabase Auth.
- **Datos de Negocio (KPIs, Auditoría, Listados):** Prisma (Server-only).

## 3. CHECKLIST QA
- [ ] Login: El texto de la contraseña es visible al escribir (dots).
- [ ] Auditoría: El botón "Ejecutar Auditoría" entrega resultados sin crashear.
- [ ] Dashboard: Los montos facturados y márgenes no son $0 si existen proyectos.
