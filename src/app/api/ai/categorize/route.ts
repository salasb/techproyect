import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
    const { description } = await req.json();

    const { object } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: z.object({
            category: z.enum(['SERVICIOS', 'HARDWARE', 'SOFTWARE', 'LOGISTICA', 'OTROS']),
            reasoning: z.string().optional(),
        }),
        prompt: `
            Analyze the following cost description and categorize it into one of these categories:
            - SERVICIOS: Professional services, labor, consulting.
            - HARDWARE: Physical equipment, devices, servers, cabling.
            - SOFTWARE: Licenses, subscriptions, cloud services (AWS, Vercel), SaaS.
            - LOGISTICA: Travel, transport, shipping, meals, accommodation.
            - OTROS: Office supplies, taxes, miscellaneous, bank fees.

            Description: "${description}"
        `,
    });

    return Response.json(object);
}
