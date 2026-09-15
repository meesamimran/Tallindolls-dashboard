"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Camera, Globe, Heart, MessageCircle, Eye, MousePointerClick,
  PenSquare, Clock, Send, CheckCircle2, Store, ArrowRight, Layers, Sparkles,
} from "lucide-react";

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

// Platform accent colors (kept inside the design-system ramp family).
const IG_COLOR = "#D94FB0"; // brand pink
const FB_COLOR = "#38BDF8"; // sky blue
const GRID = "rgba(255,255,255,0.08)";
const AXIS = "#6B7280";

// ── Types (match /api/insights/* responses) ──

interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  impressions: number;
  saves: number;
  engagement: number;
  views?: number;
  clicks?: number;
}

interface PlatformPost {
  id: string;
  platform: "instagram" | "facebook";
  caption: string;
  permalink: string;
  timestamp: string;
  metrics: PostMetrics;
}

interface PlatformInsights {
  posts?: PlatformPost[];
  error?: string;
}

// ── Helpers ──

function sum(posts: PlatformPost[] | undefined, key: keyof PostMetrics): number {
  if (!posts) return 0;
  return posts.reduce((acc, p) => acc + ((p.metrics?.[key] as number) ?? 0), 0);
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function readHistoryCounts() {
  if (typeof window === "undefined")
    return { draft: 0, scheduled: 0, published: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem("published-posts") || "[]");
    if (!Array.isArray(raw)) return { draft: 0, scheduled: 0, published: 0 };
    return raw.reduce(
      (acc, p) => {
        const s = p?.status;
        if (s === "published") acc.published++;
        else if (s === "scheduled") acc.scheduled++;
        else acc.draft++;
        return acc;
      },
      { draft: 0, scheduled: 0, published: 0 }
    );
  } catch {
    return { draft: 0, scheduled: 0, published: 0 };
  }
}

async function fetchInsights(path: string): Promise<PlatformInsights> {
  try {
    const res = await fetch(path);
    const json = await res.json();
    if (!res.ok || json.error) return { error: json.error || "unavailable" };
    return json as PlatformInsights;
  } catch {
    return { error: "unavailable" };
  }
}

function engagementOf(p: PlatformPost): number {
  const m = p.metrics;
  return (m?.likes ?? 0) + (m?.comments ?? 0) + (m?.shares ?? 0);
}

// ── KPI card ──

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className={cn(CARD, "p-4 flex items-center gap-3.5")}>
      <div
        className="size-10 shrink-0 rounded-[2px] flex items-center justify-center"
        style={{ backgroundColor: `${accent}1f`, color: accent }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[24px] font-semibold text-[var(--heading)] leading-none tabular-nums">
          {value}
        </p>
        <p className="text-[12px] text-[var(--body-subtle)] mt-1 truncate">{label}</p>
        <p className="text-[11px] text-[var(--body-subtle)] truncate">{sub}</p>
      </div>
    </div>
  );
}

// ── Page ──

export default function OverviewPage() {
  const [ig, setIg] = useState<PlatformInsights | null>(null);
  const [fb, setFb] = useState<PlatformInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState({ draft: 0, scheduled: 0, published: 0 });

  useEffect(() => {
    async function load() {
      const [igRes, fbRes] = await Promise.all([
        fetchInsights("/api/insights/instagram"),
        fetchInsights("/api/insights/facebook"),
      ]);
      setIg(igRes);
      setFb(fbRes);
      setHistory(readHistoryCounts());
      setLoading(false);
    }
    load();
  }, []);

  const igPosts = ig?.posts ?? [];
  const fbPosts = fb?.posts ?? [];
  const igConnected = !ig?.error;
  const fbConnected = !fb?.error;
  const allPosts = useMemo(() => [...igPosts, ...fbPosts], [igPosts, fbPosts]);

  const totalPosts = igPosts.length + fbPosts.length;
  const totalLikes = sum(igPosts, "likes") + sum(fbPosts, "likes");
  const totalComments = sum(igPosts, "comments") + sum(fbPosts, "comments");
  const totalEngagement = sum(igPosts, "engagement") + sum(fbPosts, "engagement");
  const igEng = sum(igPosts, "engagement");
  const fbEng = sum(fbPosts, "engagement");

  // Engagement per day (real, from post timestamps).
  const series = useMemo(() => {
    const byDay = new Map<string, number>();
    allPosts.forEach((p) => {
      if (!p.timestamp) return;
      const d = new Date(p.timestamp);
      if (isNaN(d.getTime())) return;
      const key = format(d, "yyyy-MM-dd");
      byDay.set(key, (byDay.get(key) ?? 0) + engagementOf(p));
    });
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, eng]) => ({
        date: format(new Date(date + "T00:00:00"), "MMM d"),
        engagement: eng,
      }));
  }, [allPosts]);

  const recent = useMemo(
    () =>
      [...allPosts]
        .filter((p) => p.timestamp)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5),
    [allPosts]
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-[28px] font-semibold text-[var(--heading)] leading-tight">
            {greeting()}
          </h3>
          <p className="text-[14px] text-[var(--body)] mt-1">
            Here&apos;s your Tallindolls overview
          </p>
        </div>
        <Link
          href="/content"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 shadow-md"
          style={GRADIENT_BRAND}
        >
          <PenSquare className="size-4" /> Create Post
        </Link>
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn(CARD, "h-20 animate-pulse")} />
            ))}
          </div>
          <div className={cn(CARD, "h-64 animate-pulse")} />
        </div>
      ) : (
        <>
          {/* KPI row — real aggregates */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              icon={<Layers className="size-5" />}
              label="Published Posts"
              value={String(totalPosts)}
              sub="Instagram + Facebook"
              accent="#8B5CF6"
            />
            <KpiCard
              icon={<Heart className="size-5" />}
              label="Total Likes"
              value={fmt(totalLikes)}
              sub="Across all posts"
              accent={IG_COLOR}
            />
            <KpiCard
              icon={<MessageCircle className="size-5" />}
              label="Total Comments"
              value={fmt(totalComments)}
              sub="Across all posts"
              accent={FB_COLOR}
            />
            <KpiCard
              icon={<Sparkles className="size-5" />}
              label="Total Engagement"
              value={fmt(totalEngagement)}
              sub="Likes + comments + shares"
              accent="#14B8A6"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Engagement over time */}
            <div className={cn(CARD, "p-5 lg:col-span-2")}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[14px] font-semibold text-[var(--heading)]">
                  Engagement Over Time
                </h4>
                <span className="text-[11px] text-[var(--body-subtle)]">
                  Likes + comments + shares, per day
                </span>
              </div>
              {series.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="engFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={IG_COLOR} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={IG_COLOR} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: AXIS }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: AXIS }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--neutral-primary)",
                        border: "1px solid var(--border-default)",
                        borderRadius: 2,
                        fontSize: 12,
                        color: "var(--heading)",
                      }}
                      labelStyle={{ color: "var(--body)", marginBottom: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="engagement"
                      stroke={IG_COLOR}
                      strokeWidth={2}
                      fill="url(#engFill)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-[13px] text-[var(--body-subtle)] py-16 text-center">
                  No published posts yet — publish your first post to see engagement.
                </p>
              )}
            </div>

            {/* Platform split */}
            <div className={cn(CARD, "p-5")}>
              <h4 className="text-[14px] font-semibold text-[var(--heading)] mb-4">
                Platform Split
              </h4>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--heading)]">
                      <Camera className="size-3.5" style={{ color: IG_COLOR }} /> Instagram
                    </span>
                    <span className="text-[12px] font-semibold text-[var(--heading)] tabular-nums">
                      {fmt(igEng)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--neutral-secondary-medium)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${totalEngagement ? (igEng / totalEngagement) * 100 : 0}%`,
                        background: IG_COLOR,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--heading)]">
                      <Globe className="size-3.5" style={{ color: FB_COLOR }} /> Facebook
                    </span>
                    <span className="text-[12px] font-semibold text-[var(--heading)] tabular-nums">
                      {fmt(fbEng)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--neutral-secondary-medium)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${totalEngagement ? (fbEng / totalEngagement) * 100 : 0}%`,
                        background: FB_COLOR,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Content pipeline */}
              <div className="pt-5 mt-5 border-t border-[var(--border-default)]">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[14px] font-semibold text-[var(--heading)]">Your Content</h4>
                  <Link
                    href="/history"
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand)] hover:underline"
                  >
                    History <ArrowRight className="size-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] text-center">
                    <p className="text-[20px] font-semibold text-[var(--heading)] tabular-nums">
                      {history.draft}
                    </p>
                    <p className="text-[11px] text-[var(--body-subtle)]">Drafts</p>
                  </div>
                  <div className="p-2.5 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] text-center">
                    <p className="text-[20px] font-semibold text-[var(--heading)] tabular-nums">
                      {history.scheduled}
                    </p>
                    <p className="text-[11px] text-[var(--body-subtle)]">Scheduled</p>
                  </div>
                  <div className="p-2.5 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] text-center">
                    <p className="text-[20px] font-semibold text-[var(--heading)] tabular-nums">
                      {history.published}
                    </p>
                    <p className="text-[11px] text-[var(--body-subtle)]">Published</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom row: recent posts + connected accounts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recent posts */}
            <div className={cn(CARD, "p-5 lg:col-span-2")}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[14px] font-semibold text-[var(--heading)]">Recent Posts</h4>
              </div>
              {recent.length > 0 ? (
                <div className="space-y-1">
                  {recent.map((p) => (
                    <a
                      key={p.id}
                      href={p.permalink || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-[2px] hover:bg-[var(--neutral-secondary-medium)] transition-colors",
                        !p.permalink && "pointer-events-none"
                      )}
                    >
                      <span
                        className="size-8 shrink-0 rounded-[2px] flex items-center justify-center"
                        style={{
                          backgroundColor: p.platform === "instagram" ? `${IG_COLOR}1f` : `${FB_COLOR}1f`,
                          color: p.platform === "instagram" ? IG_COLOR : FB_COLOR,
                        }}
                      >
                        {p.platform === "instagram" ? (
                          <Camera className="size-4" />
                        ) : (
                          <Globe className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] text-[var(--heading)] truncate">
                          {p.caption || "Untitled post"}
                        </p>
                        <p className="text-[11px] text-[var(--body-subtle)]">
                          {p.timestamp ? format(new Date(p.timestamp), "MMM d, yyyy") : "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-[12px] text-[var(--body-subtle)]">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="size-3.5" /> {fmt(p.metrics?.likes ?? 0)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="size-3.5" /> {fmt(p.metrics?.comments ?? 0)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--body-subtle)] py-10 text-center">
                  No posts yet. Create and publish your first post to see it here.
                </p>
              )}
            </div>

            {/* Connected accounts */}
            <div className={cn(CARD, "p-5")}>
              <h4 className="text-[14px] font-semibold text-[var(--heading)] mb-4">
                Connected Accounts
              </h4>
              <div className="space-y-2">
                {[
                  {
                    icon: <Camera className="size-4" />,
                    name: "Instagram",
                    color: IG_COLOR,
                    connected: igConnected,
                  },
                  {
                    icon: <Globe className="size-4" />,
                    name: "Facebook",
                    color: FB_COLOR,
                    connected: fbConnected,
                  },
                ].map((acct) => (
                  <div
                    key={acct.name}
                    className="flex items-center gap-3 p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]"
                  >
                    <span
                      className="size-8 shrink-0 rounded-[2px] flex items-center justify-center"
                      style={{ backgroundColor: `${acct.color}1f`, color: acct.color }}
                    >
                      {acct.icon}
                    </span>
                    <span className="text-[13px] font-medium text-[var(--heading)] flex-1">
                      {acct.name}
                    </span>
                    {acct.connected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-success)]">
                        <CheckCircle2 className="size-3.5" /> Connected
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[var(--body-subtle)]">
                        Not connected
                      </span>
                    )}
                  </div>
                ))}
                <div className="flex items-center gap-3 p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
                  <span className="size-8 shrink-0 rounded-[2px] flex items-center justify-center bg-[var(--neutral-secondary-strong)] text-[var(--body-subtle)]">
                    <Store className="size-4" />
                  </span>
                  <span className="text-[13px] font-medium text-[var(--heading)] flex-1">
                    Store analytics
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--body-subtle)]">
                    Not connected
                  </span>
                </div>
              </div>

              <Link
                href="/content"
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-2.5 text-[13px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90"
                style={GRADIENT_BRAND}
              >
                <PenSquare className="size-4" /> New Post
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
