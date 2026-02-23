# Cockpit Global - Fase 3.0: Operacional Real (v4.3.0)

Esta fase consolida el Cockpit Global como una herramienta de operación real, conectada a datos del ecosistema y con un motor de alertas determinístico.

## 1. Dataset Real por Bloques
Se ha refactorizado el `cockpit-data-adapter.ts` y los servicios asociados para consumir datos reales de la base de datos (vía Prisma).
- **KPIs**: Conteo real de organizaciones, alertas críticas, y riesgos de facturación.
- **Directorio**: Listado maestro con métricas de uso (usuarios, proyectos, actividad).
- **Resiliencia**: Cada bloque opera con aislamiento total. Un fallo en el motor de métricas no impide la visualización del directorio de empresas.

## 2. Motor de Alertas Operacionales (Deterministic)
Se han implementado reglas de negocio explícitas para la generación de alertas en `AlertsService.runAlertsEvaluation()`:
- **BILLING_PAST_DUE (CRITICAL)**: Organizaciones con pagos vencidos o fallidos.
- **NO_ADMINS_ASSIGNED (CRITICAL)**: Organizaciones sin miembros (nodos huérfanos).
- **PENDING_ACTIVATION_STALE (WARNING)**: Organizaciones estancadas en `PENDING` por más de 48h.
- **TRIAL_ENDING_SOON (WARNING)**: Periodos de prueba con menos de 72h de vigencia.
- **INACTIVE_PRO_ORG (INFO)**: Clientes de pago sin actividad registrada en los últimos 3 días.

## 3. Contrato Operacional v4.3.0
Consolidación de los tipos de retorno para garantizar consistencia en toda la plataforma Superadmin.

### Lectura de Bloques (`OperationalBlockResult`)
- **Status**: `ok`, `empty`, `degraded_config`, `degraded_service`.
- **TraceId**: Incluido en los metadatos para correlación de logs en Sentry/CloudWatch.

### Acciones del Servidor (`OperationalActionResult`)
- **Feedback Limpio**: Los Toasts ahora interpretan el código de error (`UNAUTHORIZED`, `PREVIEW_LOCKED`, etc.) para mostrar mensajes humanos.
- **Trazabilidad**: Cada acción genera un `traceId` único (ej: `RECALC-XXXX`, `SET-XXXX`).

## 4. Hardening de UI y Subpáginas
- **TraceId Visible**: Los banners de error muestran el Diagnostic ID para soporte técnico.
- **Safe Mode**: Mensajes claros cuando falta la `SUPABASE_SERVICE_ROLE_KEY`.
- **Cero fugas técnicos**: Eliminación total de interpolaciones de objetos en el DOM.

## 5. QA Manual Real (Checklist v4.3.0)
| Ruta | Caso | Resultado Esperado | PASS/FAIL |
| :--- | :--- | :--- | :--- |
| `/admin` | Dashboard Resiliente | Carga parcial si falla un bloque | **PASS** |
| `/admin/orgs` | Datos Reales | Muestra conteos reales de miembros/proyectos | **PASS** |
| `/admin/users` | Sin [object Object] | Banners de error en string puro | **PASS** |
| `/admin/settings`| Preview Lock | Bloqueo explícito en entornos Preview | **PASS** |
| Action | Recalcular Salud | Toast con resumen de alertas v4.3 | **PASS** |

## 6. Qué NO se tocó
- No se realizaron migraciones de base de datos.
- No se modificó el flujo de Auth Global.
- No se tocaron los webhooks de Stripe.
- No se modificaron componentes fuera del directorio `/admin`.
