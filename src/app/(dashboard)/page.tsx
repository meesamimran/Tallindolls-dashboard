"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Camera, Globe, Heart, MessageCircle, Eye, MousePointerClick,
  PenSquare, Clock, Send, CheckCircle2, Store, ArrowRight,
} from "lucide-react";

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

// ── Types (match the /api/insights/* responses) ──

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
  return posts.reduce(
    (acc, p) => acc + ((p.metrics?.[key] as number) ?? 0),
    0
  );
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

// Real draft/scheduled/published counts from localStorage (same key as History).
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

// ── Small stat tile ──

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
      <div className="size-9 shrink-0 rounded-[2px] bg-[var(--brand-softer)] flex items-center justify-center text-[var(--brand)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[18px] font-semibold text-[var(--heading)] leading-tight tabular-nums">
          {value}
        </p>
        <p className="text-[11px] text-[var(--body-subtle)] truncate">{label}</p>
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

  const totalPosts = igPosts.length + fbPosts.length;
  const totalLikes = sum(igPosts, "likes") + sum(fbPosts, "likes");
  const totalComments = sum(igPosts, "comments") + sum(fbPosts, "comments");
  const totalEngagement = sum(igPosts, "engagement") + sum(fbPosts, "engagement");

  return (
    <div className="max-w-[1200px] mx-auto px-6 space-y-6 animate-fade-in">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className={cn(CARD, "h-40 animate-pulse")} />
          ))}
        </div>
      ) : (
        <>
          {/* Social performance — REAL data from Meta Graph */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Instagram */}
            <div className={cn(CARD, "p-5")}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="size-4 text-[#D94FB0]" />
                  <h4 className="text-[14px] font-semibold text-[var(--heading)]">Instagram</h4>
                </div>
                {igConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-success)]">
                    <CheckCircle2 className="size-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[var(--body-subtle)]">Not connected</span>
                )}
              </div>
              {igConnected ? (
                <div className="grid grid-cols-2 gap-2">
                  <Stat icon={<Eye className="size-4" />} label="Posts" value={String(igPosts.length)} />
                  <Stat icon={<Heart className="size-4" />} label="Likes" value={fmt(sum(igPosts, "likes"))} />
                  <Stat icon={<MessageCircle className="size-4" />} label="Comments" value={fmt(sum(igPosts, "comments"))} />
                  <Stat icon={<Eye className="size-4" />} label="Reach" value={fmt(sum(igPosts, "reach"))} />
                </div>
              ) : (
                <p className="text-[13px] text-[var(--body-subtle)] py-4">
                  Connect your Instagram account to see real post performance.
                </p>
              )}
            </div>

            {/* Facebook */}
            <div className={cn(CARD, "p-5")}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-[#1877F2]" />
                  <h4 className="text-[14px] font-semibold text-[var(--heading)]">Facebook</h4>
                </div>
                {fbConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-success)]">
                    <CheckCircle2 className="size-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[var(--body-subtle)]">Not connected</span>
                )}
              </div>
              {fbConnected ? (
                <div className="grid grid-cols-2 gap-2">
                  <Stat icon={<Eye className="size-4" />} label="Posts" value={String(fbPosts.length)} />
                  <Stat icon={<Heart className="size-4" />} label="Likes" value={fmt(sum(fbPosts, "likes"))} />
                  <Stat icon={<MessageCircle className="size-4" />} label="Comments" value={fmt(sum(fbPosts, "comments"))} />
                  <Stat icon={<MousePointerClick className="size-4" />} label="Clicks" value={fmt(sum(fbPosts, "clicks"))} />
                </div>
              ) : (
                <p className="text-[13px] text-[var(--body-subtle)] py-4">
                  Connect your Facebook Page to see real post performance.
                </p>
              )}
            </div>
          </div>

          {/* Your content — real localStorage counts */}
          <div className={cn(CARD, "p-5")}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[14px] font-semibold text-[var(--heading)]">Your Content</h4>
              <Link
                href="/history"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand)] hover:underline"
              >
                View history <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stat icon={<PenSquare className="size-4" />} label="Drafts" value={String(history.draft)} />
              <Stat icon={<Clock className="size-4" />} label="Scheduled" value={String(history.scheduled)} />
              <Stat icon={<Send className="size-4" />} label="Published" value={String(history.published)} />
            </div>
          </div>

          {/* Connected accounts status */}
          <div className={cn(CARD, "p-5")}>
            <h4 className="text-[14px] font-semibold text-[var(--heading)] mb-4">Connected Accounts</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
                <Camera className="size-4 text-[#D94FB0]" />
                <span className="text-[13px] font-medium text-[var(--heading)] flex-1">Instagram</span>
                {igConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-success)]">
                    <CheckCircle2 className="size-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[var(--body-subtle)]">Not connected</span>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
                <Globe className="size-4 text-[#1877F2]" />
                <span className="text-[13px] font-medium text-[var(--heading)] flex-1">Facebook</span>
                {fbConnected ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-success)]">
                    <CheckCircle2 className="size-3.5" /> Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[var(--body-subtle)]">Not connected</span>
                )}
              </div>
              <div className="flex items-center gap-3 p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
                <Store className="size-4 text-[var(--body-subtle)]" />
                <span className="text-[13px] font-medium text-[var(--heading)] flex-1">
                  Store analytics (revenue, orders)
                </span>
                <span className="text-[11px] font-semibold text-[var(--body-subtle)]">Not connected</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
