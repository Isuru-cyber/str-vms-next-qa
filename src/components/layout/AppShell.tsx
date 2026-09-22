"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { ThemeProvider } from "./ThemeContext";
import { FirstLoginPasswordModal } from "./FirstLoginPasswordModal";
import { SessionUser } from "@/lib/auth";

interface AppShellProps {
  user: SessionUser | null;
  children: React.ReactNode;
  unreadNotifications?: number;
}

export const AppShell: React.FC<AppShellProps> = ({
  user,
  children,
  unreadNotifications = 0,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("str_vms_sidebar_collapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileDrawerOpen((prev) => !prev);
    } else {
      setSidebarCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem("str_vms_sidebar_collapsed", String(next));
        return next;
      });
    }
  };

  return (
    <ThemeProvider initialTheme={user?.themePreference || "material"}>
      <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))] relative">
        {/* Mobile Backdrop Overlay */}
        {mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />
        )}

        <Sidebar
          user={user}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          mobileOpen={mobileDrawerOpen}
          onCloseMobile={() => setMobileDrawerOpen(false)}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header
            user={user}
            unreadNotifications={unreadNotifications}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
          />
          <main className="flex-1 overflow-y-auto p-2 sm:p-3 scrollbar-thin">
            <div className="w-full space-y-3">
              {children}
            </div>
          </main>
        </div>
        <FirstLoginPasswordModal user={user} />
      </div>
    </ThemeProvider>
  );
};
