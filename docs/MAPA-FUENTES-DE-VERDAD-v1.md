# Mapa de Fuentes de Verdad - TechProyect (v1.0)

## Diagnóstico de Verdad y Coherencia

| Dominio | Fuente de Verdad Esperada | Fuente Real Actual | Riesgo | Severidad |
| :--- | :--- | :--- | :--- | :--- |
| **Identidad Usuario** | AccessContext (v3.0) | Mezcla de AccessContext y WorkspaceState | Bypass de superadmin fallido | S0 |
| **Contexto Org Activa** | ORG_CONTEXT_COOKIE | Cookie + Prisma ActiveContext | Desalineación en Vercel Preview | S1 |
| **Márgenes Financieros** | financialCalculator.ts | Recalculado en DashboardService | Números distintos en Dashboard vs Reportes | S1 |
| **Estado Cotización** | Quote.status (Prisma) | Quote.status + Project.quoteSentDate | Doble etiqueta de estado en UI | S2 |
| **Entitlements (EBAC)** | entitlements.ts | Roles de RBAC en SidebarContent | Módulos visibles que el plan no permite | S2 |
| **Configuración (IVA/FX)** | settings-core-service.ts | Constants.ts + Inline Hardcodes | Cálculos erróneos por falta de surcharge | S1 |

---

## Análisis de Duplicación y Fragmentación

### 1. El Dilema de la Identidad
El sistema tiene tres capas de resolución que compiten:
1.  `session-resolver.ts`: Nivel bajo (Auth).
2.  `workspace-resolver.ts`: Nivel medio (Tenant).
3.  `access-resolver.ts`: Nivel alto (Identity + Precedence).
**Problema:** El Shell (Header/Sidebar) usa `WorkspaceState` que a veces no tiene la data de `AccessContext` (v3), causando que el superadmin sea tratado como trial.

### 2. Lógica Comercial Distribuida
El cálculo de "Venta Neta" y "Margen" no reside en una única función de dominio.
- El Dashboard itera proyectos y aplica reglas de `calculateProjectFinancials`.
- Los Reportes hacen lo mismo pero con filtros distintos.
- Las Cotizaciones a veces usan el `totalNet` del snapshot y otras veces el cálculo vivo.

### 3. Estados de Inventario
El módulo de Inventario parece estar bien aislado en `inventory-service.ts`, pero su visibilidad en el Sidebar está acoplada al permiso `INVENTORY_MANAGE` en lugar de estar acoplada al Plan de la organización.
