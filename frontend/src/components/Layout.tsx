"use client";

import { Button } from "@/shadcn/ui/button";
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
} from "@/shadcn/ui/sidebar";
import { Target, BookOpen, Bookmark, Send, User, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";

export default function Layout() {
  const [userName, setUserName] = useState("User");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const storedUserData = sessionStorage.getItem("userData");
    if (storedUserData) {
      try {
        const userData = JSON.parse(storedUserData);
        setUserName(userData.name || "User");
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const sidebarItems = [
    { icon: Target, label: "Top Matches", path: "/main" },
    { icon: BookOpen, label: "Interview Prep", path: "/main/interview-prep" },
    { icon: Bookmark, label: "Saved", path: "/main/saved" },
    { icon: Send, label: "Applied", path: "/main/applied" },
    { icon: User, label: "Profile", path: "/main/profile" },
    { icon: Settings, label: "Settings", path: "/main/settings" },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const getPageTitle = () => {
    const currentPath = location.pathname;
    switch (currentPath) {
      case "/main/matches":
      case "/main":
        return `Top Matches for ${userName}`;
      case "/main/interview-prep":
        return "Interview Prep";
      case "/main/saved":
        return "Saved Jobs";
      case "/main/applied":
        return "Applied Jobs";
      case "/main/profile":
        return "Profile";
      case "/main/settings":
        return "Settings";
      default:
        return `Top Matches for ${userName}`;
    }
  };

  const isActiveRoute = (itemPath) => {
    const currentPath = location.pathname;
    if (itemPath === "/main/matches" && currentPath === "/main") {
      return true; // Default route
    }
    return currentPath === itemPath;
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="border-b px-6 py-4">
            <h1 className="text-2xl font-bold">InternSetu</h1>
          </SidebarHeader>

          <SidebarContent className="px-4 py-4">
            <SidebarMenu className="space-y-2">
              {sidebarItems.map((item, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton
                    isActive={isActiveRoute(item.path)}
                    className="w-full justify-start gap-3"
                    onClick={() => handleNavigation(item.path)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleNavigation("/main/settings")}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1">
          <div className="flex-1 p-8">
            <div className="flex items-center gap-4 mb-8">
              <SidebarTrigger />
              <h2 className="text-3xl font-bold">{getPageTitle()}</h2>
            </div>

            {/* This is where the page content will be rendered */}
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
