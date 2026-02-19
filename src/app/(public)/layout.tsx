export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
            {/* Minimal Header could go here if needed, but keeping it clean for focus */}
            <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </div>
            <footer className="py-6 text-center text-xs text-muted-foreground border-t border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50">
                <p>Documento generado con seguridad por <span className="font-bold text-zinc-900 dark:text-zinc-100">TechProyect</span></p>
            </footer>
        </div>
    );
}
