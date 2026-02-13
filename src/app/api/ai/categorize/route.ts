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

            STRICT CONTEXT:
            This is for an IT Project Management system.
            If the description is completely unrelated to project costs (e.g., a cooking recipe, a historical fact), categorize it as "OTROS" and set the reasoning to "Input appears unrelated to project costs".

            Description: "${description}"
        `,
    });

    return Response.json(object);
}
