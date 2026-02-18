"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ReadOnlyModal } from "./ReadOnlyModal";

interface PaywallContextType {
    showPaywall: () => void;
    hidePaywall: () => void;
    handleActionError: (error: any) => boolean;
}

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const showPaywall = useCallback(() => setIsOpen(true), []);
    const hidePaywall = useCallback(() => setIsOpen(false), []);

    const handleActionError = useCallback((error: any) => {
        if (error?.message === "READ_ONLY_MODE" || error === "READ_ONLY_MODE") {
            setIsOpen(true);
            return true;
        }
        return false;
    }, []);

    return (
        <PaywallContext.Provider value={{ showPaywall, hidePaywall, handleActionError }}>
            {children}
            <ReadOnlyModal isOpen={isOpen} onClose={hidePaywall} />
        </PaywallContext.Provider>
    );
}

export function usePaywall() {
    const context = useContext(PaywallContext);
    if (context === undefined) {
        throw new Error("usePaywall must be used within a PaywallProvider");
    }
    return context;
}
