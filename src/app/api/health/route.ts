import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    const startTime = Date.now();
    const systemInfo = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV,
        services: {
            database: 'UNKNOWN',
            stripe: 'READY' // Logic check could be added if needed
        },
        latencyMs: 0
    };

    try {
        // 1. Database Heartbeat
        await prisma.$queryRaw`SELECT 1`;
        systemInfo.services.database = 'CONNECTED';
    } catch (error: any) {
        systemInfo.status = 'DEGRADED';
        systemInfo.services.database = 'DISCONNECTED';
        console.error("[HealthCheck] Database failure:", error.message);
    }

    systemInfo.latencyMs = Date.now() - startTime;

    return NextResponse.json(systemInfo, { 
        status: systemInfo.status === 'UP' ? 200 : 503 
    });
}
