import prisma from "@/lib/prisma";
import { SuperadminAlert, SuperadminAlertSeverity } from "@prisma/client";
import { getPlaybookByRule } from "./playbooks-catalog";

export type OperationalAlertStatus = "OPEN" | "ACKNOWLEDGED" | "SNOOZED" | "RESOLVED";
export type OperationalSlaStatus = "ON_TRACK" | "AT_RISK" | "BREACHED";
export type OwnerType = "user" | "role";

export interface PlaybookStepExecution {
  stepId: string;
  checked: boolean;
  checkedBy?: string;
  checkedAt?: string;
  note?: string | null;
}

export interface OperationalAlertOwner {
  ownerType: OwnerType;
  ownerId?: string;
  ownerRole?: string;
  assignedBy?: string;
  assignedAt?: string;
}

export interface OperationalAlertSla {
  preset: "15m" | "1h" | "24h" | "72h";
  dueAt: string;
  status: OperationalSlaStatus;
}

export interface OperationalMetadataV46 {
  version: "v4.6";
  status: OperationalAlertStatus;
  href?: string;
  ruleCode: string;
  snoozedUntil?: string | null;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNote?: string;
  reopenCount?: number;
  lastTraceId?: string;
  
  // v4.6 specific fields
  owner?: OperationalAlertOwner | null;
  sla?: OperationalAlertSla | null;
  playbookSteps?: PlaybookStepExecution[];
  
  // Auditable history snapshots
  history?: unknown[];
}

export class OperationalStateRepo {
  
  /**
   * Migrate and normalize metadata to v4.6
   */
  static normalize(alert: SuperadminAlert): OperationalMetadataV46 {
    const raw = (alert.metadata || {}) as Record<string, unknown>;
    
    // If it's already v4.6, just return it
    if (raw.version === "v4.6") return raw as unknown as OperationalMetadataV46;

    // Mapping from v4.5/v4.4 or legacy
    const ruleCode = (raw.ruleCode as string) || alert.type;
    const playbook = getPlaybookByRule(ruleCode);
    
    const normalized: OperationalMetadataV46 = {
      version: "v4.6",
      status: (alert.status === 'ACTIVE' ? 'OPEN' : alert.status) as OperationalAlertStatus,
      href: raw.href as string | undefined,
      ruleCode: ruleCode,
      snoozedUntil: raw.snoozedUntil as string | null,
      acknowledgedBy: raw.acknowledgedBy as string | undefined,
      acknowledgedAt: raw.acknowledgedAt as string | undefined,
      resolvedBy: raw.resolvedBy as string | undefined,
      resolvedAt: (raw.resolvedAt as string) || alert.resolvedAt?.toISOString(),
      resolutionNote: raw.resolutionNote as string | undefined,
      reopenCount: (raw.reopenCount as number) || 0,
      lastTraceId: raw.lastTraceId as string | undefined,
      
      // Default SLA and Playbook if missing
      owner: (raw.owner as OperationalAlertOwner) || null,
      sla: (raw.sla as OperationalAlertSla) || this.calculateDefaultSla(alert.detectedAt, playbook.defaultSlaPreset),
      playbookSteps: (raw.playbookSteps as PlaybookStepExecution[]) || [],
    };

    return normalized;
  }

  static calculateDefaultSla(detectedAt: Date, preset: string): OperationalAlertSla {
    const dueAt = new Date(detectedAt);
    const hours = preset.includes('h') ? parseInt(preset) : 0;
    const minutes = preset.includes('m') ? parseInt(preset) : 0;
    
    dueAt.setHours(dueAt.getHours() + hours);
    dueAt.setMinutes(dueAt.getMinutes() + minutes);
    if (preset === '72h') dueAt.setDate(dueAt.getDate() + 3); 

    return {
      preset: preset as "15m" | "1h" | "24h" | "72h",
      dueAt: dueAt.toISOString(),
      status: this.getSlaStatus(dueAt)
    };
  }

  static getSlaStatus(dueAt: Date | string): OperationalSlaStatus {
    const now = new Date();
    const deadline = new Date(dueAt);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffMs <= 0) return "BREACHED";
    if (diffHours < 2) return "AT_RISK"; 
    return "ON_TRACK";
  }

  /**
   * Persist metadata changes
   */
  static async updateMetadata(
    fingerprint: string, 
    patch: Partial<OperationalMetadataV46> & { severity?: SuperadminAlertSeverity, description?: string }
  ) {
    const alert = await prisma.superadminAlert.findUnique({ where: { fingerprint } });
    if (!alert) throw new Error(`Alert not found: ${fingerprint}`);

    const current = this.normalize(alert);
    const { severity, description, ...metaPatch } = patch;
    const updatedMeta = { ...current, ...metaPatch };

    // Auto-update SLA status on every read/write if not resolved
    if (updatedMeta.status !== 'RESOLVED' && updatedMeta.sla) {
        updatedMeta.sla.status = this.getSlaStatus(updatedMeta.sla.dueAt);
    }

    return prisma.superadminAlert.update({
      where: { fingerprint },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (updatedMeta.status === 'OPEN' ? 'ACTIVE' : updatedMeta.status) as any,
        severity: severity,
        description: description,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: updatedMeta as any
      }
    });
  }

  /**
   * Reset operational state for reopening
   */
  static async reopen(fingerprint: string, traceId: string) {
    const alert = await prisma.superadminAlert.findUnique({ where: { fingerprint } });
    if (!alert) return;

    const current = this.normalize(alert);
    const playbook = getPlaybookByRule(current.ruleCode);
    
    // Save history snapshot
    const history = (current.history || []) as unknown[];
    history.push({
        event: "REOPENED",
        at: new Date().toISOString(),
        prevStatus: current.status,
        prevSteps: current.playbookSteps,
        traceId
    });

    return this.updateMetadata(fingerprint, {
        status: "OPEN",
        reopenCount: (current.reopenCount || 0) + 1,
        lastTraceId: traceId,
        sla: this.calculateDefaultSla(new Date(), playbook.defaultSlaPreset),
        playbookSteps: [],
        history
    });
  }
}
