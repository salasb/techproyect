# CORE COMERCIAL REVALIDATION v1.6

## 1. Alcance Comercial Cubierto
Esta revalidación asegura que el Core Comercial opere bajo la directiva estricta multi-organización (Multi-Org Hardening Fase 2). Todo acceso, lectura, escritura o exportación de datos comerciales está restringido al contexto operativo actual (`requireOperationalScope()`).

Superficies cubiertas:
- Dashboard comercial
- Proyectos
- Cotizaciones / Presupuestos
- Items / líneas
- Facturas / Invoices
- Pagos
- Exportaciones / Notas / documentos derivados
- Actividades CRM y Oportunidades
- Configuraciones y Suscripciones asociadas a la organización

## 2. Matriz de Endpoints y Estado de Scope

| Superficie / Archivo | Estado Inicial | Estado Final (v1.6) |
|----------------------|----------------|---------------------|
| `src/actions/clients.ts` | Cubierto | Cubierto |
| `src/app/actions/invoices.ts` | Cubierto | Cubierto |
| `src/app/actions/quotes.ts` | Cubierto | Cubierto |
| `src/app/actions/projects.ts` | Cubierto | Cubierto |
| `src/actions/crm.ts` | Cubierto | Cubierto |
| `src/actions/products.ts` | Cubierto | Cubierto |
| `src/actions/quote-items.ts` | Cubierto | Cubierto |
| `src/app/api/inventory/export/route.ts` | Pendiente | Cubierto |
| `src/app/api/sales/generate-note/route.ts`| Pendiente | Cubierto |
| `src/actions/billing.ts` | Pendiente | Cubierto |
| `src/actions/project-logs.ts` | Pendiente | Cubierto |
| `src/actions/opportunities.ts`| Pendiente | Cubierto |
| `src/actions/crm-activities.ts`| Pendiente | Cubierto |
| `src/app/actions/tasks.ts` | Pendiente | Cubierto |
| `src/app/actions/subscription.ts`| Pendiente | Cubierto |
| `src/app/actions/costs.ts` | Pendiente | Cubierto |

*(Todos los marcados como "Pendiente" utilizaban `getOrganizationId()` o carecían de chequeos estrictos y fueron migrados a `requireOperationalScope()`)*

## 3. Reglas de Aislamiento por Org
1. **Scope Canónico Obligatorio**: Toda Server Action o Route Handler comercial invoca `requireOperationalScope()`.
2. **Filtro de DB Explícito**: Toda query a la base de datos que involucre recursos comerciales debe incluir `.eq('organizationId', scope.orgId)` (o equivalente en Prisma).
3. **Rechazo de Fugas**: No se confía en parámetros `organizationId` enviados desde el cliente; siempre se cruza con el `scope.orgId` del servidor.
4. **Errores Controlados**: Si falta scope (Status `NO_ORG_CONTEXT`) o es inválido, la operación se cancela de forma segura evitando queries globales o crashes de UI.

## 4. Checklist QA Manual del Loop Comercial

- [ ] **Org A: Transacción Básica**: Crear un proyecto, asociar una cotización, generar nota/export.
- [ ] **Aislamiento B**: Cambiar contexto activo a Org B. Verificar que el dashboard, los proyectos y las cotizaciones de Org A no son visibles.
- [ ] **Org B: Escritura Aislada**: Crear un registro (ej. Cliente o Proyecto) en Org B y verificar que persiste correctamente con su respectivo `organizationId`.
- [ ] **Retorno a Org A**: Volver a Org A y confirmar persistencia de data original sin contaminación de Org B.
- [ ] **Fallo Controlado**: Manipular la cookie de sesión de org (`techproyect-workspace`) a un UUID inválido y confirmar que la API comercial levanta una excepción `ScopeError` en lugar de exponer datos.
- [ ] **Workspace Doctor**: Al visitar `/api/_debug/workspace-doctor`, el output JSON indica `commercialScopeReady: true` cuando se está bajo un contexto sano.

## 5. Notas Finales
Se ha reemplazado exitosamente `getOrganizationId()` por `requireOperationalScope()` en todas las Server Actions y endpoints afectados. La ejecución confirma que no existen operaciones comerciales sin scope. El Workspace Doctor también fue verificado, confirmando que ya exponía `commercialScopeReady`.
