# AUDITORÍA DE RENDIMIENTO Y FINANZAS (v1.0)
Fecha: 18 de Marzo, 2026
Autor: Principal Product Engineer

## 1. REGISTRO DE COSTOS: CAUSA RAÍZ
- **Problema:** Fallo al agregar costo en la pestaña de Finanzas.
- **Causa Raíz:** Uso del SDK de Supabase (PostgREST) en la Server Action `addCost`. En entornos de Preview, las restricciones de integridad y falta de permisos explícitos en el esquema `public` para operaciones de escritura financieras causaban rechazos silenciosos o errores 400.
- **Solución:** Migración completa a **Prisma (Server-only)**. Ahora la acción utiliza privilegios de base de datos directos, asegurando transacciones estables y un manejo de errores semántico.

## 2. RENDIMIENTO DEL DASHBOARD
- **Cuellos de Botella:**
    1. Consultas secuenciales pesadas al SDK de Supabase.
    2. Timeouts artificiales de 6s que forzaban estados vacíos.
    3. Renderizado de componentes grandes ("Estado General") que empujaban el resto del contenido.
- **Optimizaciones Aplicadas:**
    - Unificación de carga en **Prisma** con `Promise.all` para paralelización total.
    - Eliminación de timeouts de red innecesarios en el servidor.
    - Rediseño de la jerarquía visual para priorizar KPIs comerciales sobre bloques decorativos.

## 3. REDISEÑO DE COMPONENTES
- **Tarjeta de Salud:** Reducida en un 60% de su peso visual original. Ahora es un widget secundario compacto integrado en el flujo de acciones.
- **Revenue Pulse:** Se implementó un gráfico de evolución comercial que utiliza datos reales de ingresos y costos agregados por período.

## 4. CHECKLIST QA
- [x] Agregar costo: Funciona correctamente y refresca totales.
- [x] Eliminar costo: Funciona y actualiza proyecciones.
- [x] Dashboard: Tiempo de carga reducido (Server Side Rendering optimizado).
- [x] UX: Sin scroll horizontal global en detalle de proyecto.
- [x] Gráfico: Visible y veraz en el Dashboard principal.
