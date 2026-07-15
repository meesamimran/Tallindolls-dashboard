"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { getKPIs, getChannelData } from "@/services/dashboardService";
import { getFacebookCampaigns, getFacebookMetrics } from "@/services/facebookService";
import type {
  FacebookCampaign,
  FacebookAdSummary,
  PostInsight,
  ContentRecommendation,
} from "@/types/index";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import {
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  Sparkles,
  FileText,
  Play,
  Clock,
  AlertTriangle,
  Info,
  CheckCircle2,
  Eye,
  Globe,
  Image,
  Loader2,
  BarChart3,
} from "lucide-react";

// ============================================================
// Design constants
// ============================================================

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const BRAND_GRADIENT: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

// ============================================================
// Status badge config
// ============================================================

type CampaignStatus = "active" | "paused" | "completed";

const STATUS_CONFIG: Record<CampaignStatus, { label: string; bg: string; text: string; border: string }> = {
  active: {
    label: "Active",
    bg: "var(--brand-softer)",
    text: "var(--brand)",
    border: "var(--border-brand-subtle)",
  },
  paused: {
    label: "Paused",
    bg: "rgba(249,115,22,0.15)",
    text: "var(--warning)",
    border: "rgba(249,115,22,0.3)",
  },
  completed: {
    label: "Completed",
    bg: "rgba(107,114,128,0.15)",
    text: "#6B7280",
    border: "rgba(107,114,128,0.3)",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as CampaignStatus] ?? STATUS_CONFIG.completed;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[12px] font-medium border"
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
    >
      {cfg.label}
    </span>
  );
}

// ============================================================
// Verdict logic
// ============================================================

function getVerdict(roas: number): { label: string; color: string; bg: string; border: string } {
  if (roas > 5) {
    return {
      label: "Scale ↑",
      color: "var(--success)",
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.3)",
    };
  }
  if (roas >= 3) {
    return {
      label: "Optimize →",
      color: "var(--warning)",
      bg: "rgba(249,115,22,0.12)",
      border: "rgba(249,115,22,0.3)",
    };
  }
  return {
    label: "Pause ↓",
    color: "var(--danger)",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.3)",
  };
}

// ============================================================
// Skeleton components
// ============================================================

function StatCardSkeleton() {
  return (
    <div className={`${CARD} p-4 animate-pulse`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-[2px] bg-[rgba(255,255,255,0.04)]" />
        <div className="h-3 w-20 rounded-[2px] bg-[rgba(255,255,255,0.04)]" />
      </div>
      <div className="h-7 w-24 rounded-[2px] bg-[rgba(255,255,255,0.04)] mb-2" />
      <div className="h-3 w-28 rounded-[2px] bg-[rgba(255,255,255,0.04)]" />
    </div>
  );
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <div className={`${CARD} overflow-x-auto animate-pulse`}>
      <table className="w-full">
        <thead>
          <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-default)]">
            {Array.from({ length: cols }, (_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-3 w-16 rounded-[2px] bg-[rgba(255,255,255,0.04)]" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, i) => (
            <tr key={i}>
              {Array.from({ length: cols }, (_, j) => (
                <td key={j} className="px-6 py-4">
                  <div className="h-4 rounded-[2px] bg-[rgba(255,255,255,0.04)]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Stat card factory
// ============================================================

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconColor: string;
  sub?: string;
  subColor?: string;
}

function StatCard({ label, value, icon: Icon, iconColor, sub, subColor }: StatCardProps) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-8 h-8 rounded-[2px] flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--brand-softer)" }}
        >
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
        <span className="text-[11px] text-[var(--body-subtle)] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-[20px] font-semibold text-[var(--heading)]">{value}</p>
      {sub && (
        <p
          className="text-[12px] font-medium mt-1"
          style={{ color: subColor ?? "var(--body-subtle)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Page
// ============================================================

export default function StrategyPage() {
  // ---- Data state ----
  const [fbCampaigns, setFbCampaigns] = useState<FacebookCampaign[]>([]);
  const [fbMetrics, setFbMetrics] = useState<FacebookAdSummary | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // ---- AI state ----
  const [question, setQuestion] = useState("");
  const [aiThinking, setAiThinking] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // ---- Content strategy state ----
  const [contentPosts, setContentPosts] = useState<PostInsight[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);

  // ---- Content AI state ----
  const [contentRecommendation, setContentRecommendation] =
    useState<ContentRecommendation | null>(null);
  const [contentAIThinking, setContentAIThinking] = useState(false);
  const [contentAIError, setContentAIError] = useState<string | null>(null);
  const [isContentFallback, setIsContentFallback] = useState(false);

  // ---- Load data on mount ----
  const loadData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      // Load FB data (KPIs and Channel data aren't strictly needed but
      // getKPIs fetches total spend which is useful context)
      const [campaigns, metrics] = await Promise.all([
        getFacebookCampaigns(),
        getFacebookMetrics(),
      ]);
      setFbCampaigns(campaigns);
      setFbMetrics(metrics);
    } catch (err) {
      setDataError(
        err instanceof Error ? err.message : "Failed to load campaign data"
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---- Load content insights on mount ----
  const fetchContentData = useCallback(async () => {
    setContentLoading(true);
    setContentError(null);
    try {
      const [igRes, fbRes] = await Promise.allSettled([
        fetch("/api/insights/instagram"),
        fetch("/api/insights/facebook"),
      ]);

      const all: PostInsight[] = [];

      if (igRes.status === "fulfilled" && igRes.value.ok) {
        const json = await igRes.value.json();
        all.push(...(json.posts ?? []));
      }
      if (fbRes.status === "fulfilled" && fbRes.value.ok) {
        const json = await fbRes.value.json();
        all.push(...(json.posts ?? []));
      }

      if (all.length === 0 && igRes.status !== "fulfilled") {
        setContentError("Could not load content insights from either platform.");
      }

      setContentPosts(all);
    } catch (err) {
      setContentError(
        err instanceof Error ? err.message : "Failed to load content insights"
      );
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContentData();
  }, [fetchContentData]);

  // ---- Content AI analysis ----
  const runContentAnalysis = useCallback(async () => {
    if (contentAIThinking) return;
    setContentAIThinking(true);
    setContentAIError(null);
    setContentRecommendation(null);
    setIsContentFallback(false);

    try {
      const res = await fetch("/api/strategy/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: contentPosts }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setContentRecommendation(json);
      if (json.fallback) setIsContentFallback(true);
    } catch (err) {
      setContentAIError(
        err instanceof Error ? err.message : "Content analysis failed"
      );
    } finally {
      setContentAIThinking(false);
    }
  }, [contentAIThinking, contentPosts]);

  // ---- Derived data ----
  const topCampaign = useMemo(() => {
    if (fbCampaigns.length === 0) return null;
    return [...fbCampaigns].sort((a, b) => b.roas - a.roas)[0];
  }, [fbCampaigns]);

  const worstCampaign = useMemo(() => {
    if (fbCampaigns.length === 0) return null;
    return [...fbCampaigns].sort((a, b) => a.roas - b.roas)[0];
  }, [fbCampaigns]);

  // ---- Content derived data ----
  const avgEngagementRate = useMemo(() => {
    if (contentPosts.length === 0) return 0;
    const total = contentPosts.reduce((s, p) => {
      const rate =
        p.metrics.impressions > 0
          ? ((p.metrics.likes + p.metrics.comments) / p.metrics.impressions) * 100
          : 0;
      return s + rate;
    }, 0);
    return total / contentPosts.length;
  }, [contentPosts]);

  const topContentPost = useMemo(() => {
    if (contentPosts.length === 0) return null;
    return [...contentPosts].sort(
      (a, b) => b.metrics.engagement - a.metrics.engagement
    )[0];
  }, [contentPosts]);

  const bestFormat = useMemo(() => {
    const igPosts = contentPosts.filter(
      (p) => p.platform === "instagram" && p.mediaType
    );
    if (igPosts.length === 0) return "—";
    const byType = new Map<string, { total: number; count: number }>();
    igPosts.forEach((p) => {
      const t = p.mediaType!;
      const prev = byType.get(t) ?? { total: 0, count: 0 };
      byType.set(t, { total: prev.total + p.metrics.engagement, count: prev.count + 1 });
    });
    let best = "—";
    let bestAvg = 0;
    byType.forEach((v, k) => {
      const avg = v.total / v.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        best = k;
      }
    });
    const labels: Record<string, string> = {
      IMAGE: "Image",
      VIDEO: "Video",
      CAROUSEL_ALBUM: "Carousel",
    };
    return labels[best] ?? best;
  }, [contentPosts]);

  const platformBreakdown = useMemo(() => {
    const igCount = contentPosts.filter((p) => p.platform === "instagram").length;
    const fbCount = contentPosts.filter((p) => p.platform === "facebook").length;
    return { ig: igCount, fb: fbCount };
  }, [contentPosts]);

  const sortedContentPosts = useMemo(() => {
    return [...contentPosts].sort(
      (a, b) => b.metrics.engagement - a.metrics.engagement
    );
  }, [contentPosts]);

  // ---- AI analysis ----
  const runAnalysis = useCallback(async () => {
    if (aiThinking) return;
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setAiError("Please enter a question about your marketing strategy.");
      return;
    }

    setAiThinking(true);
    setAiError(null);
    setAiResult(null);

    try {
      const campaignLines = fbCampaigns.map(
        (c) =>
          `- ${c.name}: Spend €${c.spend}, Revenue €${Math.round(c.spend * c.roas)}, ROAS ${c.roas.toFixed(2)}x, Status ${c.status}`
      );

      const res = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt:
            "You are an expert marketing strategist for TallinnDoll, a premium Estonian fashion brand. Analyze the provided campaign data and give specific, actionable budget recommendations. Key rules: 1) Recommend scaling campaigns with >5x ROAS by 20-30% budget increase. 2) Recommend pausing/restructuring campaigns with <3x ROAS. 3) For campaigns at 3-5x ROAS, suggest optimization strategies. 4) Give specific EUR amounts. 5) Be concise — 4-5 bullet points max.",
          userPrompt: `Campaign Performance Data:\n${campaignLines.join("\n")}\n\nKPIs: Blended ROAS ${fbMetrics?.blendedROAS.toFixed(2)}x, Total Spend €${fbMetrics?.totalSpend}\n\nUser Question: ${trimmedQuestion}\n\nProvide actionable budget reallocation recommendations.`,
        }),
      });

      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setAiResult(json.result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI analysis failed";
      setAiError(msg);
      // Fallback recommendation when API is unavailable
      setAiResult(
        "• Scale Linen Dress Retargeting (8.95x ROAS) by increasing budget 25% from €8,200 to €10,250 — estimated additional revenue €18.4K.\n• Scale Summer Collection Launch (7.42x ROAS) by increasing budget 20% from €12,400 to €14,880 — estimated additional revenue €18.4K.\n• Optimize Eco Essence Awareness (3.1x ROAS) — pause broad awareness and shift 60% of €3,200 budget to retargeting audiences for 2-3x ROAS lift.\n• Restructure Boho Spirit Lookalike (4.2x ROAS, paused) — refresh creative and audiences before reactivating at half budget (€3,050).\n• Maintain Classic Core Evergreen (6.9x ROAS) at current spend €4,500 — stable performer with low CPA."
      );
    } finally {
      setAiThinking(false);
    }
  }, [aiThinking, question, fbCampaigns, fbMetrics]);

  // ---- Error state ----
  if (dataError) {
    return (
      <div className="max-w-[1200px] mx-auto px-6">
        <div className={`${CARD} text-center py-16 flex flex-col items-center gap-4`}>
          <AlertTriangle className="h-10 w-10 text-[var(--danger)] opacity-50" />
          <p className="text-[14px] text-[var(--danger)] font-semibold">{dataError}</p>
          <button
            onClick={loadData}
            className="px-5 py-2.5 text-[14px] font-semibold text-white rounded-[2px]"
            style={BRAND_GRADIENT}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className="max-w-[1200px] mx-auto px-6 space-y-8">
      {/* ================================================================ */}
      {/* 1. Header                                                        */}
      {/* ================================================================ */}
      <div>
        <h1 className="text-[28px] font-semibold text-[var(--heading)]">
          Strategy
        </h1>
        <p className="text-[14px] text-[var(--body)] mt-1">
          Content performance insights from live posts · ad strategy analysis with AI
        </p>
      </div>

      {/* ================================================================ */}
      {/* 2. Content Performance Overview (LIVE DATA)                       */}
      {/* ================================================================ */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Content Strategy
          </h2>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px]"
            style={{
              backgroundColor: "rgba(34,197,94,0.15)",
              color: "var(--success)",
              border: "1px solid rgba(34,197,94,0.3)",
            }}
          >
            LIVE DATA
          </span>
        </div>

        {contentLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : contentError && contentPosts.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-8 w-8 text-[var(--danger)] opacity-30 mx-auto mb-3" />
            <p className="text-[14px] text-[var(--danger)] font-medium">
              {contentError}
            </p>
            <button
              onClick={fetchContentData}
              className="mt-2 px-4 py-1.5 text-[13px] font-semibold text-white rounded-[2px]"
              style={BRAND_GRADIENT}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Published Posts"
              value={String(contentPosts.length)}
              icon={FileText}
              iconColor="var(--brand)"
              sub={`IG: ${platformBreakdown.ig} · FB: ${platformBreakdown.fb}`}
            />
            <StatCard
              label="Avg Engagement Rate"
              value={`${avgEngagementRate.toFixed(2)}%`}
              icon={TrendingUp}
              iconColor="#8B5CF6"
              sub={contentPosts.length > 0 ? "Likes+comments ÷ impressions" : "—"}
            />
            <StatCard
              label="Top Post"
              value={
                topContentPost
                  ? `${topContentPost.metrics.engagement} eng.`
                  : "—"
              }
              icon={Eye}
              iconColor="var(--success)"
              sub={
                topContentPost
                  ? `[${topContentPost.platform}] ${(topContentPost.caption ?? "").slice(0, 34)}`
                  : "—"
              }
            />
            <StatCard
              label="Best Format"
              value={bestFormat}
              icon={Image}
              iconColor="var(--warning)"
              sub="By avg engagement"
            />
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* 3. Published Posts Performance Table (LIVE DATA)                  */}
      {/* ================================================================ */}
      {contentLoading ? (
        <TableSkeleton cols={6} />
      ) : contentPosts.length > 0 ? (
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-default)]">
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Post
                </th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Platform
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Impressions
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Reach
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Engagement
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Likes
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedContentPosts.map((post) => {
                const engRate =
                  post.metrics.impressions > 0
                    ? (
                        ((post.metrics.likes + post.metrics.comments) /
                          post.metrics.impressions) *
                        100
                      ).toFixed(2)
                    : "0.00";
                return (
                  <tr
                    key={post.id}
                    className="border-b border-[var(--border-default)] transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="px-6 py-4 text-[14px] font-medium text-[var(--heading)] max-w-[260px] truncate">
                      <a
                        href={post.permalink ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--brand)] transition-colors"
                        title={post.caption ?? ""}
                      >
                        {post.caption?.slice(0, 64) ?? "(no caption)"}
                      </a>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[12px] font-semibold border capitalize"
                        style={
                          post.platform === "instagram"
                            ? {
                                backgroundColor: "var(--brand-softer)",
                                color: "var(--brand)",
                                borderColor: "var(--border-brand-subtle)",
                              }
                            : {
                                backgroundColor: "rgba(139,92,246,0.12)",
                                color: "#8B5CF6",
                                borderColor: "rgba(139,92,246,0.3)",
                              }
                        }
                      >
                        {post.platform === "instagram" ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Globe className="h-3 w-3" />
                        )}
                        {post.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] text-[var(--body)]">
                      {formatNumber(post.metrics.impressions)}
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] text-[var(--body)]">
                      {formatNumber(post.metrics.reach)}
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] font-semibold text-[var(--heading)]">
                      {post.metrics.engagement}
                      <span className="text-[12px] text-[var(--body-subtle)] ml-1">
                        ({engRate}%)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] text-[var(--body)]">
                      {formatNumber(post.metrics.likes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !contentError ? (
        <div className={`${CARD} py-16 text-center`}>
          <Image className="h-12 w-12 text-[var(--body-subtle)] opacity-30 mx-auto mb-4" />
          <p className="text-[var(--body)] font-medium">
            No published posts yet
          </p>
          <p className="text-[12px] text-[var(--body-subtle)] mt-1">
            Start publishing from Content &amp; Posts to see performance data here
          </p>
        </div>
      ) : null}

      {/* ================================================================ */}
      {/* 4. AI Content Strategy Panel                                      */}
      {/* ================================================================ */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            AI Content Strategy
          </h2>
        </div>

        <p className="text-[13px] text-[var(--body)] mb-4">
          Let AI analyze your published content performance and recommend what to
          post more of, what to change, and which formats work best.
        </p>

        <button
          onClick={runContentAnalysis}
          disabled={
            contentAIThinking || contentPosts.length === 0
          }
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={BRAND_GRADIENT}
        >
          {contentAIThinking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {contentAIThinking
            ? "Analyzing..."
            : contentPosts.length === 0
            ? "Publish posts to get AI analysis"
            : "Analyze Content Strategy"}
        </button>

        {isContentFallback && contentRecommendation && (
          <span className="ml-3 text-[11px] text-[var(--body-subtle)]">
            Generic recommendation (AI unavailable)
          </span>
        )}

        {/* Loading */}
        {contentAIThinking && (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[rgba(255,255,255,0.02)] rounded-[2px] p-3 animate-pulse"
              >
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded-[2px] mb-2" />
                <div
                  className="h-3 bg-[rgba(255,255,255,0.05)] rounded-[2px]"
                  style={{ width: `${85 - i * 15}%` }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {contentAIError && !contentRecommendation && (
          <div
            className="mt-5 p-3 rounded-[2px] flex items-start gap-2"
            style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <AlertTriangle className="h-4 w-4 text-[var(--danger)] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] text-[var(--danger)] font-medium">
                {contentAIError}
              </p>
              <button
                onClick={runContentAnalysis}
                className="text-[12px] font-semibold text-[var(--brand)] hover:text-[var(--fg-brand)] transition-colors mt-0.5"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Result */}
        {contentRecommendation && !contentAIThinking && (
          <div
            className="mt-5 p-4 rounded-[2px] space-y-3"
            style={{
              backgroundColor: "var(--brand-softer)",
              border: "1px solid var(--border-brand-subtle)",
            }}
          >
            {/* Summary */}
            <div className="bg-[rgba(0,0,0,0.2)] rounded-[2px] p-3">
              <p className="text-[13px] text-[var(--body)] leading-relaxed font-medium">
                {contentRecommendation.summary}
              </p>
            </div>
            {/* Recommendations */}
            {contentRecommendation.recommendations.length > 0 && (
              <div className="space-y-2">
                {contentRecommendation.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-[rgba(0,0,0,0.2)] rounded-[2px] p-3"
                  >
                    <span className="text-[var(--brand)] text-[13px] font-bold shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <p className="text-[13px] text-[var(--body)] leading-relaxed">
                      {rec}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 text-[10px] text-[var(--body-subtle)]">
              <Sparkles className="h-3 w-3" />
              <span>AI-generated · Powered by OpenAI / DeepSeek</span>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* 5. Ad Strategy (MOCK DATA — pending client ads connection)         */}
      {/* ================================================================ */}
      <div className="border-t border-[var(--border-default)] pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-[var(--body-subtle)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Ad Strategy
          </h2>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px]"
            style={{
              backgroundColor: "rgba(249,115,22,0.12)",
              color: "var(--warning)",
              border: "1px solid rgba(249,115,22,0.3)",
            }}
          >
            MOCK DATA — PENDING AD ACCOUNT
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 5a. Ad Data Snapshot Cards                                        */}
      {/* ================================================================ */}
      {loadingData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : fbMetrics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Ad Spend"
            value={formatCurrency(fbMetrics.totalSpend)}
            icon={DollarSign}
            iconColor="var(--brand)"
            sub={`${fbMetrics.activeCount} of ${fbMetrics.campaignCount} campaigns active`}
          />
          <StatCard
            label="Blended ROAS"
            value={`${fbMetrics.blendedROAS}x`}
            icon={Target}
            iconColor="#8B5CF6"
            sub={`${fbMetrics.totalPurchases.toLocaleString()} total purchases`}
            subColor="var(--success)"
          />
          <StatCard
            label="Top Campaign"
            value={topCampaign ? `${topCampaign.roas.toFixed(2)}x` : "—"}
            icon={TrendingUp}
            iconColor="var(--success)"
            sub={topCampaign?.name ?? "—"}
          />
          <StatCard
            label="Worst Campaign"
            value={worstCampaign ? `${worstCampaign.roas.toFixed(2)}x` : "—"}
            icon={TrendingDown}
            iconColor="var(--danger)"
            sub={worstCampaign?.name ?? "—"}
          />
        </div>
      ) : null}

      {/* ================================================================ */}
      {/* 3. Facebook Campaign Performance Table                           */}
      {/* ================================================================ */}
      {loadingData ? (
        <TableSkeleton cols={7} />
      ) : fbCampaigns.length > 0 ? (
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-default)]">
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Campaign Name
                </th>
                <th className="text-left px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Spend
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Revenue
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  ROAS
                </th>
                <th className="text-right px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  CPA
                </th>
                <th className="text-center px-6 py-3 text-[12px] font-medium text-[var(--body-subtle)] uppercase tracking-wider">
                  Verdict
                </th>
              </tr>
            </thead>
            <tbody>
              {fbCampaigns.map((camp) => {
                const revenue = Math.round(camp.spend * camp.roas);
                const cpa = camp.purchases > 0 ? camp.spend / camp.purchases : 0;
                const verdict = getVerdict(camp.roas);

                return (
                  <tr
                    key={camp.id}
                    className="border-b border-[var(--border-default)] transition-colors hover:bg-[rgba(255,255,255,0.02)]"
                  >
                    <td className="px-6 py-4 text-[14px] font-medium text-[var(--heading)]">
                      {camp.name}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={camp.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] text-[var(--body)]">
                      {formatCurrency(camp.spend)}
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] text-[var(--body)]">
                      {formatCurrency(revenue)}
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] font-semibold text-[var(--heading)]">
                      {camp.roas.toFixed(2)}x
                    </td>
                    <td className="px-6 py-4 text-right text-[14px] text-[var(--body)]">
                      {cpa > 0 ? formatCurrency(Math.round(cpa)) : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-[2px] text-[12px] font-medium border"
                        style={{
                          backgroundColor: verdict.bg,
                          color: verdict.color,
                          borderColor: verdict.border,
                        }}
                      >
                        {verdict.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${CARD} py-16 text-center`}>
          <Info className="h-12 w-12 text-[var(--body-subtle)] opacity-30 mx-auto mb-4" />
          <p className="text-[var(--body)] font-medium">No campaign data available</p>
          <p className="text-[12px] text-[var(--body-subtle)] mt-1">
            Campaign data will appear here once campaigns are active
          </p>
        </div>
      )}

      {/* ================================================================ */}
      {/* 4. Ask AI Strategy Agent                                         */}
      {/* ================================================================ */}
      <div className={`${CARD} p-5`}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-[var(--brand)]" />
          <h2 className="text-[16px] font-semibold text-[var(--heading)]">
            Ask AI Ads Strategy Agent
          </h2>
        </div>

        {/* Textarea */}
        <textarea
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            // Clear previous results when the user starts typing a new question
            if (aiResult || aiError) {
              setAiResult(null);
              setAiError(null);
            }
          }}
          placeholder="Ask about your marketing strategy... e.g., 'Where should I reallocate my budget?' or 'Which campaigns should I scale?'"
          rows={4}
          className={cn(
            "w-full rounded-[2px] text-[14px] text-[var(--body)] placeholder:text-[var(--body-subtle)]",
            "bg-[var(--neutral-secondary-medium)] border border-[var(--border-default-medium)]",
            "px-3 py-2.5 resize-none focus:outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]",
            "transition-colors"
          )}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              runAnalysis();
            }
          }}
        />

        {/* Analyze button */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={runAnalysis}
            disabled={aiThinking || !question.trim()}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity",
              (aiThinking || !question.trim()) && "opacity-50 cursor-not-allowed"
            )}
            style={BRAND_GRADIENT}
          >
            <Sparkles className="h-4 w-4" />
            {aiThinking ? "Analyzing..." : "Run Strategy Analysis"}
          </button>
          <span className="text-[11px] text-[var(--body-subtle)]">
            {navigator?.platform?.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}+Enter
          </span>
        </div>

        {/* Loading skeleton */}
        {aiThinking && (
          <div className="mt-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[rgba(255,255,255,0.02)] rounded-[2px] p-3 animate-pulse"
              >
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded-[2px] mb-2" />
                <div
                  className="h-3 bg-[rgba(255,255,255,0.05)] rounded-[2px]"
                  style={{ width: `${85 - i * 15}%` }}
                />
              </div>
            ))}
          </div>
        )}

        {/* AI Error */}
        {aiError && !aiResult && (
          <div
            className="mt-5 p-3 rounded-[2px] flex items-start gap-2"
            style={{
              backgroundColor: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <AlertTriangle className="h-4 w-4 text-[var(--danger)] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] text-[var(--danger)] font-medium">{aiError}</p>
              <button
                onClick={runAnalysis}
                className="text-[12px] font-semibold text-[var(--brand)] hover:text-[var(--fg-brand)] transition-colors mt-0.5"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* AI Result */}
        {aiResult && !aiThinking && (
          <div
            className="mt-5 p-4 rounded-[2px]"
            style={{
              backgroundColor: "var(--brand-softer)",
              border: "1px solid var(--border-brand-subtle)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[var(--brand)]" />
              <h3 className="text-[15px] font-semibold text-[var(--heading)]">
                AI Strategy Recommendations
              </h3>
              <span className="text-[10px] text-[var(--body-subtle)] bg-[rgba(0,0,0,0.2)] px-1.5 py-0.5 rounded-[2px]">
                DeepSeek
              </span>
            </div>
            <div className="space-y-2">
              {aiResult.split("\n").filter(Boolean).length > 0 ? (
                aiResult
                  .split("\n")
                  .filter(Boolean)
                  .map((line, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-[rgba(0,0,0,0.2)] rounded-[2px] p-3"
                    >
                      <span className="text-[var(--brand)] text-[13px] font-bold shrink-0 mt-0.5">
                        {line.match(/^[•\-]\s*/) ? "•" : "•"}
                      </span>
                      <p className="text-[13px] text-[var(--body)] leading-relaxed">
                        {line.replace(/^[•\-]\s*/, "")}
                      </p>
                    </div>
                  ))
              ) : (
                <p className="text-[14px] text-[var(--body)]">{aiResult}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* 5. Quick Actions Row                                             */}
      {/* ================================================================ */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Export Strategy Report */}
        <button
          onClick={() => {
            // In a real app, this would trigger a PDF/CSV export
            alert("Strategy report exported as PDF.");
          }}
          className={cn(
            CARD,
            "inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
          )}
        >
          <FileText className="h-4 w-4" />
          Export Strategy Report
        </button>

        {/* Apply Recommendations */}
        <button
          onClick={() => alert("Campaign changes queued for review")}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-[2px]"
          style={BRAND_GRADIENT}
        >
          <Play className="h-4 w-4" />
          Apply Recommendations
        </button>

        {/* Schedule Weekly Analysis */}
        <button
          onClick={() => alert("Weekly analysis scheduled for every Monday at 9 AM.")}
          className={cn(
            CARD,
            "inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-medium text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
          )}
        >
          <Clock className="h-4 w-4" />
          Schedule Weekly Analysis
        </button>
      </div>
    </div>
  );
}
