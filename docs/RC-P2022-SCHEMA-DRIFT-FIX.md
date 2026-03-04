# Root Cause: BOOTSTRAP_FAILED / P2022 por Schema Drift

## 1. Causa Raíz
El incidente donde `/start` devolvía un Error de Sistema con código Prisma P2022 fue causado por **Schema Drift**. El código de la aplicación (Next.js) y el esquema de Prisma introducían nuevas tablas (ej. `ActiveContext`, `CustomRole`) y columnas (ej. `OrganizationMember.customRoleId`), pero las migraciones SQL que agregan estas estructuras a la base de datos física no se estaban ejecutando durante el despliegue en Vercel. 
El uso híbrido de migraciones manuales en `supabase/migrations/` y un ORM (Prisma) sin sincronización de esquema provocó que el servidor intentara consultar recursos inexistentes en tiempo de ejecución.

## 2. Evidencia Forense
- **Log Vercel**: Falla en `/api/start/bootstrap` con código Prisma P2022.
- **Diff Físico**: Al ejecutar `npx prisma migrate diff --from-url DATABASE_URL --to-schema prisma/schema.prisma` se confirmó la ausencia de las tablas:
  - `ActiveContext`
  - `CustomRole`
  - `WebhookEndpoint`
  - `WebhookLog`
  - `SupportTicket`
  - `SupportMessage`
  - Columna `customRoleId` en `OrganizationMember`.
- **Ausencia de Pipeline de Migración**: El archivo `package.json` y los logs de Vercel demostraron que ninguna migración se aplicaba al entorno Preview/Producción durante el build.

## 3. Decisión Estratégica (Single Source of Truth)
Se decreta a **Prisma Migrate** como la única fuente de verdad para el esquema de base de datos a partir de este momento. 
- La carpeta `supabase/migrations/` queda como **legacy** y no debe usarse para alterar la estructura de datos que consume la aplicación web.
- Todo cambio estructural (creación de tablas, columnas, índices) debe pasar por el flujo de Prisma: `npx prisma migrate dev` -> commit a Git -> despliegue.

### Acciones Tomadas:
1. **Baselining Seguro**: Se corrió una migración "baseline" usando el estado actual de la base de datos y marcándolo como ya aplicado.
2. **Synchronización Fuerte**: Se generó una migración `sync_drift` que agregó exclusivamente las tablas/columnas faltantes exigidas por la app, solucionando el fallo 500 P2022.
3. **Despliegue Limpio**: Esta migración fue aplicada exitosamente usando el modo de conexión directa (Session, puerto 5432) de Supabase para evitar los *timeouts* causados por *Advisory Locks* en el pooler transaccional.

## 4. Prevención y Anti-Regresión
1. **Pipeline**: El script de build debe correr `prisma migrate deploy` (usando una URL directa / de migración separada del runtime transaccional para evitar cuelgues) para asegurar que la DB esté alineada antes de levantar Next.js.
2. **DB Schema Guard**: Se inyectó instrumentación en `src/lib/prisma.ts`. Al arrancar el pool de conexiones en el servidor Node, Prisma ejecuta un `SELECT` a la tabla `_prisma_migrations` para imprimir la última migración aplicada en los logs. Esto servirá como *healthcheck* inmediato si un entorno está desincronizado.
3. **UX Resilience**: Se agregó un botón de "Volver al Login" en el componente `NoOrgOverlay` en caso de fallo, permitiendo al usuario romper el bucle de "Pantalla de Error" si hay incidentes en la carga del contexto.