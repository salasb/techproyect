# E2E Auth Bootstrap + Playwright Architecture (v1.7)

## 1. El Problema Raíz
Históricamente, los tests E2E inyectaban usuarios directamente a la tabla `auth.users` mediante SQL directo (raw inserts) para evadir los límites de rate (rate limits) del envío de emails en la función `signUp()`. Esto corrompía el motor interno de GoTrue de Supabase, desencadenando errores nativos de esquema (`Database error querying schema`) al intentar loguearse mediante la UI, y resultando en tests extremadamente inestables y "flaky".

## 2. Solución: Bootstrap Idempotente en el Server
La arquitectura v1.7 introduce un patrón de seeding seguro gestionado puramente por el servidor:
- Un endpoint dedicado `src/app/api/_e2e/bootstrap/route.ts` actúa como inyector canónico.
- Se comunica directamente con la **Admin API de Supabase** (usando `SUPABASE_SERVICE_ROLE_KEY`) para ejecutar `admin.createUser` confirmando emails inmediatamente.
- De forma idempotente, asegura que existan los recursos de prisma (`Profile`, `Organization`, `OrganizationMember`) respetando las reglas de la aplicación sin recurrir al SQL raw.
- El endpoint está cercado de producción mediante comprobación de variables y protegido por el Header de autorización `E2E_TEST_SECRET`.

## 3. Integración con Playwright (storageState)
Se eliminó la necesidad de que cada caso de prueba ejecute el flujo UI de login. En su lugar:
1. `playwright/auth.setup.ts` se configura globalmente para que se ejecute antes de la test suite principal.
2. Invoca el endpoint Bootstrap y extrae las cookies de sesión (hydration).
3. Escribe perfiles estáticos (`superadmin.json`, `admin.json`) en `playwright/.auth/`.
4. Los archivos `spec.ts` inyectan este estado global:
   ```typescript
   test.use({ storageState: 'playwright/.auth/admin.json' });
   ```

## 4. Roles de Prueba Soportados
*   **Superadmin** (`e2e_superadmin@test.com`): Testea layouts globales sin vincularse obligatoriamente a una organización comercial (onboarding).
*   **Admin Operativo** (`e2e_admin@test.com`): Mapeado permanentemente a la organización generada 'E2E Test Org', se utiliza para asegurar que las políticas de scope (ej. `requireOperationalScope`) de los Server Actions funcionen determinísticamente.

## 5. Matriz de Seguridad y QA Fallback

| Escenario de Integridad | Comportamiento Esperado del Sistema E2E |
| :--- | :--- |
| **Petición a API sin E2E_TEST_SECRET** | El endpoint bloquea instantáneamente retornando `401 Unauthorized`. |
| **Intento de ejecución en Producción** | Fallo estricto `403`. Jamás corre en `NODE_ENV === 'production'`. |
| **Usuario o Org ya existe en la DB** | Ejecución Idempotente. Reutiliza el UUID, y fuerza reconfigurar password. |
| **Spec omite la Cookie App-Org-Id** | Los resolvers tiran `ScopeError` seguro y retornan JSON controlado antes de fallar en DB (`403`). |

## 6. Ejecutando Localmente
Asegúrate de tener `.env` con:
`E2E_TEST_SECRET=LOCAL_SECRET_HOLDER`
Y ejecuta los tests via:
`npx playwright test`
