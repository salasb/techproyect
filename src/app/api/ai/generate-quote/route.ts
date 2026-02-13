import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
    const { prompt } = await req.json();

    const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
            items: z.array(z.object({
                detail: z.string().describe("Description of the item or service"),
                quantity: z.number().describe("Quantity needed"),
                unit: z.enum(['UN', 'GL', 'HR', 'MT', 'M2', 'M3', 'VG']).describe("Unit of measure. Use UN for items, HR for labor, GL for lump sum."),
                costNet: z.number().describe("Estimated unit cost in CLP"),
                priceNet: z.number().describe("Estimated unit price in CLP (Cost + Margin)"),
                sku: z.string().optional().describe("Optional SKU if relevant")
            }))
        }),
        system: `You are an expert IT Project Manager and Estimator.
        Your goal is to break down a high-level requirement into a detailed list of materials, hardware, licenses, and labor.

        STRICT BOUNDARIES:
        - You MUST ONLY generate quotes for IT, technology, software development, networking, and related technical projects.
        - If the prompt is about history, cooking, sports, general knowledge, or anything unrelated to technology projects/services, you MUST return a single item with:
          - detail: "ERROR: Solicitud fuera de contexto. Solo puedo cotizar proyectos tecnológicos."
          - quantity: 0
          - unit: "UN"
          - costNet: 0
          - priceNet: 0
        - Do NOT answer questions about general topics. Stick strictly to estimating costs for the project described.

        Focus on:
        - IT Infrastructure (Cabling, Racks, UPS)
        - Hardware (Laptops, Servers, Screens, Mounts)
        - Software (Licenses, Cloud Subscriptions)
        - Professional Services (Installation, Configuration, Management)
        
        Always include "Mano de Obra" or "Servicios Profesionales" if installation is implied.
        Estimate costs in CLP (Chilean Pesos). 1 USD ~ 950 CLP.
        Apply a reasonable margin (20-40%) for the price.
        `,
        prompt: `Generate a quote for: "${prompt}"`,
    });

    return Response.json(object);
}
