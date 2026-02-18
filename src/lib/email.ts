/**
 * TechWise Email Service
 * Handles sending emails using Resend API via HTTP fetch.
 */

interface SendInviteArgs {
    to: string;
    orgName: string;
    invitedBy: string;
    joinUrl: string;
    expiresAt: Date;
    type?: 'INVITATION' | 'RESEND' | 'REVOKED' | 'EXPIRED';
}

export async function sendTeamInvitationEmail({
    to,
    orgName,
    invitedBy,
    joinUrl,
    expiresAt,
    type = 'INVITATION'
}: SendInviteArgs) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_FROM = process.env.EMAIL_FROM || "TechWise <noreply@techwise.pro>";
    const isProd = process.env.NODE_ENV === 'production';

    console.log(`[Email Service] Preparing ${type} to ${to} for organization ${orgName}`);

    // Templates Mapping
    const templates = {
        INVITATION: {
            subject: `Te invitaron a unirte a ${orgName} en TechWise`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>¡Hola!</h2>
                    <p><strong>${invitedBy}</strong> te ha invitado a unirte a la organización <strong>${orgName}</strong> en TechWise.</p>
                    <p>Para aceptar la invitación y unirte al equipo, haz clic en el siguiente botón:</p>
                    <a href="${joinUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Unirme al Equipo</a>
                    <p style="font-size: 14px; color: #666;">Este enlace expirará el ${expiresAt.toLocaleDateString()} a las ${expiresAt.toLocaleTimeString()}.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #999;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
                </div>
            `
        },
        RESEND: {
            subject: `Recordatorio: Invitación pendiente a ${orgName}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Invitación Reenviada</h2>
                    <p>Tu invitación a <strong>${orgName}</strong> ha sido actualizada. Ten en cuenta que cualquier enlace anterior ya no es válido.</p>
                    <p>Usa este nuevo enlace para unirte:</p>
                    <a href="${joinUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0;">Aceptar Invitación Actualizada</a>
                    <p style="font-size: 14px; color: #666;">Expira el: ${expiresAt.toLocaleString()}</p>
                </div>
            `
        },
        REVOKED: {
            subject: `Invitación cancelada - ${orgName}`,
            html: `<p>La invitación para unirte a <strong>${orgName}</strong> ha sido revocada por un administrador.</p>`
        },
        EXPIRED: {
            subject: `Tu invitación a ${orgName} ha expirado`,
            html: `<p>Tu invitación para unirte a <strong>${orgName}</strong> ha expirado. Por favor, solicita una nueva a tu administrador.</p>`
        }
    };

    const template = templates[type];

    if (!RESEND_API_KEY) {
        console.log("-----------------------------------------");
        console.log(`DEV EMAIL FALLBACK - ${type} LOGGED`);
        console.log(`To: ${to}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Link: ${joinUrl}`);
        console.log("-----------------------------------------");
        return { success: true, method: 'fallback' };
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

        if (!response.ok) {
            const error = await response.json();
            throw new Error(JSON.stringify(error));
        }

        const data = await response.json();
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error(`[Email Service] Failed to send ${type} to ${to}:`, error);
        return { success: false, error: 'Failed to send via Resend' };
    }
}
