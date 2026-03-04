# Portal Cliente v1 (Quotes & Payments)

## 1. Resumen de Arquitectura
El Portal Cliente es una interfaz pública y segura que permite a los clientes finales revisar, aceptar y pagar cotizaciones sin necesidad de tener una cuenta en el sistema.

### Componentes Clave:
- **Share Links**: `/p/q/[token]` - URLs únicas protegidas por hashing SHA-256.
- **Aceptación Idempotente**: Acción que transiciona la Cotización a `ACCEPTED` y genera una Factura (Invoice) una única vez.
- **Pagos con Stripe**: Integración directa para pagar Invoices resultantes mediante Checkout Sessions.

## 2. Seguridad (Security by Design)
- **Anti-Enumeración**: Los tokens públicos no están en la base de datos en texto claro. Se almacena solo su hash SHA-256.
- **Multi-Org Isolation**: Todas las operaciones validan el `organizationId` asociado al Share Link. No es posible acceder a datos de otra organización adivinando tokens.
- **Link Expiration**: Los links tienen una validez por defecto de 30 días.
- **Read-Only Lock**: Si la organización proveedora está en mora o pausada, el portal bloquea automáticamente la aceptación y el pago de cotizaciones nuevas.

## 3. Flujo de Estados
1. **PENDING**: El cliente visualiza la cotización.
2. **ACCEPTED**: El cliente presiona "Aceptar". Se genera la Invoice interna.
3. **PAID**: El cliente completa el pago en Stripe. El Webhook actualiza la Invoice a `PAID` y registra el evento en el timeline del proyecto.

## 4. Matriz de Acciones
| Acción | Endpoint / Action | Requisito |
| :--- | :--- | :--- |
| Generar Link | `createQuoteShareLinkAction` | Permiso `QUOTES_MANAGE` (Interno) |
| Aceptar | `acceptPublicQuoteAction` | Token válido + Org Active |
| Pagar | `payPublicInvoiceAction` | Token válido + Quote Accepted + Org Active |

## 5. QA Checklist
- [ ] Generar link desde la vista de impresión: Debe copiar URL al portapapeles.
- [ ] Abrir link en ventana incógnito: Debe cargar el detalle sin pedir login.
- [ ] Aceptar cotización: Debe cambiar el estado a "Aceptada" y mostrar botón de pago.
- [ ] Pagar con Stripe: Debe redirigir al checkout y volver con éxito.
- [ ] Verificar Idempotencia: Intentar aceptar 2 veces no debe crear 2 invoices.

---
*TechWise Engineering v1.0*
