import { CreateTicketForm } from "@/components/support/CreateTicketForm";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function NewTicketPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-4">
                <Link href="/settings/support">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Nuevo requerimiento</h2>
                    <p className="text-muted-foreground text-sm">Nuestro equipo de soporte revisará tu caso a la brevedad.</p>
                </div>
            </div>

            <CreateTicketForm />
        </div>
    );
}
