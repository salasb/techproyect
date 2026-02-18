# QA-W5-ACTIVATION

Este documento detalla los casos de prueba para validar el flujo de activación y comercial de la Wave 5.

## Caso 1: Nuevo Usuario (First Value)
- [ ] Registrar nuevo usuario -> `/start`.
- [ ] Dashboard debe mostrar el panel "¡Hola! Vamos a activar tu cuenta".
- [ ] El primer paso "Crear Proyecto" debe estar resaltado.
- [ ] Al crear un proyecto, el progreso en el dashboard debe subir al 66%.

## Caso 2: Cotización sin Cliente (Fricción Cero)
- [ ] Ir a un proyecto que NO tenga cliente asignado.
- [ ] Entrar a `/quote`.
- [ ] Intentar hacer clic en "Enviar".
- [ ] Debe abrirse el modal "Nuevo Cliente Rápido".
- [ ] Al crear el cliente, el proyecto debe asociarse automáticamente y proceder al envío.

## Caso 3: Paywall Inteligente (PAUSE)
- [ ] Forzar estado `PAUSED` en la suscripción vía DB (o usar org en mora).
- [ ] Entrar a `/quote`.
- [ ] Las acciones (Enviar, Aceptar, Rechazar) deben estar bloqueadas por un overlay de "Reactivar Plan".

## Caso 4: Automatización de Seguimiento
- [ ] Al enviar una cotización, verificar en el Dashboard (Command Center) que aparezca una nueva tarea: "Seguimiento Cotización: [Nombre]".
- [ ] La fecha de vencimiento debe ser +2 días hábiles.

## Caso 5: Multi-tenancy
- [ ] Verificar que las estadísticas de activación (hitos) no se mezclen entre organizaciones distintas del mismo usuario.
