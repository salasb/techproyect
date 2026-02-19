import OrgGate from "@/components/auth/OrgGate";

export default function OrgRequiredLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <OrgGate>{children}</OrgGate>;
}
