'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { resolveCommercialDisplay, CommercialDisplayContext } from '@/lib/billing/commercial-display';

const ShellDisplayContext = createContext<CommercialDisplayContext | null>(null);

export function ShellCommercialProvider({ 
    children, 
    userRole, 
    isSuperadmin, 
    subscriptionStatus,
    plan 
}: { 
    children: ReactNode;
    userRole?: string;
    isSuperadmin?: boolean;
    subscriptionStatus?: string;
    plan?: string;
}) {
    const display = resolveCommercialDisplay({
        userRole,
        isSuperadmin,
        subscriptionStatus,
        plan
    });

    return (
        <ShellDisplayContext.Provider value={display}>
            {children}
        </ShellDisplayContext.Provider>
    );
}

export function useShellCommercialDisplay() {
    const context = useContext(ShellDisplayContext);
    if (!context) {
        // Fallback default if provider is missing (failsafe)
        return resolveCommercialDisplay({});
    }
    return context;
}