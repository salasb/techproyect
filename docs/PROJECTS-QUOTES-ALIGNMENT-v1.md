# AUDITORÍA DE CONSISTENCIA: PROYECTOS Y COTIZACIONES (v1.0)
Fecha: 17 de Marzo, 2026
Autor: Principal Engineer / Arquitecto de Consistencia

## 1. INVENTARIO DE IDENTIFICADORES

- **Entidad Proyecto:** Usa un ID legible tipo `PRJ-YYMMDD-XXXX` como Clave Primaria (`@id`) en la base de datos.
- **Navegación:** Las rutas `/projects/[id]` y `/projects/[id]/quote` usan este código comercial.
- **Entidad Quote:** Usa un UUID autogenerado. Tiene una relación `projectId` que apunta al código comercial del proyecto.

## 2. ANÁLISIS DE RUPTURAS

### A. Fallo en `/projects/[id]/quote`
- **Causa Raíz:** La página usa el SDK de Supabase (PostgREST) para el fetch inicial del proyecto. Si existen desajustes en las políticas de RLS o si el identificador no se resuelve correctamente vía Supabase (por ser un string personalizado en lugar de UUID), la consulta retorna `null`.
- **Inconsistencia:** Mientras el detalle del proyecto (`/projects/[id]`) usa `resolveProjectAccess` (Prisma), la página de cotización usa `createClient` (Supabase). Esta mezcla de capas de datos causa fallos de visibilidad disparatados.

### B. Módulo `/quotes` Vacío
- **Causa Raíz:** El listado en `/quotes` consulta exclusivamente la tabla `Quote`.
- **Contrato Roto:** Los proyectos muestran botones de "Ver Cotización" basados en la existencia de `quoteItems` en la tabla `Project`, pero no necesariamente existe un registro en la tabla `Quote`. 
- **Efecto:** El usuario ve que el proyecto "tiene cotización" (porque hay ítems), pero el módulo de Cotizaciones no muestra nada porque no se ha "congelado" ninguna versión oficial en la tabla `Quote`.

## 3. CONTRATO CORREGIDO

1.  **Identificador Canónico:** El `id` del Proyecto (código comercial) es el único identificador para rutas.
2.  **Resolución Unificada:** Se migrará `QuotePage` para usar el resolver canónico `resolveProjectAccess` (Prisma), eliminando la dependencia del SDK de Supabase para lecturas de dominio.
3.  **Fuente de Verdad para Cotizaciones:** 
    -   Una cotización es una **proyección** de los ítems de un proyecto.
    -   Si no existe un registro en `Quote`, la página de cotización mostrará el **Borrador Vivo** (ítems actuales del proyecto).
    -   El módulo `/quotes` debe ser capaz de listar tanto cotizaciones persistidas (versiones) como proyectos que tengan un borrador activo.

## 4. REGLAS DE VISIBILIDAD
- Todo usuario con acceso al proyecto TIENE acceso a su cotización (borrador o versiones).
- No se permiten desajustes de RLS entre el detalle y la cotización.
