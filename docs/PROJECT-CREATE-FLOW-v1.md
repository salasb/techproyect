# Flujo Canónico: Creación de Proyectos (v1.0)

## Arquitectura del Formulario
El formulario de creación de proyectos (`CreateProjectForm.tsx`) sigue un patrón de **Manejador de Eventos Controlado** en lugar de depender puramente de Server Actions nativas en el `action` prop, para garantizar el control del estado de carga y el feedback visual.

### Componentes Clave
1. **Vista:** `src/app/(dashboard)/(org-required)/projects/new/page.tsx`
2. **Formulario:** `src/components/projects/CreateProjectForm.tsx`
3. **Acción de Servidor:** `createProject` en `src/app/actions/projects.ts`

### Reglas de Control de Estado
- **Carga:** Se activa `setIsLoading(true)` al inicio del submit. Se libera `setIsLoading(false)` en CUALQUIER camino de falla (error de validación, error de servidor o excepción).
- **Feedback:** 
  - Loading Toast inmediato.
  - Success Toast antes de redirección.
  - Error Toast con el mensaje específico del servidor.
- **Resiliencia:** El formulario NO se resetea si falla el envío, conservando la entrada del usuario.

## Validación
Se utiliza `validateProject` en el servidor para asegurar la integridad de los datos antes de la persistencia en Prisma.
