# Onboarding Comercial v1

## Flujos de Aprobación
El proceso de captura de nuevas compañías (Organizaciones) posee una bifurcación de negocio dictada por la variable de entorno:

`MANUAL_APPROVAL_REQUIRED` (0 o 1)

### 1. Auto Approval (Default)
`MANUAL_APPROVAL_REQUIRED=0` o no definido.
El usuario crea su empresa / o se autoprovisiona si el sistema lo detecta como completamente vacío.
El estado inicial de la `Organization` es `ACTIVE`.
El usuario ingresa directo al Dashboard. Empieza a correr su Trial lógico.

### 2. Manual Approval (Escudo de Alta Fricción)
`MANUAL_APPROVAL_REQUIRED=1`
El usuario intenta crear una empresa vía Onboarding o Autoprovisionamiento.
La organización se graba en Prisma, pero con status `PENDING`.
La sesión del usaurio queda atrapada en el estado Workspace `ORG_PENDING_APPROVAL`.
UX Resultante: El usuario no ve métricas, ni onboarding. Ve una pantalla indicando que un representante está revisando su solicitud.

## Ventajas de la Bandera Comercial
- Si lanzamos una campaña agresiva y queremos revisar la calidad de los leads (y filtrar bots), prendemos el escudo a 1.
- Si queremos volumen masivo en un Growth Hack, apagamos el escudo a 0.

## Transición PENDING -> ACTIVE
1. Un Agente o Superadmin ingresa a `/admin/orgs`.
2. Lee los datos del usuario base, contacta si es necesario.
3. Presiona el botón verde de "Aprobar". El sistema envía la query de Update a `ACTIVE` y asienta un log de Auditoría.
4. El cliente, al refrescar, entra en `ORG_ACTIVE_SELECTED`.
