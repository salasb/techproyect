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
1. **BILLING_NOT_CONFIGURED**: Remediación de setup financiero. Incluye deeplink a configuración de la org.
2. **NO_ADMINS_ASSIGNED**: Recuperación de nodos huérfanos. Paso final de verificación en audit logs.
3. **TRIAL_ENDING_SOON**: Flujo comercial de conversión.
4. **INACTIVE_ORG**: Prevención de Churn.
5. **WEBHOOK_FAILURE**: Resolución técnica de fallos de integración.

## UI y UX de Remediación
- **Botón Playbook**: Disponible en cada tarjeta (agrupada e individual).
- **Impacto de Grupo**: Al abrir desde un grupo, se muestra el conteo de orgs e incidentes afectados.
- **Progreso**: Indicador visual del avance (ej: "2/5 pasos completados").
- **Trazabilidad**: Cada paso marcado registra el autor y la fecha en los metadatos de la alerta.

## Auditoría y Eventos
- `SUPERADMIN_ALERT_PLAYBOOK_STEP_TOGGLED`: Registrado cada vez que se marca/desmarca un paso. Incluye `traceId`.
- `SUPERADMIN_COCKPIT_VIEWED`: Registra la apertura del cockpit con el scope activo.
