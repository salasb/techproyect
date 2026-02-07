"use client";

import { useState, useEffect, forwardRef } from "react";
import { DollarSign } from "lucide-react";

interface MoneyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    defaultValue?: string | number;
    onValueChange?: (value: number) => void;
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    ({ className, defaultValue, onValueChange, name, ...props }, ref) => {
        const [displayValue, setDisplayValue] = useState("");
        const [rawValue, setRawValue] = useState<number>(0);

        useEffect(() => {
            if (defaultValue !== undefined && defaultValue !== null) {
                const num = Number(defaultValue);
                if (!isNaN(num)) {
                    setRawValue(num);
                    setDisplayValue(formatCurrency(num));
                }
            }
        }, [defaultValue]);

        const formatCurrency = (val: number) => {
            return new Intl.NumberFormat("es-CL", {
                maximumFractionDigits: 0,
            }).format(val);
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            // Allow numbers only
            const input = e.target.value.replace(/[^0-9]/g, "");

            if (input === "") {
                setDisplayValue("");
                setRawValue(0);
                if (onValueChange) onValueChange(0);
                return;
            }

            const num = parseInt(input, 10);
            if (!isNaN(num)) {
                setRawValue(num);
                setDisplayValue(formatCurrency(num));
                if (onValueChange) onValueChange(num);
            }
        };

        return (
            <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400 pointer-events-none" />
                <input
                    {...props}
                    ref={ref}
                    type="text" // Must be text to support formatting
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleChange}
                    className={`pl-9 pr-3 py-2 w-full rounded-lg border border-input bg-background text-sm font-mono focus:ring-2 focus:ring-primary outline-none ${className}`}
                />
                <input type="hidden" name={name} value={rawValue} />
            </div>
        );
    }
);

MoneyInput.displayName = "MoneyInput";
