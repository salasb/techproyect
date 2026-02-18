/**
 * TechWise Email Service
 * Handles sending emails using a configurable provider.
 * Fallbacks to console logging in development if no SMTP/Provider is configured.
 */

interface SendInviteArgs {
    to: string;
    orgName: string;
    invitedBy: string;
    joinUrl: string;
    expiresAt: Date;
}

export async function sendTeamInvitationEmail({
    to,
    orgName,
    invitedBy,
    joinUrl,
    expiresAt,
}: SendInviteArgs) {
    const isProd = process.env.NODE_ENV === 'production';
    const hasEmailConfig = process.env.EMAIL_SERVER && process.env.EMAIL_FROM;

    console.log(`[Email Service] Preparing invitation to ${to} for organization ${orgName}`);

    if (!isProd || !hasEmailConfig) {
        console.log("-----------------------------------------");
        console.log("DEV EMAIL FALLBACK - INVITATION SENT");
        console.log(`To: ${to}`);
        console.log(`Subject: Te invitaron a unirte a ${orgName} en TechWise`);
        console.log(`Body: Hola! ${invitedBy} te ha invitado a unirte a ${orgName}.`);
        console.log(`Link para unirte: ${joinUrl}`);
        console.log(`Expira el: ${expiresAt.toLocaleString()}`);
        console.log("-----------------------------------------");
        
        return { success: true, method: 'fallback' };
    }

    // TODO: Implement real email sending with Resend, SendGrid, or SMTP
    // For now, we log as "not configured" even in prod if envs are missing
    console.error(`[Email Service] Production email provider not configured. Invitation to ${to} was NOT sent via real email.`);
    
    return { success: false, error: 'Provider not configured' };
}
