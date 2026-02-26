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
```

## Catálogo Inicial de Reglas
1. **BILLING_NOT_CONFIGURED / BILLING_PAST_DUE**: Remediación financiera (SLA: 24h).
2. **NO_ADMINS_ASSIGNED**: Recuperación de nodos huérfanos (SLA: 1h).
3. **TRIAL_ENDING_SOON**: Flujo comercial (SLA: 24h).
4. **INACTIVE_ORG**: Prevención de Churn (SLA: 72h).
5. **GENERIC_ALERT**: Procedimiento estándar de investigación.

## UI y UX de Remediación
- **Botón Playbook**: Disponible en las tarjetas individuales y grupales.
- **Drawer / Panel**: Muestra el contexto de la alerta, el SLA objetivo y una checklist interactiva.
- **Persistencia de Progreso**: Cada paso marcado se guarda en los metadatos de la alerta (`playbookSteps`), registrando el actor (`checkedBy`) y la fecha (`checkedAt`).

## Fases de Implementación
- [x] Fase 0: Remate Pre-Flight (Higiene única, Notificaciones con Scope).
- [x] Fase 1: Contrato Playbook (Definición de tipos y metadatos).
- [x] Fase 2: Catálogo Inicial (5 reglas principales).
- [x] Fase 3: Integración UI (Botón y Panel de Ejecución).
- [x] Fase 4: Persistencia y Auditoría de Progreso.
- [x] Fase 5: QA Manual de Integridad.

## Auditoría
Todas las acciones sobre un playbook (ej. completar un paso) generan un `Trace ID` y se registran en la tabla `AuditLog` del sistema.
