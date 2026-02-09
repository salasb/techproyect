import { getClients } from "@/actions/clients";
import { CreateOpportunityForm } from "@/components/crm/CreateOpportunityForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function NewOpportunityPage() {
    const clients = await getClients();

    // Transform clients for the form
    const clientOptions = clients.map(c => ({ id: c.id, name: c.name }));

    return (
        <div className="container max-w-4xl py-6">
            <Link href="/crm/pipeline" className="flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Volver al Pipeline
            </Link>

            <CreateOpportunityForm clients={clientOptions} />
        </div>
    );
}
