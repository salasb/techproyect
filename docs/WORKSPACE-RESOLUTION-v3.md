# Workspace Resolution v3

El mecanismo de resolución de Workspace se encarga de determinar qué organización es la "activa" para el usuario actual y de garantizar que la experiencia sea fluida incluso en entornos problemáticos como URLs de Vercel (Domain Hop).

## Flujo de Resolución (Node Runtime)
El proceso corre de forma segura mediante Prisma en `src/lib/auth/workspace-resolver.ts`:

1. **Recuperación de Membresías y Profile**: Obtenemos las organizaciones activas del usuario y su `Profile`.
2. **Auto-Reparación (Auto-Repair Logic)**: 
   - Si no hay membresías, intenta recuperarla usando `Profile.organizationId`.
   - Si falla, busca la última interacción registrada en `AuditLog`.
   - Si está activa la variable de entorno `AUTO_PROVISION=1`, crea automáticamente una organización inicial. (Nota: Si `MANUAL_APPROVAL_REQUIRED=1` está activado, la org nace como `PENDING`).
3. **Validación de Cookies**: 
   - Si la cookie `app-org-id` existe y el usuario tiene acceso a esa organización, se marca como la org activa.
4. **Recuperación de Cookies (Domain Hop)**:
   - **Caso 1 Org**: Si el usuario solo tiene 1 organización, se selecciona automáticamente y la sesión intenta escribir la cookie. (Se captura silenciosamente si ocurre en contexto de Render de Next.js Server Components). Se asume esa Org como activa.
   - **Caso >1 Orgs**: Si hay más de una, se busca `Profile.organizationId` (la "última caché conocida"). Si la membresía coincide, se recupera la sesión desde allí de forma transparente. Si no coindice, se asume `null` y se insta al usuario de forma elegante a elegir una.
5. **Manejo de Anomalías (Profile Missing)**: 
   - Retornamos un flag explícito `profileMissing` si el registro en la tabla `Profile` está dañado o no existe. El Dashboard capta esto e insta a la reparación sin crashea ni mostrar spinners infinitos.

## Dashboard UI (Estados Determinísticos)
El Frontend evalúa estrictamente las respuestas del resolver sin realizar llamadas de DB redundantes si carece de Org Activa:
- **Estado Nuevo Usuario (`!orgId && !hasOrgs`)**: Muestra *WorkspaceSetupBanner*.
- **Estado Domain Hop (`!orgId && hasOrgs`)**: Muestra alerta ámbar, guiando a `/org/select`.
- **Estado Corrupción de Perfil (`profileMissing`)**: Alerta Roja + enlace rápido a Diagnóstico Forense API.
