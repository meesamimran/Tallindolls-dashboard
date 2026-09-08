"use client";

import { useState, useCallback } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";
import CronPoller from "@/components/CronPoller";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

  const handleMenuClick = useCallback(() => {
    setMobileSidebarOpen(true);
  }, []);

  const handleNotificationClick = useCallback(() => {
    setNotificationCount(0);
  }, []);

  const handleCloseMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--neutral-primary)]">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex shrink-0 h-full relative">
          <Sidebar
            collapsed={desktopCollapsed}
            onToggle={() => setDesktopCollapsed((p) => !p)}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleCloseMobileSidebar}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 h-full z-40">
              <Sidebar
                collapsed={false}
                onToggle={handleCloseMobileSidebar}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header
            title="Dashboard"
            onMenuClick={handleMenuClick}
            onNotificationClick={handleNotificationClick}
            notificationCount={notificationCount}
            sidebarVisible={!mobileSidebarOpen}
          />

          <main className="flex-1 overflow-y-auto p-6 bg-[var(--neutral-primary)]">
            {children}
          </main>
        </div>
      </div>
      <CronPoller />
    </ThemeProvider>
  );
}
