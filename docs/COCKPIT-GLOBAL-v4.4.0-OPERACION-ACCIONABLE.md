# Cockpit Global - Fase 3.1: Operación Accionable (v4.4.0)

Esta fase transforma el Cockpit Global en una herramienta operativa real, con alertas accionables y trazabilidad de salud por organización.

## 1. Salud por Organización (OrgHealthBadgeModel)
Se ha implementado un sistema determinístico para derivar el estado de salud de cada organización sin modificar el esquema de la base de datos.
- **HEALTHY**: Operación normal con pagos al día y actividad reciente.
- **WARNING**: Riesgos detectados (trial por vencer, inactividad leve, falta de billing).
- **CRITICAL**: Bloqueos operativos (pagos vencidos, nodos huérfanos sin administradores, inactividad prolongada).
- **UX**: Cada fila en `/admin/orgs` muestra un badge de estado con las razones específicas (ej: "Nodo huérfano", "Pago PAST_DUE").

## 2. Alertas Accionables
El motor de alertas v4.4.0 ahora genera metadatos contextuales para cada hallazgo.
- **RuleCode**: Clasificación técnica de la regla (ej: `NO_ADMINS_ASSIGNED`).
- **Deep-links**: Cada alerta en el Dashboard y Centro de Notificaciones incluye un link "Ver contexto" o "Ver objeto" que dirige directamente a la entidad afectada en `/admin`.
- **Severidad**: Escala de `critical`, `warning`, `info` con colores y semántica coherente.

## 3. Evaluación de Salud con Feedback Real
La acción "Recalcular Salud" ha sido refactorizada para entregar un resumen operativo inmediato.
- **Resumen**: Cantidad de alertas creadas, actualizadas y resueltas.
- **Telemetría**: Retorno de `traceId`, `executedAt` y `durationMs`.
- **Block Dashboard**: Nueva tarjeta en el dashboard que recupera la última evaluación desde los logs de auditoría, mostrando cuándo se ejecutó y su resultado.

## 4. Contrato Operacional v4.4.0
Consolidación de tipos para toda la interfaz Superadmin.

### Alerta Operacional (`CockpitOperationalAlert`)
```ts
interface CockpitOperationalAlert {
  id: string;
  title: string;
  severity: "info" | "warning" | "critical";
  ruleCode: string;
  href?: string; // Deep-link operacional
  traceId: string;
}
```

## 5. QA Manual Real (Checklist v4.4.0)
| Ruta | Caso | Resultado Esperado | PASS/FAIL | Evidencia |
| :--- | :--- | :--- | :--- | :--- |
| `/admin` | Última Evaluación | Tarjeta muestra fecha y resumen del último run | **PASS** | Bloque visible con Trace ID |
| `/admin` | Alertas Accionables | Botón "Ver contexto" redirige a /admin/orgs/[id] | **PASS** | Redirección funcional |
| `/admin/orgs` | Badge de Salud | Badge dinámico (Riesgo/Crítico) según reglas | **PASS** | Razones visibles en Tooltip |
| `/admin/orgs` | Sin [object Object] | Cero fugas visuales en toda la tabla | **PASS** | Strings puros en toda la ruta |
| Action | Recalcular Salud | Toast con "Sincronización v4.4 Completa" | **PASS** | Data payload interpretado en Toast |

## 6. Qué NO se tocó
- No se realizaron migraciones de DB (se usó el campo `metadata` JSON existente en alertas).
- No se modificó el esquema de Prisma.
- No se tocaron flujos de onboarding ni billing core.
