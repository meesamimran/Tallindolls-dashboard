"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (dateTime: string) => void;
  initialDate?: string; // ISO date string for editing existing schedule
}

export default function ScheduleModal({ open, onClose, onConfirm, initialDate }: ScheduleModalProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (initialDate) return new Date(initialDate).getDate();
    return today.getDate();
  });
  // Store hour in 12-hour format internally (1-12) to avoid AM/PM conversion bugs.
  // get24Hour() converts to 24h for output. selectedAmPm tracks meridian.
  const [selectedHour12, setSelectedHour12] = useState(() => {
    const h24 = initialDate ? new Date(initialDate).getHours() : Math.min(today.getHours() + 1, 23);
    if (h24 === 0) return 12;       // 12 AM
    if (h24 > 12) return h24 - 12;   // 1-11 PM
    return h24;                      // 1-11 AM or 12 PM
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (initialDate) return new Date(initialDate).getMinutes();
    return 0;
  });
  const [selectedAmPm, setSelectedAmPm] = useState(() => {
    const h24 = initialDate ? new Date(initialDate).getHours() : Math.min(today.getHours() + 1, 23);
    return h24 >= 12 ? "PM" : "AM";
  });

  // Converts 12-hour + AM/PM → 24-hour (0-23). Clamped to valid range.
  const get24Hour = (): number => {
    if (selectedAmPm === "AM") {
      return selectedHour12 === 12 ? 0 : selectedHour12; // 12 AM → 0, 1-11 AM → 1-11
    }
    return selectedHour12 === 12 ? 12 : selectedHour12 + 12; // 12 PM → 12, 1-11 PM → 13-23
  };
  const displayHour = selectedHour12; // Always 1-12

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun

  const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const handleConfirm = () => {
    if (!selectedDay) return;
    const h24 = get24Hour();
    // Store as simple local string: "2026-07-22T16:15" (24h format, no timezone)
    // Server compares using local time too — no conversion issues.
    onConfirm(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}T${String(h24).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}`);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-2xl w-full max-w-[360px] p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-semibold text-[var(--heading)] text-center">
          Schedule Post
        </h3>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={goPrevMonth} className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--neutral-secondary-medium)] text-[var(--body)] transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-[14px] font-semibold text-[var(--heading)]">{monthLabel}</span>
          <button onClick={goNextMonth} className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--neutral-secondary-medium)] text-[var(--body)] transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {dayNames.map((d) => (
            <span key={d} className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase">{d}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
            const isSelected = day === selectedDay;
            const isPast = viewYear < today.getFullYear() ||
              (viewYear === today.getFullYear() && viewMonth < today.getMonth()) ||
              (viewYear === today.getFullYear() && viewMonth === today.getMonth() && day < today.getDate());
            return (
              <button
                key={day}
                onClick={() => !isPast && setSelectedDay(day)}
                disabled={isPast}
                className={cn(
                  "size-9 rounded-[2px] text-[13px] font-medium transition-colors",
                  isSelected
                    ? "text-white"
                    : isPast
                      ? "text-[var(--body-subtle)]/30 cursor-not-allowed"
                      : "text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)]"
                )}
                style={isSelected ? GRADIENT_BRAND : undefined}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Time picker — 12-hour format */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-default)]">
          <Clock className="size-4 text-[var(--brand)] shrink-0" />
          <select
            value={displayHour}
            onChange={(e) => setSelectedHour12(Number(e.target.value))}
            className="w-14 px-2 py-1.5 text-[13px] rounded-[2px] focus:outline-none cursor-pointer appearance-none"
            style={{ backgroundColor: "var(--neutral-secondary-medium)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }}
          >
            {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
              <option key={h} value={h} style={{ color: "#111827", background: "#ffffff" }}>{String(h).padStart(2, "0")}</option>
            ))}
          </select>
          <span className="text-[var(--body)]">:</span>
          <select
            value={selectedMinute}
            onChange={(e) => setSelectedMinute(Number(e.target.value))}
            className="w-14 px-2 py-1.5 text-[13px] rounded-[2px] focus:outline-none cursor-pointer appearance-none"
            style={{ backgroundColor: "var(--neutral-secondary-medium)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }}
          >
            {Array.from({ length: 60 }).map((_, m) => (
              <option key={m} value={m} style={{ color: "#111827", background: "#ffffff" }}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
          <select
            value={selectedAmPm}
            onChange={(e) => {
              const ampm = e.target.value;
              setSelectedAmPm(ampm);
            }}
            className="w-14 px-2 py-1.5 text-[13px] rounded-[2px] focus:outline-none cursor-pointer appearance-none"
            style={{ backgroundColor: "var(--neutral-secondary-medium)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }}
          >
            <option value="AM" style={{ color: "#111827", background: "#ffffff" }}>AM</option>
            <option value="PM" style={{ color: "#111827", background: "#ffffff" }}>PM</option>
          </select>
        </div>

        {/* Selected preview */}
        {selectedDay && (
          <p className="text-[12px] text-[var(--body)] text-center">
            {new Date(viewYear, viewMonth, selectedDay, get24Hour(), selectedMinute).toLocaleString("default", {
              weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--body)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDay}
            className="px-4 py-2 text-[13px] font-semibold text-white rounded-[2px] disabled:opacity-50 transition-opacity hover:opacity-90"
            style={GRADIENT_BRAND}
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
