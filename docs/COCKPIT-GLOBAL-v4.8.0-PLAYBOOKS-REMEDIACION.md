# Cockpit Global v4.8.0: Playbooks y Remediación Guiada

## Contrato de Playbook
El sistema de Playbooks transforma las alertas en flujos accionables. Cada regla (`ruleCode`) tiene asignado un procedimiento estandarizado.

### Tipos Canónicos
```typescript
export interface PlaybookStep {
  id: string;
  title: string;
  description?: string;
  actionType: "deeplink" | "serverAction" | "check";
  href?: string;
  actionId?: string;
  evidenceHint?: string;
  order: number;
}

export interface CockpitRulePlaybook {
  ruleCode: string;
  title: string;
  summary: string;
  defaultSlaPreset: "15m" | "1h" | "24h" | "72h";
  ownerRoleSuggested?: string;
  steps: PlaybookStep[];
}

export interface PlaybookProgress {
  subjectKey: string; // alertId o semanticKey
  completedStepIds: string[];
  updatedAt: string;
  updatedBy: string;
}
```

## Catálogo Inicial de Reglas (v1)
1. **BILLING_NOT_CONFIGURED**: Remediación de setup financiero. Link a `/settings/billing`.
2. **NO_ADMINS_ASSIGNED**: Recuperación de nodos huérfanos. Link a `/settings/team`.
3. **TRIAL_ENDING_SOON**: Flujo comercial de conversión. Link a `/settings/organization`.
4. **INACTIVE_ORG**: Prevención de Churn. Link a `/settings/organization`.
5. **WEBHOOK_FAILURE**: Resolución técnica de fallos de integración.

## UI y UX de Remediación
- **Botón Playbook**: Disponible en cada tarjeta (agrupada e individual).
- **Impacto de Grupo**: Al abrir desde un grupo, se muestra el conteo de orgs e incidentes afectados y un preview de los nombres.
- **Progreso**: Indicador visual del avance (ej: "2/5 pasos completados") con barra de progreso.
- **Trazabilidad**: Cada paso marcado registra el autor y la fecha.

## Auditoría y Eventos (v4.8.0)
- `OPEN_PLAYBOOK`: Registrado al abrir el drawer.
- `COMPLETE_STEP`: Registrado al marcar un paso como listo.
- `RESET_PROGRESS`: Registrado al limpiar el checklist o reabrir la alerta.
Cada evento incluye `traceId`, `actor` y `subjectKey`.
