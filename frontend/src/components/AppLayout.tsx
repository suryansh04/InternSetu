import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bookmark, LogOut, Mic, Send, Target, UserRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthContext } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

const navItems = [
  { icon: Target, label: "Top matches", path: "/app" },
  { icon: Bookmark, label: "Saved", path: "/app/saved" },
  { icon: Send, label: "Applied", path: "/app/applied" },
  { icon: Mic, label: "Interview practice", path: "/app/interview" },
];

export default function AppLayout() {
  const { currentUser, logout } = useAuthContext();
  const profile = useProfile();
  const name = profile.data?.name || currentUser?.displayName;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = navItems.find((item) => item.path === pathname) ?? navItems[0];

  const handleLogout = async () => {
    try {
      await logout();
      queryClient.clear(); // drop this user's cached data before anyone else signs in
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="border-b px-4 py-4">
          <Logo to="/app" />
        </SidebarHeader>

        <SidebarContent className="px-2 py-4">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={pathname === item.path}>
                  <NavLink to={item.path} end>
                    <item.icon />
                    <span>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/profile">
                  <UserRound />
                  <span className="truncate">{name || "Your profile"}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout}>
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center gap-3 border-b px-4 py-3 md:px-8">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">{current.label}</h1>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
