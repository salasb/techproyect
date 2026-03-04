# Cockpit Global Versioning (v1.0)

## Regla de Oro: Una Sola Verdad
A partir de la versión v4.7.2, el Global Cockpit debe utilizar **exclusivamente** la constante centralizada para mostrar su versión en la interfaz de usuario.

### Ubicación de la Verdad
- **Archivo**: `src/lib/versions.ts`
- **Constante**: `COCKPIT_CONTRACT_VERSION`

### Directivas
1. **PROHIBIDO** hardcodear strings como "v4.6.0" o "v4.7.2" en componentes `.tsx`.
2. Todo log de servidor o diagnóstico debe interpolar la versión desde `src/lib/versions.ts`.
3. El build SHA se extrae automáticamente de `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`.

### Estructura de Visualización
- **Header (Layout)**: `Global Cockpit v{COCKPIT_CONTRACT_VERSION}` (Ubicación Oficial)
- **H1 (Dashboard)**: `Global Cockpit` (Limpio, sin versión para evitar duplicidad)
- **Diagnostics**: `v{COCKPIT_CONTRACT_VERSION} • App {APP_VERSION} ({BUILD_SHA})`

---
*Documento de Referencia para Estabilidad Operacional v1.0*
