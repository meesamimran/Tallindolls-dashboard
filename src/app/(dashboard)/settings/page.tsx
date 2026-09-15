"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Settings,
  User,
  Bell,
  Database,
  Globe,
  Shield,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

// ============================================================
// Constants
// ============================================================

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

// ============================================================
// Toggle Switch
// ============================================================

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-default)]">
      <div className="flex-1 mr-4">
        <p className="text-[14px] font-medium text-[var(--heading)]">
          {label}
        </p>
        {description && (
          <p className="text-[12px] text-[var(--body-subtle)] mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex w-10 h-5 rounded-full transition-colors shrink-0 focus:outline-none",
          checked ? "bg-[var(--brand)]" : "bg-[var(--neutral-quaternary)]"
        )}
        role="switch"
        aria-checked={checked}
      >
        <span
          className={cn(
            "inline-block w-4 h-4 rounded-full bg-white shadow transition-transform absolute top-0.5",
            checked ? "translate-x-[22px]" : "translate-x-[2px]"
          )}
        />
      </button>
    </div>
  );
}

// ============================================================
// Component
// ============================================================

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    agentActivity: true,
    inventoryWarnings: true,
    marketingAlerts: false,
  });

  const updateNotification =
    (key: keyof typeof notifications) => (value: boolean) => {
      setNotifications((prev) => ({ ...prev, [key]: value }));
    };

  return (
    <div className="max-w-[1200px] mx-auto px-6 space-y-8">
      {/* Page Title */}
      <h1 className="text-[28px] font-semibold text-[var(--heading)]">
        Settings
      </h1>

      {/* Section 1: Profile */}
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-default)]">
          <User className="h-4 w-4 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Profile
          </h2>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="flex items-center justify-center w-11 h-11 rounded-full text-[16px] font-semibold"
              style={{
                backgroundColor: "var(--brand-softer)",
                color: "var(--brand)",
              }}
            >
              TD
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[var(--heading)]">
                Tallindolls
              </p>
              <p className="text-[14px] text-[var(--body)]">
                hello@tallindolls.com
              </p>
            </div>
            <span
              className="ml-auto inline-flex items-center px-2 py-0.5 rounded-[2px] text-[12px] font-medium border"
              style={{
                backgroundColor: "var(--brand-softer)",
                color: "var(--fg-brand-strong)",
                borderColor: "var(--border-brand-subtle)",
              }}
            >
              Owner
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Notifications */}
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-default)]">
          <Bell className="h-4 w-4 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Notifications
          </h2>
        </div>
        <div className="px-5">
          <ToggleSwitch
            checked={notifications.emailAlerts}
            onChange={updateNotification("emailAlerts")}
            label="Email alerts"
            description="Receive report summaries and critical alerts via email"
          />
          <ToggleSwitch
            checked={notifications.pushNotifications}
            onChange={updateNotification("pushNotifications")}
            label="Push notifications"
            description="Real-time browser notifications for urgent events"
          />
          <ToggleSwitch
            checked={notifications.agentActivity}
            onChange={updateNotification("agentActivity")}
            label="Agent activity alerts"
            description="Get notified when AI agents complete tasks"
          />
          <ToggleSwitch
            checked={notifications.inventoryWarnings}
            onChange={updateNotification("inventoryWarnings")}
            label="Inventory warnings"
            description="Low stock and restock recommendation alerts"
          />
          <div className="border-b-0">
            <ToggleSwitch
              checked={notifications.marketingAlerts}
              onChange={updateNotification("marketingAlerts")}
              label="Marketing alerts"
              description="Campaign performance changes and budget notifications"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Data Sources */}
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-default)]">
          <Database className="h-4 w-4 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Data Sources
          </h2>
        </div>
        <div className="px-5">
          {[
            "Facebook Ads",
            "Klaviyo",
            "Google Analytics",
            "Shopify",
          ].map((source, i, arr) => (
            <div
              key={source}
              className={cn(
                "flex items-center gap-3 py-3",
                i < arr.length - 1
                  ? "border-b border-[var(--border-default)]"
                  : ""
              )}
            >
              <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
              <span className="text-[14px] font-medium text-[var(--heading)] flex-1">
                {source}
              </span>
              <span className="text-[12px] text-[var(--success)]">
                Connected
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Regional */}
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-default)]">
          <Globe className="h-4 w-4 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Regional
          </h2>
        </div>
        <div className="px-5">
          {[
            { label: "CURRENCY", value: "EUR" },
            { label: "TIMEZONE", value: "Europe/Tallinn (UTC+3)" },
            { label: "LANGUAGE", value: "English" },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className={cn(
                "py-3",
                i < arr.length - 1
                  ? "border-b border-[var(--border-default)]"
                  : ""
              )}
            >
              <p className="text-[12px] text-[var(--body-subtle)] uppercase tracking-wider mb-0.5">
                {row.label}
              </p>
              <p className="text-[14px] font-medium text-[var(--heading)]">
                {row.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Security */}
      <div className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--border-default)]">
          <Shield className="h-4 w-4 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Security
          </h2>
        </div>
        <div className="px-5">
          {[
            {
              label: "PASSWORD",
              value: "Last changed 30 days ago",
              action: true,
            },
            {
              label: "TWO-FACTOR AUTH",
              value: "Enabled",
              success: true,
            },
            {
              label: "SESSION TIMEOUT",
              value: "24 hours",
            },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className={cn(
                "py-3 flex items-center justify-between",
                i < arr.length - 1
                  ? "border-b border-[var(--border-default)]"
                  : ""
              )}
            >
              <div>
                <p className="text-[12px] text-[var(--body-subtle)] uppercase tracking-wider mb-0.5">
                  {row.label}
                </p>
                <p className="text-[14px] font-medium text-[var(--heading)] flex items-center gap-1.5">
                  {row.value}
                  {row.success && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />
                  )}
                </p>
              </div>
              {row.action && (
                <button className="text-[12px] font-medium text-[var(--brand)] hover:underline">
                  Change password
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
