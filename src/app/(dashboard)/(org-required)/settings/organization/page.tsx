import { createClient } from "@/lib/supabase/server";
import { OrganizationProfileForm } from "@/components/settings/OrganizationProfileForm";
import { updateOrganization } from "@/app/actions/organization";
import { getOrganizationId } from "@/lib/current-org";

export default async function OrganizationPage() {
    const supabase = await createClient();
    const orgId = await getOrganizationId();

    const { data: organization } = await supabase
        .from('Organization')
        .select('*')
        .eq('id', orgId)
        .single();

    if (!organization) {
        return <div>Organización no encontrada</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Perfil de Organización</h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                    Gestiona la identidad corporativa y configuración de tu organización.
                </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
                <OrganizationProfileForm
                    organization={organization}
                    updateAction={updateOrganization}
                />
            </div>
        </div>
    );
}
