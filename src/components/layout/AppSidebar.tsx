import { SidebarContent } from "./SidebarContent";
import { WorkspaceState } from "@/lib/auth/workspace-resolver";

export function AppSidebar({ profile, settings, workspace }: { profile?: any, settings?: any, workspace?: WorkspaceState }) {
    return (
        <aside className="w-64 border-r border-border hidden md:flex flex-col h-screen fixed left-0 top-0 transition-all duration-300 z-50 print:hidden">
            <SidebarContent profile={profile} settings={settings} workspace={workspace} />
        </aside>
    );
}
