# Password Recovery v1.1 (Diagnóstico & Blindaje)

## 1. El problema: "Success sin Email"
Si el sistema reporta éxito pero el correo no llega, y en los logs de Supabase ves `/recover completed`, la causa es una de estas tres:
1. **SMTP Default Rate Limit**: Supabase limita el envío de correos (aprox. 3 por hora) para prevenir spam.
2. **Redirect URL no autorizada**: Si `redirectTo` no coincide exactamente con el allowlist en Supabase, el proceso falla silenciosamente.
3. **Filtros de Spam**: El remitente por defecto de Supabase suele tener baja reputación.

## 2. Configuración Requerida (Supabase Dashboard)
Accede a **Authentication > URL Configuration**:

### Site URL
- `https://techproyect.vercel.app`

### Redirect URLs (Allowlist)
Debes añadir estos patrones exactos:
- `http://localhost:3000/**`
- `https://*-salasb.vercel.app/**` (Soporte para todas las ramas de Vercel)
- `https://techproyect.vercel.app/**`

## 3. Recomendación de Producción: Custom SMTP
El servicio SMTP gratuito de Supabase es solo para pruebas. Para operación real, **es obligatorio** configurar un proveedor propio en **Authentication > Email Templates**:
- **Opciones recomendadas**: Resend (gratuito/fácil), SendGrid, Postmark.
- **Beneficio**: Elimina los límites de envío y asegura que el correo llegue a la bandeja principal.

## 4. Instrumentación y Soporte
Cada solicitud fallida genera un **Trace ID** (ej: `REC-A1B2C3`). 
- Si el usuario reporta que no puede enviar el correo, solicítale el código que aparece en el banner rojo.
- Con este código, puedes buscar el error exacto en los logs de Vercel para ver si es un Rate Limit (`429`) o un error de configuración del proveedor.

## 5. Medidas Anti-Abuso
- El botón de recuperación se bloquea por **60 segundos** tras cada intento exitoso.
- Esto protege tu cuota de SMTP y evita que Supabase bloquee la IP por spam.

---
*TechWise Engineering v1.1*
