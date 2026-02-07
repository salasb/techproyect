import { z } from 'zod';

export const ProjectSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    companyId: z.string().min(1, "La empresa es obligatoria"),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Fecha de inicio inválida",
    }),
    budget: z.number().min(0, "El presupuesto no puede ser negativo").optional(),
    plannedEndDate: z.string().optional().refine((date) => !date || !isNaN(Date.parse(date)), {
        message: "Fecha de término inválida",
    }),
});

export const InvoiceSchema = z.object({
    amount: z.number().positive("El monto debe ser mayor a 0"),
    dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Fecha de vencimiento inválida",
    }),
    paymentTerms: z.number().int().min(0).optional(),
});

export const CostSchema = z.object({
    description: z.string().min(1, "La descripción es obligatoria"),
    amount: z.number().positive("El monto debe ser mayor a 0"),
    category: z.enum(['HONORARIOS', 'LICENCIAS', 'EQUIPAMIENTO', 'OFICINA', 'MARKETING', 'OTROS']),
    date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: "Fecha inválida",
    }),
});
