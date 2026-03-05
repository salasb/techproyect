# Auth: Password Recovery v1.0

## 1. Resumen del Flujo
El flujo de recuperación de contraseña está diseñado para ser seguro, evitar la enumeración de usuarios y funcionar en todos los entornos (Local, Vercel Preview, Producción).

1. **Solicitud**: El usuario ingresa su email en `/login`.
2. **Envío**: Se llama a `supabase.auth.resetPasswordForEmail()` con una URL de redirección dinámica generada por `getURL()`.
3. **Email**: El usuario recibe un correo con un link único.
4. **Redirección**: Al hacer click, Supabase establece una sesión temporal de "Recovery" y redirige al usuario a `/auth/update-password`.
5. **Actualización**: El usuario ingresa su nueva contraseña y se llama a `supabase.auth.updateUser()`.

## 2. Configuración en Supabase Dashboard
Para que el flujo funcione en todos los entornos, se deben configurar las siguientes URLs en **Authentication > URL Configuration**:

### Site URL
- `https://techproyect.vercel.app` (O el dominio de producción final)

### Redirect URLs (Allowlist)
Se deben añadir los siguientes patrones:
- `http://localhost:3000/**` (Desarrollo local)
- `https://*-salasb.vercel.app/**` (Wildcard para Vercel Previews)
- `https://techproyect.vercel.app/**` (Producción)

## 3. Seguridad y UX
- **Anti-enumeración**: El sistema siempre responde con el mismo mensaje de éxito, independientemente de si el correo existe o no en la base de datos.
- **Trazabilidad**: Cada solicitud genera un `traceId` visible en los logs del servidor para depuración.
- **Rate Limiting**: Supabase aplica un límite de envío de correos por defecto. En producción se recomienda usar un proveedor de SMTP propio (SendGrid, Postmark, AWS SES).

## 4. Troubleshooting
Si el usuario no recibe el correo:
1. Revisa la carpeta de Spam.
2. Verifica que la `DATABASE_URL` y las claves de Supabase sean correctas en el entorno.
3. Comprueba el log del servidor buscando el `traceId` generado.

---
*TechWise Engineering v1.0*
