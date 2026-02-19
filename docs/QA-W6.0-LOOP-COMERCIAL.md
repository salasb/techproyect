# QA Checklist: Wave 6.0 (Commercial Loop)

## Pre-Requisitos
- [ ] Organización en modo `ACTIVE`.
- [ ] Usuario con rol `OWNER` o `ADMIN`.

## Casos de Prueba P0 (Mandaratorios)

### 1. Gestión de Cotizaciones
- [ ] **Crear Draft**: Crear cotización en proyecto nuevo. Verificar estado `DRAFT`.
- [ ] **Bloqueo Sin Cliente**: Intentar "Enviar" cotización en proyecto sin cliente asignado.
    - [ ] Debe aparecer modal/alerta exigiendo cliente.
- [ ] **Asignar y Enviar**: Asignar cliente y enviar.
    - [ ] Estado cambia a `SENT`.
    - [ ] Verificar `frozenAt` no es nulo.
    - [ ] Intentar editar items -> Debe estar bloqueado.
- [ ] **Revisiones**:
    - [ ] Crear revisión desde cotización enviada.
    - [ ] Verificar nueva cotización es `DRAFT` y `version` es N+1.
    - [ ] Verificar cotización anterior sigue accesible pero "obsoleta" visualmente.

### 2. Portal Público y Aceptación
- [ ] **Vista Pública**: Acceder al link público de la cotización `SENT`.
- [ ] **Aceptación**: Clic en "Aceptar".
    - [ ] Verificar redirección o mensaje de éxito.
    - [ ] Verificar en Dashboard: Estado `ACCEPTED`.
    - [ ] **Idempotencia**: Abrir link de nuevo y tratar de aceptar -> Mensaje "Ya aceptada".

### 3. Facturación y Cobranza
- [ ] **Generar Factura**: Desde Quote `ACCEPTED`, clic en "Generar Factura".
    - [ ] Verificar creación de Invoice `DRAFT` con total correcto.
- [ ] **Emitir Factura**: Cambiar estado a `ISSUED` (o Enviada).
- [ ] **Pago Manual**: Registrar pago manual completo.
    - [ ] Estado Invoice -> `PAID`.
- [ ] **Pago Stripe (Simulado)**:
    - [ ] Usar link de pago (si aplica integración).
    - [ ] Verificar webhook actualiza estado a `PAID`.

### 4. Guards y Auditoría
- [ ] **Audit Log**: Verificar en `/project/[id]` timeline o `/superadmin/ops` que aparezcan eventos:
    - `QUOTE_SENT`
    - `QUOTE_ACCEPTED`
    - `INVOICE_CREATED`
- [ ] **Pause Guard**:
    - Forzar estado Org a `PAST_DUE` en BD.
    - Intentar crear cotización -> Bloqueado.
    - Restaurar estado `ACTIVE`.

## Criterios de Aceptación Release
- Todos los P0 pasan `Pass`.
- UI es consistente y responsive.
- No hay errores de tipo "Application Error" en flujos `SENT` -> `ACCEPTED`.
