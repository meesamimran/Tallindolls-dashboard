"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  PenSquare, FileText, Settings,
  PanelLeftClose, PanelLeft, Lightbulb, Clock, Sparkles,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: "Content & Posts", icon: PenSquare, href: "/content" },
  { label: "History", icon: Clock, href: "/history" },
  { label: "Story Detailing", icon: Sparkles, href: "/story-detailing" },
  { label: "Strategy Agent", icon: Lightbulb, href: "/strategy" },
  { label: "Reports", icon: FileText, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

function NavSection({ items, collapsed }: { items: NavItem[]; collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <ul className={cn("flex flex-col", collapsed ? "gap-1" : "gap-2")}>
      {items.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <li key={item.href + item.label}>
            <Link
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center rounded-[2px] font-medium text-[14px] transition-colors duration-150",
                collapsed ? "justify-center px-0 py-2.5" : "px-2 py-2 gap-3",
                isActive
                  ? "bg-[var(--neutral-secondary-strong)] text-[var(--fg-brand-strong)]"
                  : "text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)]"
              )}
            >
              <Icon
                className={cn(
                  "size-5 shrink-0 transition-colors duration-150",
                  !collapsed && isActive && "text-[var(--fg-brand-strong)]",
                  !collapsed && !isActive && "text-[var(--body)] group-hover:text-[var(--heading)]"
                )}
              />
              {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              {!collapsed && item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none",
                    isActive
                      ? "bg-[var(--brand)] text-white"
                      : "bg-[var(--brand-soft)] text-[var(--fg-brand)]"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[var(--neutral-primary-soft)] border-r border-[var(--border-default)] transition-all duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Brand + Collapse Toggle */}
      <div
        className={cn(
          "flex items-center border-b border-[var(--border-default)] shrink-0 px-3 h-14",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" />
            <span className="text-[var(--heading)] font-semibold text-[16px] tracking-tight">
              Tallindolls
            </span>
          </div>
        )}
        {collapsed && (
          <span className="text-[var(--brand)] font-bold text-[16px]">TD</span>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "p-1.5 rounded-[2px] text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors",
            collapsed && "absolute -right-3 top-3 z-10 size-6 rounded-full border border-[var(--border-default)] bg-[var(--neutral-primary)] flex items-center justify-center"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="size-3.5" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection items={navItems} collapsed={collapsed} />
      </nav>

      {/* User Footer — only when expanded */}
      {!collapsed && (
        <div className="border-t border-[var(--border-default)] px-3 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-[var(--brand-softer)] flex items-center justify-center text-[var(--fg-brand)] text-xs font-bold shrink-0">
              TD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-medium text-[var(--heading)] truncate">Tallindolls</p>
              <p className="text-[12px] text-[var(--body-subtle)] truncate">Owner</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
