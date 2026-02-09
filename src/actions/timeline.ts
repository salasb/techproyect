'use server'

import { createClient } from "@/lib/supabase/server";

export type TimelineEvent = {
    id: string;
    date: string;
    type: 'SYSTEM' | 'INTERACTION' | 'NOTE' | 'BLOCKER' | 'MILESTONE';
    iconType?: string; // For Interactions (CALL, EMAIL, etc.)
    title: string;
    content: string;
    author?: string;
    metadata?: any;
};

export async function getProjectTimeline(projectId: string): Promise<TimelineEvent[]> {
    const supabase = await createClient();

    // 1. Fetch Audit Logs (System Events)
    const { data: auditLogs } = await supabase
        .from('AuditLog')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false });

    // 2. Fetch Project Logs (Manual Notes)
    const { data: projectLogs } = await supabase
        .from('ProjectLog')
        .select('*')
        .eq('projectId', projectId)
        .order('createdAt', { ascending: false });

    // 3. Fetch Interactions (CRM)
    const { data: interactions } = await supabase
        .from('Interaction')
        .select('*')
        .eq('projectId', projectId)
        .order('date', { ascending: false });

    const events: TimelineEvent[] = [];

    // Map Audit Logs
    auditLogs?.forEach(log => {
        events.push({
            id: `audit-${log.id}`,
            date: log.createdAt || new Date().toISOString(),
            type: 'SYSTEM',
            title: log.action,
            content: log.details || '',
            author: log.userName || 'Sistema',
            metadata: { originalType: 'AuditLog' }
        });
    });

    // Map Project Logs
    projectLogs?.forEach(log => {
        // Map old types to new unified types
        let type: TimelineEvent['type'] = 'NOTE';
        if (log.type === 'BLOCKER') type = 'BLOCKER';
        if (log.type === 'MILESTONE') type = 'MILESTONE';

        events.push({
            id: `log-${log.id}`,
            date: log.createdAt,
            type: type,
            title: type === 'BLOCKER' ? 'Bloqueo Reportado' : (type === 'MILESTONE' ? 'Hito Alcanzado' : 'Nota Interna'),
            content: log.content,
            metadata: { originalType: 'ProjectLog' }
        });
    });

    // Map Interactions
    interactions?.forEach(interaction => {
        events.push({
            id: `int-${interaction.id}`,
            date: interaction.date,
            type: 'INTERACTION',
            iconType: interaction.type, // CALL, EMAIL, MEETING
            title: `Interacción: ${interaction.type}`,
            content: interaction.notes,
            metadata: { originalType: 'Interaction' }
        });
    });

    // Sort all by date descending
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
