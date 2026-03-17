# SANEAMIENTO CORE COMERCIAL (v1.0)
Fecha: 17 de Marzo, 2026
Estado: AUDITORÍA COMPLETADA - EN EJECUCIÓN

## 1. INVENTARIO DE RUPTURAS Y CAUSA RAÍZ

| Ruta / Acción | Causa Raíz Exacta | Capa Anterior | Capa Objetivo |
| :--- | :--- | :--- | :--- |
| `/invoices` | `permission denied` (Falta de grants en schema public para PostgREST) | Supabase SDK | **Prisma** |
| `/settings/team` | Excepción en render por OrgId nulo o Fallo de Sesión | Prisma (sin guards) | Prisma + Robust Error Handling |
| `/settings/org` | Excepción en render por OrgId nulo o Fallo de Sesión | Prisma (sin guards) | Prisma + Robust Error Handling |
| `/settings/billing`| Excepción en render por OrgId nulo o Fallo de Sesión | Prisma (sin guards) | Prisma + Robust Error Handling |
| `deleteProject` | `permission denied` (Supabase SDK intentando cascade manual en schema public) | Supabase SDK | **Prisma** |
| `saveProjectItem` | Inconsistencia de tipos / Fallo en PostgREST | Supabase SDK | **Prisma** |
| `saveProjectConfig`| Payload no serializable / Error en Server Components render | Mezcla Supabase/Prisma | **Prisma (Server Action)** |

## 2. REGLA DE ARQUITECTURA DEFINITIVA
- **Dominios Internos Críticos:** Facturas, Proyectos, Ítems, Settings.
- **Capa de Datos:** **Prisma** exclusivamente para operaciones server-side.
- **Prohibido:** Uso de `createClient()` de Supabase para consultas directas (`.from('Table')`) en rutas comerciales internas.
- **Manejo de Errores:** Ninguna página server-side debe lanzar una excepción cruda al renderizador de Next.js. Se implementará `safeRender` pattern.

## 3. CHECKLIST QA
- [ ] `/invoices` carga sin errores de esquema.
- [ ] `/settings/*` cargan estado controlado incluso sin organización activa.
- [ ] Eliminación de proyecto funciona (con cascada controlada en Prisma).
- [ ] Guardado de ítems es estable y trazable.
- [ ] Contexto "Ninguna" manejado de forma determinística.
