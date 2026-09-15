"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Menu, Search, Bell, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
  onNotificationClick: () => void;
  notificationCount: number;
  sidebarVisible: boolean;
}

export default function Header({
  title,
  onMenuClick,
  onNotificationClick,
  notificationCount,
  sidebarVisible,
}: HeaderProps) {
  const [searchValue, setSearchValue] = useState("");
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <header className="h-14 border-b border-[var(--border-default)] bg-[var(--neutral-primary)] flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {!sidebarVisible && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-1.5 rounded-[2px] hover:bg-[var(--neutral-secondary-medium)] text-[var(--body)] hover:text-[var(--heading)] transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="size-5" />
          </button>
        )}
        <h1 className="text-[16px] font-semibold text-[var(--heading)] truncate">
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--body)] pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search..."
            className={cn(
              "w-[180px] pl-9 pr-3 py-2 rounded-[2px]",
              "bg-[var(--neutral-secondary-medium)] border border-[var(--border-default-medium)]",
              "text-[14px] text-[var(--body)] placeholder:text-[var(--body-subtle)]",
              "focus:outline-none focus:border-[var(--border-brand)] focus:ring-1 focus:ring-[var(--brand)]",
              "transition-all duration-150"
            )}
          />
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationClick}
          className="relative p-1.5 rounded-[2px] hover:bg-[var(--neutral-secondary-medium)] text-[var(--body)] hover:text-[var(--heading)] transition-colors"
          aria-label={`Notifications (${notificationCount} unread)`}
        >
          <Bell className="size-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-[var(--danger)] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center leading-none px-1">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </button>

        {/* Theme Toggle — next to notification bell */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-[2px] hover:bg-[var(--neutral-secondary-medium)] text-[var(--body)] hover:text-[var(--heading)] transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>

        {/* User */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[var(--border-default)]">
          <div className="size-8 rounded-full bg-[var(--brand-softer)] flex items-center justify-center text-[var(--fg-brand)] text-xs font-bold shrink-0">
            TD
          </div>
          <span className="text-[14px] text-[var(--heading)] font-medium hidden lg:block">
            Tallindolls
          </span>
        </div>

        {/* Date */}
        <div className="hidden xl:flex items-center pl-2 border-l border-[var(--border-default)]">
          <span className="text-[12px] text-[var(--body-subtle)] whitespace-nowrap">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </span>
        </div>
      </div>
    </header>
  );
}
