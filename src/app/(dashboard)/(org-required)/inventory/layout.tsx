import { EntitlementGuard } from "@/components/layout/EntitlementGuard";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
    return (
        <EntitlementGuard module="inventory">
            {children}
        </EntitlementGuard>
    );
}
