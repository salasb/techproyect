# Password Recovery v1.0 (Flujo Crítico)

## 1. El problema: "Éxito sin Email"
Si el sistema reporta éxito pero el correo no llega, y en los logs de Supabase ves `/recover completed`, la causa suele ser una de estas:
1. **SMTP Default Rate Limit**: El servicio SMTP gratuito de Supabase es extremadamente limitado (aprox. 3 correos por hora) y tiene baja reputación (cae en Spam).
2. **Redirect URL no autorizada**: Si el parámetro `redirectTo` enviado desde el código no coincide exactamente con el Allowlist en Supabase, el enlace puede no enviarse o fallar al abrirse.

## 2. Configuración Requerida (Supabase Dashboard)
Accede a **Authentication > URL Configuration**:

### Site URL
- `https://techproyect.vercel.app` (O el dominio oficial de producción)

### Redirect URLs (Allowlist)
Añade estos patrones exactos para habilitar Previews y Local:
- `http://localhost:3000/**`
- `https://*-salasb.vercel.app/**` (Soporte para todas las ramas de Vercel)
- `https://techproyect.vercel.app/**`

## 3. Recomendación de Producción: Custom SMTP
**Es obligatorio** configurar un proveedor propio en **Authentication > Email Templates** para evitar los límites de Supabase:
- **Proveedores recomendados**: Resend, SendGrid, Postmark.
- **Beneficio**: Elimina los límites de 3 emails/hora y asegura que el correo llegue a la bandeja principal.

## 4. Instrumentación y Soporte
Hemos añadido **Trace IDs** a cada intento de recuperación.
- Si un usuario reporta que no puede enviar el correo, solicita el código que aparece en el banner rojo (ej: `REC-A1B2C3`).
- Busca este código en los logs de Vercel para identificar el error real (ej: `429 Too Many Requests` o `500 SMTP Error`).

## 5. Medidas de Seguridad
- **Anti-enumeración**: El sistema nunca revela si un correo existe o no.
- **Cooldown**: El botón de envío se bloquea por **60 segundos** tras un éxito para proteger la cuota de SMTP.
- **Update Password**: La página `/auth/update-password` solo es accesible si existe una sesión de recuperación válida.

---
*TechWise Engineering v1.0*
