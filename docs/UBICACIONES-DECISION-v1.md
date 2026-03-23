# Decisión: Módulo de Ubicaciones (v1)

## Contexto de la Auditoría V2
El sistema poseía un módulo "zombie" en `/inventory/locations`. Este módulo estaba enlazado en el sidebar pero su funcionalidad subyacente estaba incompleta o vacía (directorios vacíos en App Router). Esto generaba deuda técnica y una experiencia de usuario (UX) rota ("Ghost Feature").

## Decisión Tomada
Se optó por la **Opción B**: Mantener la ruta, pero convertirla de manera formal en un módulo `COMING_SOON`. 

## Razonamiento Comercial y UX
1. Eliminar los archivos habría causado que usuarios que tuvieran el enlace guardado o que recordaran la opción recibieran un `404 Not Found` seco, lo que degrada la percepción de la plataforma.
2. Al declararlo formalmente como "Próximamente" (Coming Soon):
   - Se gestionan las expectativas del usuario.
   - Se muestra un adelanto del valor futuro de la plataforma (Gestión Multi-Bodega, Rastreo, Obra).
   - Se cierra la deuda técnica de tener un listado React vacío propenso a errores (ya no intenta cargar un listado que no existe).

## Implementación
- Se sobreescribió `src/app/(dashboard)/(org-required)/inventory/locations/page.tsx`.
- Se eliminó el intento de fetch a tablas inexistentes o vacías de Prisma.
- Se implementó un "Empty State" corporativo indicando que la funcionalidad de control logístico avanzado está en construcción.
- Adicionalmente, el módulo completo quedó envuelto en el `EntitlementGuard` ("locations"), de forma que la promesa de esta futura funcionalidad solo se muestra a usuarios que pagan por ella (retención y upselling).
