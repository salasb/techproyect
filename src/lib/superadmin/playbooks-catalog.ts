export interface CockpitPlaybookStep {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface CockpitRulePlaybook {
  ruleCode: string;
  title: string;
  summary: string;
  defaultSlaPreset: "15m" | "1h" | "24h" | "72h";
  ownerRoleSuggested?: string;
  steps: CockpitPlaybookStep[];
}

export const PLAYBOOKS_CATALOG: Record<string, CockpitRulePlaybook> = {
  BILLING_PAST_DUE: {
    ruleCode: "BILLING_PAST_DUE",
    title: "Remediación de Pago Vencido",
    summary: "Gestión de organizaciones con facturas pendientes o fallidas en Stripe.",
    defaultSlaPreset: "24h",
    ownerRoleSuggested: "FINANCE_OPS",
    steps: [
      { id: "verify_stripe", title: "Verificar en Stripe Dashboard", description: "Confirmar que el pago realmente falló y no es un error de sync.", order: 1 },
      { id: "check_org_status", title: "Revisar estado de la Org", description: "Verificar si hay bloqueos previos o tickets abiertos.", order: 2 },
      { id: "contact_customer", title: "Contactar al cliente", description: "Enviar aviso manual o verificar si el auto-dunning funcionó.", order: 3 },
      { id: "retry_sync", title: "Forzar re-sincronización", description: "Ejecutar acción de sync manual si el pago ya se regularizó.", order: 4 },
    ],
  },
  NO_ADMINS_ASSIGNED: {
    ruleCode: "NO_ADMINS_ASSIGNED",
    title: "Recuperación de Nodo Huérfano",
    summary: "La organización no tiene miembros asignados. Riesgo de abandono o error de creación.",
    defaultSlaPreset: "1h",
    ownerRoleSuggested: "SUPPORT",
    steps: [
      { id: "audit_logs", title: "Auditar logs de creación", description: "Identificar quién creó la org y qué pasó con el dueño inicial.", order: 1 },
      { id: "check_invitations", title: "Verificar invitaciones pendientes", description: "Confirmar si hay invitaciones enviadas que no han sido aceptadas.", order: 2 },
      { id: "assign_temporary", title: "Asignar administrador temporal", description: "Asignar un Superadmin o Support como miembro para investigar.", order: 3 },
    ],
  },
  STALE_PENDING: {
    ruleCode: "STALE_PENDING",
    title: "Activación de Onboarding Estancado",
    summary: "Organizaciones en PENDING por más de 48h.",
    defaultSlaPreset: "24h",
    ownerRoleSuggested: "SALES_OPS",
    steps: [
      { id: "check_trial", title: "Verificar intención de uso", description: "Verificar si el cliente completó los pasos básicos.", order: 1 },
      { id: "manual_activation", title: "Activar manualmente", description: "Si cumple requisitos, proceder a activar estado ACTIVE.", order: 2 },
    ],
  },
  SYSTEM_INFO: {
    ruleCode: "SYSTEM_INFO",
    title: "Revisión de Mensaje de Sistema",
    summary: "Mensajes informativos que requieren supervisión técnica.",
    defaultSlaPreset: "72h",
    ownerRoleSuggested: "SUPERADMIN",
    steps: [
      { id: "analyze_impact", title: "Analizar impacto", description: "Determinar si requiere escalación a desarrollo.", order: 1 },
      { id: "archive_if_minor", title: "Resolver si es trivial", description: "Si no hay acción requerida, marcar como RESUELTO.", order: 2 },
    ],
  },
};

export function getPlaybookByRule(ruleCode: string): CockpitRulePlaybook {
  return PLAYBOOKS_CATALOG[ruleCode] || {
    ruleCode: "GENERIC_ALERT",
    title: "Procedimiento Estándar",
    summary: "Pasos genéricos para la resolución de alertas no catalogadas.",
    defaultSlaPreset: "72h",
    steps: [
      { id: "investigate", title: "Investigar causa raíz", order: 1 },
      { id: "document", title: "Documentar hallazgo", order: 2 },
      { id: "resolve", title: "Marcar resolución", order: 3 },
    ],
  };
}
