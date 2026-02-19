import prisma from "@/lib/prisma";

export type LifecycleTemplateKey = 'WELCOME' | 'MISSING_PROJ' | 'MISSING_QUOTE' | 'TRIAL_7D' | 'TRIAL_3D' | 'TRIAL_EXP' | 'DUNNING_FAIL' | 'DUNNING_RECOVERED';

export class LifecycleEmailService {
    /**
     * Sends a lifecycle email if all conditions (dedupe, rate limit, preference) are met.
     */
    static async sendLifecycleEmail(args: {
        organizationId: string;
        userId: string;
        templateKey: LifecycleTemplateKey;
        dedupeKey: string;
        isBilling?: boolean;
    }) {
        const { organizationId, userId, templateKey, dedupeKey, isBilling = false } = args;

        // 1. Fetch user & preference
        const user = await prisma.profile.findUnique({ where: { id: userId } });
        if (!user) return { success: false, error: 'User not found' };

        // 2. Opt-out check (Skip if it's a billing/critical email)
        if (!isBilling && !(user as any).receiveProductTips) {
            console.log(`[LifecycleEmail] User ${userId} opt-out from tips. Skipping ${templateKey}`);
            return { success: false, error: 'User opt-out' };
        }

        // 3. Deduplication check
        const existing = await (prisma as any).emailEventLog.findUnique({ where: { dedupeKey } });
        if (existing) {
            console.log(`[LifecycleEmail] Dedupe hit for ${dedupeKey}. Skipping.`);
            return { success: false, error: 'Dedupe hit' };
        }

        // 4. Rate Limiting (1/day, 3/week)
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const [dayCount, weekCount] = await Promise.all([
            (prisma as any).emailEventLog.count({ where: { userId, sentAt: { gte: dayAgo } } }),
            (prisma as any).emailEventLog.count({ where: { userId, sentAt: { gte: weekAgo } } })
        ]);

        if (dayCount >= 1 || weekCount >= 3) {
            console.warn(`[LifecycleEmail] Rate limit hit for user ${userId} (${dayCount}/day, ${weekCount}/week).`);
            return { success: false, error: 'Rate limit hit' };
        }

        // 5. Send Email (using existing infra or internal logic)
        const result = await this.triggerEmailSend(user.email, templateKey, user.name);

        if (result.success) {
            // 6. Log event
            await (prisma as any).emailEventLog.create({
                data: {
                    organizationId,
                    userId,
                    templateKey,
                    dedupeKey,
                    providerMessageId: result.messageId,
                    meta: { email: user.email }
                }
            });
        }

        return result;
    }

    private static async triggerEmailSend(to: string, key: LifecycleTemplateKey, userName: string) {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const EMAIL_FROM = process.env.EMAIL_FROM || "TechWise <noreply@techwise.pro>";

        const templates: Record<LifecycleTemplateKey, { subject: string, html: string }> = {
            WELCOME: {
                subject: '¡Bienvenido a TechWise! 🚀',
                html: `<h1>Hola ${userName}</h1><p>Tu espacio de trabajo está listo. Empieza creando tu primer proyecto.</p>`
            },
            MISSING_PROJ: {
                subject: 'Saca el máximo provecho a TechWise',
                html: `<p>Hola ${userName}, notamos que aún no has creado tu primer proyecto. ¿Necesitas ayuda para empezar?</p>`
            },
            MISSING_QUOTE: {
                subject: '¿Listo para enviar tu primera cotización?',
                html: `<p>Ya tienes un proyecto creado. El siguiente paso es generar una cotización profesional para tu cliente.</p>`
            },
            TRIAL_7D: {
                subject: 'Tu periodo de prueba termina en 7 días',
                html: `<p>Esperamos que estés disfrutando de TechWise. Te quedan 7 días de trial.</p>`
            },
            TRIAL_3D: {
                subject: 'Solo quedan 3 días de tu trial',
                html: `<p>Tu periodo de prueba está por terminar. Configura tu suscripción para seguir creciendo.</p>`
            },
            TRIAL_EXP: {
                subject: 'Tu cuenta ha pasado a modo lectura',
                html: `<p>Tu periodo de trial ha expirado. Tu cuenta está en modo pausa hasta que configures una suscripción.</p>`
            },
            DUNNING_FAIL: {
                subject: 'Acción Requerida: Fallo en el pago de tu suscripción ⚠️',
                html: `<p>Hola ${userName}, no hemos podido procesar el pago de tu suscripción. Por favor actualiza tu método de pago para evitar la interrupción del servicio.</p>`
            },
            DUNNING_RECOVERED: {
                subject: '¡Todo listo! Pago procesado con éxito ✅',
                html: `<p>Hola ${userName}, hemos recibido tu pago correctamente. Tu suscripción vuelve a estar activa.</p>`
            }
        };

        const template = templates[key];

        if (!RESEND_API_KEY) {
            console.log(`[DEV EMAIL] TO: ${to} | SUBJECT: ${template.subject}`);
            return { success: true, messageId: 'dev_mode' };
        }

        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: EMAIL_FROM,
                    to: [to],
                    subject: template.subject,
                    html: template.html,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(JSON.stringify(data));

            return { success: true, messageId: data.id };
        } catch (error) {
            console.error(`[LifecycleEmail] Error sending ${key}:`, error);
            return { success: false, error: 'Email provider error' };
        }
    }
}
