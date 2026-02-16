import { createClient } from "@/lib/supabase/server";
import { Users, Building2, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
                                            <span className="text-xs text-slate-500">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {user.organization ? (
                                            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                <Building2 className="w-4 h-4 text-slate-400" />
                                                {user.organization.name}
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">Sin Organización</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {user.organization?.plan ? (
                                            <Badge variant="outline" className="text-xs">
                                                {user.organization.plan}
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.role === 'SUPERADMIN' ? 'default' : user.role === 'ADMIN' ? 'secondary' : 'outline'}
                                            className={user.role === 'SUPERADMIN' ? 'bg-purple-600 hover:bg-purple-700' : ''}
                                        >
                                            <div className="flex items-center gap-1">
                                                {user.role === 'SUPERADMIN' && <Shield className="w-3 h-3" />}
                                                {user.role}
                                            </div>
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {user.createdAt ? format(new Date(user.createdAt), "d MMM yyyy", { locale: es }) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
