"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search, Plus } from "lucide-react";

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    name?: string;
    required?: boolean;
    className?: string;
    emptyMessage?: string;
    allowCreate?: boolean; // If true, shows "Create New" option
    onCreateClick?: () => void;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    name,
    required,
    className = "",
    emptyMessage = "No se encontraron resultados.",
    allowCreate = false,
    onCreateClick
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Hidden input for form submission */}
            <input type="hidden" name={name} value={value || ""} required={required} />

            {/* Trigger */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-lg border bg-white dark:bg-zinc-950 text-left text-sm transition-all outline-none focus:ring-2 focus:ring-blue-500 ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-zinc-300 dark:border-zinc-700'
                    } ${!value ? 'text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'}`}
            >
                <span className="truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronsUpDown className="w-4 h-4 text-zinc-400 shrink-0 opacity-50" />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">

                    {/* Search Input */}
                    <div className="flex items-center px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                        <Search className="w-4 h-4 text-zinc-400 mr-2" />
                        <input
                            type="text"
                            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-zinc-400 text-zinc-900 dark:text-zinc-100"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* Options List */}
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="py-6 text-center text-sm text-zinc-500">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`relative w-full flex items-center select-none rounded-md py-1.5 pl-2 pr-8 text-sm outline-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${value === option.value
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                            : 'text-zinc-900 dark:text-zinc-100'
                                        }`}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {value === option.value && (
                                        <span className="absolute right-2 flex items-center">
                                            <Check className="w-4 h-4" />
                                        </span>
                                    )}
                                </button>
                            ))
                        )}

                        {/* Create New Option */}
                        {allowCreate && (
                            <div className="border-t border-zinc-100 dark:border-zinc-800 mt-1 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (onCreateClick) onCreateClick();
                                        setIsOpen(false);
                                    }}
                                    className="w-full relative flex items-center select-none rounded-md py-1.5 pl-2 pr-2 text-sm outline-none cursor-pointer text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 font-medium"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Crear Nuevo Cliente
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
