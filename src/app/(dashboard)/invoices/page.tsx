export default function InvoicesPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Facturación</h2>
                    <p className="text-muted-foreground text-sm mt-1">Gestiona tus documentos tributarios</p>
                </div>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20">
                    + Nueva Factura
                </button>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-foreground">No hay facturas registradas</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                    Aún no has emitido facturas. Cuando crees una, aparecerá listada aquí.
                </p>
            </div>
        </div>
    )
}
