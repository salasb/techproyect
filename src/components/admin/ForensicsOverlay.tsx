"use client";

import React, { useRef } from 'react';

let overlayMountCount = 0;

export function ForensicsOverlay({
    debugInfo,
    alertsData
}: {
    debugInfo: any;
    alertsData: any[];
}) {
    const instanceId = useRef(++overlayMountCount);

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-black/90 text-green-400 p-4 rounded-xl text-[10px] font-mono whitespace-pre shadow-2xl max-w-sm overflow-auto">
            <p className="font-bold text-white mb-2">FORENSICS OVERLAY v5</p>
            <p className="text-yellow-400 font-bold mb-2">OVERLAY_INSTANCE_ID: {instanceId.current}</p>
            <p>Build SHA: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0,7) || 'local'}</p>
            <p>Env: {process.env.NEXT_PUBLIC_VERCEL_ENV || 'development'}</p>
            <p>Rendered At: {new Date().toISOString()}</p>
            <div className="h-px w-full bg-white/20 my-2" />
            <p>rawAlertsTotal: {debugInfo.rawAlertsTotal}</p>
            <p>rawAlertsUniqueSemantic: {debugInfo.rawAlertsUniqueSemantic}</p>
            <p>adapterAlertsOut: {debugInfo.adapterAlertsOut}</p>
            <p>adapterHiddenByDedupe: {debugInfo.adapterHiddenByDedupe}</p>
            <p>gridPropsCount: {alertsData.length}</p>
            <p>panelSourceName: "Static Fixed List (3 items)"</p>
            <p>panelPropsCount: 3</p>
            <div className="h-px w-full bg-white/20 my-2" />
            <p>First 5 keys:</p>
            {alertsData.slice(0,5).map((a, i) => (
                <p key={`dbg-ov-${i}`} className="truncate">- {a.fingerprint?.slice(-12)} | {a.id?.slice(-6)}</p>
            ))}
        </div>
    );
}
