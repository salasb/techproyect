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

    const [message, setMessage] = useState<string | undefined>(undefined);

    const showPaywall = useCallback((msg?: string) => {
        setMessage(msg);
        setIsOpen(true);
    }, []);

    const hidePaywall = useCallback(() => {
        setIsOpen(false);
        setMessage(undefined);
    }, []);

    const handleActionError = useCallback((error: any) => {
        const errorMsg = error?.message || error || "";
        if (typeof errorMsg === 'string' && errorMsg.startsWith("READ_ONLY_MODE")) {
            const parts = errorMsg.split(":");
            const customMessage = parts.length > 1 ? parts.slice(1).join(":") : undefined;
            setMessage(customMessage);
            setIsOpen(true);
            return true;
        }
        return false;
    }, []);

    return (
        <PaywallContext.Provider value={{ showPaywall, hidePaywall, handleActionError }}>
            {children}
            <ReadOnlyModal isOpen={isOpen} onClose={hidePaywall} message={message} />
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
