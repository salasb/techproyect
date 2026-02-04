import { Bell, Search, User } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function AppHeader() {
    return (
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-colors flex items-center justify-between px-6">
            <div className="flex items-center w-1/3">
                <div className="relative w-full max-w-md hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Buscar proyectos..."
                        className="w-full pl-10 pr-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-900 border-none rounded-full focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-4">
                <ThemeToggle />
                <button className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></span>
                </button>

                <div className="flex items-center space-x-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col text-right hidden sm:block">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Usuario Demo</span>
                        <span className="text-xs text-zinc-500">Admin</span>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                        <User className="w-5 h-5" />
                    </div>
                </div>
            </div>
        </header>
    );
}
