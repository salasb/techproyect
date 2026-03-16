import { getClients } from "@/actions/clients";
import { ClientsClientView } from "@/components/clients/ClientsClientView";
import { resolveAccessContext } from "@/lib/auth/access-resolver";

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
    const context = await resolveAccessContext();
    const clients = await getClients();

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Clientes</h1>
                    <p className="text-muted-foreground mt-1">Gestión de cartera de clientes</p>
                </div>
            </div>

            <ClientsClientView 
                initialClients={clients} 
                activeOrgId={context.activeOrgId} 
            />
        </div>
    );
}
