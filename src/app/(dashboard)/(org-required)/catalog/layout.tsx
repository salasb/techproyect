import { EntitlementGuard } from "@/components/layout/EntitlementGuard";

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
    return (
        <EntitlementGuard module="catalog">
            {children}
        </EntitlementGuard>
    );
}
