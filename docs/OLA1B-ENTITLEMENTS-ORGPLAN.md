# OLA 1B: Corrección de Entitlements y orgPlan

## Problema Detectado (Causa Raíz)
En la Auditoría E2E posterior a la Ola 1, se detectó que los usuarios de organizaciones con planes de pago (PRO/ENTERPRISE) estaban siendo bloqueados por el `EntitlementGuard`. La causa raíz era que el `WorkspaceResolver` no estaba poblando la propiedad `orgPlan` en el objeto `WorkspaceState`, lo que causaba que `resolveEntitlements` asumiera el plan `FREE` por defecto para todas las organizaciones.

## Solución Implementada
Se ha refactorizado la resolución del estado del espacio de trabajo para asegurar que el plan de la organización se recupere de la base de datos de manera consistente.

### Cambios Clave:
1. **Actualización de Interfaz:** Se añadió `orgPlan?: string` a la interfaz `WorkspaceState` en `src/lib/auth/workspace-resolver.ts`.
2. **Fetch de Plan en Resolver:** En `getWorkspaceState`, cuando se identifica una organización activa (`activeOrgId`), ahora se realiza una consulta a la tabla `Organization` para obtener su plan actual (`plan`), junto con el estado de la suscripción.
3. **Propagación de Datos:** Se aseguró que el campo `orgPlan` se incluya en todos los retornos del resolver (`ORG_ACTIVE_SELECTED`, `ORG_MULTI_NO_SELECTION`, etc.).
4. **Enforcement Correcto:** Con el plan real disponible en el contexto, `resolveEntitlements` ahora otorga los permisos correctos (Catalog, Inventory, etc.) y el `EntitlementGuard` permite el acceso a usuarios PRO.

## Archivos Modificados
- `src/lib/auth/workspace-resolver.ts`

## Resultado
Los clientes PRO ahora tienen acceso legítimo a sus funcionalidades contratadas, mientras que el enforcement para usuarios FREE se mantiene robusto.
