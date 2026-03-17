# SANEAMIENTO SETTINGS CORE (v1.0)
Fecha: 17 de Marzo, 2026
Estado: FINALIZADO - ESTABLE

## 1. INVENTARIO DE RUTAS Y CAUSA RAÍZ

| Ruta | Causa Raíz Exacta | Capa de Datos | Contexto |
| :--- | :--- | :--- | :--- |
| `/settings/team` | Dependencia de `getOrganizationId` (solo cookies) que fallaba en preview. Ahora usa el resolver canónico con fallback de DB. | Prisma (Vía Service) | Unificado (`resolveAccessContext`) |
| `/settings/organization` | Inconsistencia de resolución de contexto. Ahora unificado con el resto del sistema. | Prisma (Vía Service) | Unificado (`resolveAccessContext`) |
| `/settings/billing` | Mezcla de capas Supabase/Prisma. Ahora centralizado y protegido contra fallos de red del proveedor. | Mixta Protegida | Unificado (`resolveAccessContext`) |

## 2. ESTRATEGIA DE RESOLUCIÓN CANÓNICA

1. **Resolver Unificado:** Todas las páginas usan `resolveAccessContext()` como única fuente de verdad para Identidad + Organización.
2. **Manejo de Contexto "Ninguna":** Si `activeOrgId` es null, se muestra un bloqueador informativo (`NO_ACTIVE_ORG`) en lugar de permitir renderizados inconsistentes o errores de servidor.
3. **Capa de Datos Server-Only:** Se implementó `SettingsCoreService` para encapsular la lógica de negocio y base de datos, eliminando el uso directo de Supabase SDK en estas rutas.
4. **Manejo de Errores Semánticos:** Se añadieron estados controlados para:
   - `MISSING_CONTEXT`: Bloqueo por falta de org seleccionada.
   - `FORBIDDEN`: Bloqueo por falta de permisos (ADMIN/OWNER).
   - `NOT_FOUND`: Organización inexistente.

## 3. CHECKLIST QA
- [x] `/settings/team` carga correctamente con org activa.
- [x] `/settings/organization` carga correctamente con org activa.
- [x] `/settings/billing` carga correctamente con org activa.
- [x] Superadmin sin org ve bloqueo instructivo (`Trace ID` disponible).
- [x] Logs muestran traceId mapeado a errores reales en el servidor.
