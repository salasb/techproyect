import { EntitlementGuard } from "@/components/layout/EntitlementGuard";

export default function ScanLayout({ children }: { children: React.ReactNode }) {
    return (
        <EntitlementGuard module="qr">
            {children}
        </EntitlementGuard>
    );
}
