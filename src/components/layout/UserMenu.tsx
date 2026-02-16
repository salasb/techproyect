'use client';

import { useState, useRef, useEffect } from "react";
import { LogOut, User, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface UserMenuProps {
    profile: any;
}

export function UserMenu({ profile }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            await supabase.auth.signOut();
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error('Error logging out:', error);
            setIsLoading(false);
        }
    };

    const name = profile?.name || 'Usuario';
    const email = profile?.email || '';
    const initials = name.substring(0, 2).toUpperCase();

    return (
        <div className="relative" ref={menuRef}>
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left border border-transparent hover:border-border"
            >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                </div>
                <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu (Pop-up from bottom) */}
            {isOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-popover border border-border rounded-xl shadow-lg p-1 animate-in slide-in-from-bottom-2 zoom-in-95 z-50">
                    <div className="px-3 py-2 border-b border-border/50 mb-1">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mi Cuenta</p>
                    </div>

                    <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                        onClick={() => router.push('/settings')}
                    >
                        <User className="w-4 h-4 text-muted-foreground" />
                        Perfil & Ajustes
                    </button>

                    <button
                        onClick={() => {
                            setIsOpen(false);
                            setShowLogoutConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmDialog
                isOpen={showLogoutConfirm}
                title="¿Cerrar Sesión?"
                description="¿Estás seguro de que quieres salir del sistema?"
                confirmText="Sí, Salir"
                cancelText="Cancelar"
                variant="danger"
                isLoading={isLoading}
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </div>
    );
}
