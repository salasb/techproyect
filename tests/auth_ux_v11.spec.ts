import { test, expect } from '@playwright/test';

test.describe('Auth UX & Security Hardening (v1.1)', () => {

    test('Login fallido debe mostrar mensaje genérico y CTAs', async ({ page }) => {
        await page.goto('/login');
        
        // Ingresar credenciales erróneas
        await page.fill('input[name="email"]', 'noexiste@test.com');
        await page.fill('input[name="password"]', 'Password123!');
        await page.click('button[type="submit"]');

        // Verificar mensaje genérico (Anti-enumeration)
        const errorAlert = page.locator('text=Correo o contraseña incorrectos.');
        await expect(errorAlert).toBeVisible();

        // Verificar CTAs sugeridos en el prompt
        await expect(page.locator('button:has-text("Crear Cuenta")')).toBeVisible();
        await expect(page.locator('button:has-text("Recuperar Acceso")')).toBeVisible();
    });

    test('Recuperación de contraseña siempre confirma envío (Anti-enumeration)', async ({ page }) => {
        await page.goto('/login');
        
        // Abrir modo "Olvidé mi contraseña"
        await page.click('button:has-text("¿Olvidaste tu contraseña?")');
        
        // Enviar con cualquier correo
        await page.fill('input[name="email"]', 'cualquier-correo@test.com');
        await page.click('button:has-text("Enviar instrucciones")');

        // Mensaje debe ser genérico y no confirmar si existe
        await expect(page.locator('text=Si el correo está registrado, te enviaremos un enlace')).toBeVisible();
    });

    test('Registro con email existente muestra error genérico y CTA login', async ({ page }) => {
        await page.goto('/login');
        await page.click('button:has-text("Crear Cuenta")');

        // Email que sabemos que existe (e2e_admin@test.com del bootstrap)
        await page.fill('input[name="email"]', 'e2e_admin@test.com');
        await page.fill('input[name="password"]', 'Password123!');
        await page.click('button:has-text("Registrarse")');

        // Mensaje genérico
        await expect(page.locator('text=No pudimos crear la cuenta con esos datos.')).toBeVisible();
        
        // CTA a recuperación
        await expect(page.locator('button:has-text("Recuperar Acceso")')).toBeVisible();
    });

    test('Validación UX: normalización de email (trim + lowercase)', async ({ page }) => {
        await page.goto('/login');
        
        // Ingresar email con espacios y mayúsculas
        await page.fill('input[name="email"]', '  E2E_ADMIN@test.com  ');
        await page.fill('input[name="password"]', 'E2eTest1234!');
        
        // Al enviar, debería funcionar porque se normaliza en el server action
        await page.click('button[type="submit"]');
        
        // Debería entrar al dashboard
        await expect(page).toHaveURL(/\/dashboard/);
    });

});
