'use client';

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarContent } from "./SidebarContent";

export function MobileNav({ profile }: { profile?: any }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="md:hidden flex flex-col print:hidden">
            {/* Header Mobile */}
            <div className="bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-40">
                <img src="/techwise logo negro.png" alt="TechWise" className="h-8 w-auto object-contain" />
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* Drawer Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Drawer Panel */}
                    <div className="relative w-[280px] h-full bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
                        <div className="absolute top-4 right-4 z-50">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="h-full overflow-hidden pt-2">
                            <SidebarContent
                                onLinkClick={() => setIsOpen(false)}
                                profile={profile}
                                badges={{ projects: 0, quotes: 0 }} // Simplified temporarily
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
