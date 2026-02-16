import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserAdminRow } from "@/components/admin/UserAdminRow";

export default async function AdminUsersPage() {
    const supabase = await createClient();

    // Fetch all profiles with their organization
    const { data: profiles, error } = await supabase
        .from('Profile')
        .select(`
            *,
            organization:Organization(name, plan)
        `)
        .order('createdAt', { ascending: false });

    if (error) {
        console.error("Error fetching admin users:", error);
    }

    const { count } = await supabase.from('Profile').select('*', { count: 'exact', head: true });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Usuarios Globales</h2>
                    <p className="text-slate-500">Listado completo de usuarios registrados en la plataforma.</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border shadow-sm">
                    <span className="text-sm font-medium text-slate-500">Total Usuarios</span>
                    <div className="text-2xl font-bold text-slate-800">{count || 0}</div>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Directorio de Usuarios
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Organización</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Registro</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {profiles?.map((user) => (
                                <UserAdminRow key={user.id} user={user} />
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
