# Enforcement Real de Entitlements (v1)

## Problema Resuelto
El control de acceso basado en el plan contratado (`FREE`, `PRO`, etc.) era puramente estético: el `AppSidebar` ocultaba los enlaces a módulos no permitidos (como Inventario, Catálogo, Ubicaciones), pero cualquier usuario conociendo la URL (ej. `/catalog`) podía acceder y operar la funcionalidad. Esto representaba una vulnerabilidad comercial severa y un bypass del modelo de negocio.

## Solución Implementada
Se ha construido un `EntitlementGuard`, un Server Component (en `src/components/layout/EntitlementGuard.tsx`) encargado de proteger las rutas de manera absoluta en tiempo de renderizado de servidor.

### Arquitectura del Guard
- Aprovecha el ya existente `getWorkspaceState()` y `resolveEntitlements(workspace)` para verificar los módulos permitidos para la organización actual.
- Si el módulo solicitado (ej: `catalog`) no está en el arreglo `entitlements.visibleModules`:
  - Bloquea la renderización de la página hija.
  - Retorna un "Empty State" claro indicando "Módulo no incluido en tu plan" con un call-to-action hacia la sección de Billing (`/settings/billing`).
- Mantiene operativo el bypass para el "Superadmin Global" sin necesidad de lógica extra, ya que `resolveEntitlements` inyecta automáticamente todos los módulos si el usuario es superadmin.

### Rutas Protegidas
Se implementaron Layouts envolventes para las siguientes rutas de negocio que dependen de planes de pago:
- `/catalog` -> protegido mediante `src/app/(dashboard)/(org-required)/catalog/layout.tsx`
- `/inventory/scan` -> protegido mediante `src/app/(dashboard)/(org-required)/inventory/scan/layout.tsx`
- `/inventory/locations` -> protegido mediante componente directo en su `page.tsx`

### Resultado
Es matemáticamente imposible que un usuario de un plan `FREE` ingrese o visualice data de los módulos `PRO` mediante URL hacking.
