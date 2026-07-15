"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ScheduledPost } from "@/types/index";
import { publishPost } from "@/lib/publishPost";
import {
  Globe,
  MessageSquare,
  Calendar,
  Trash2,
  CheckCircle2,
  Send,
  Eye,
  Loader2,
  AlertCircle,
  ExternalLink,
  CircleDot,
  CircleCheck,
} from "lucide-react";

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

type Stage = "draft" | "ready" | "approved" | "published";

const STAGE_FLOW: Stage[] = ["draft", "ready", "approved", "published"];

const STAGE_META: Record<Stage, { label: string; bg: string; text: string; border: string }> = {
  draft: { label: "Draft", bg: "var(--neutral-primary-medium)", text: "var(--body-subtle)", border: "var(--border-default)" },
  ready: { label: "Ready for Review", bg: "var(--warning-soft)", text: "var(--warning)", border: "var(--border-warning-subtle)" },
  approved: { label: "Approved", bg: "var(--brand-softer)", text: "var(--brand)", border: "var(--border-brand-subtle)" },
  published: { label: "Published", bg: "var(--success-soft)", text: "var(--success)", border: "var(--border-success-subtle)" },
};

const PLATFORM_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  Instagram: { icon: Globe, bg: "var(--brand-softer)", color: "var(--brand)" },
  Facebook: { icon: MessageSquare, bg: "rgba(139,92,246,0.12)", color: "var(--purple)" },
};

function detectLanguage(text: string): "Estonian" | "English" {
  return /[äöüõÄÖÜÕ]/.test(text) ? "Estonian" : "English";
}

interface ApprovalQueueProps {
  posts: ScheduledPost[];
  onUpdate: (id: string, status: Stage) => void;
  onRemove: (id: string) => void;
}

export default function ApprovalQueue({ posts, onUpdate, onRemove }: ApprovalQueueProps) {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [resultFor, setResultFor] = useState<Record<string, { ok: boolean; message: string; url?: string }>>({});

  const handleAdvance = (post: ScheduledPost) => {
    const idx = STAGE_FLOW.indexOf(post.status as Stage);
    const next = STAGE_FLOW[Math.min(idx + 1, STAGE_FLOW.length - 1)];
    onUpdate(post.id, next);
  };

  const handlePublishFromQueue = async (post: ScheduledPost) => {
    if (!post.imageDataUrl) return;
    setPublishingId(post.id);
    const result = await publishPost({
      platform: post.platform === "Instagram" ? "instagram" : "facebook",
      surface: post.surface ?? "feed",
      imageDataUrl: post.imageDataUrl,
      captionText: post.content,
    });
    setResultFor((prev) => ({ ...prev, [post.id]: result }));
    if (result.ok) onUpdate(post.id, "published");
    setPublishingId(null);
  };

  const counts = STAGE_FLOW.reduce(
    (acc, s) => ({ ...acc, [s]: posts.filter((p) => p.status === s).length }),
    {} as Record<Stage, number>
  );

  return (
    <div className={cn(CARD, "p-5")}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <Eye className="size-5 text-[var(--brand)] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--heading)]">Approval Workflow</h2>
            <p className="text-[13px] text-[var(--body)] mt-0.5">
              Draft → Ready for Review → Approved → Published
            </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STAGE_FLOW.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-[2px] text-[11px] font-semibold"
              style={{ backgroundColor: STAGE_META[s].bg, color: STAGE_META[s].text }}
            >
              {counts[s]}
            </span>
          ))}
        </div>
      </div>

      {/* stage legend */}
      <div className="flex items-center gap-1 mb-4 text-[11px] text-[var(--body-subtle)] flex-wrap">
        {STAGE_FLOW.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span style={{ color: STAGE_META[s].text }}>{STAGE_META[s].label}</span>
            {i < STAGE_FLOW.length - 1 && <span className="px-1">→</span>}
          </span>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-10">
          <CircleDot className="size-8 mx-auto mb-3 text-[var(--body-subtle)] opacity-30" />
          <p className="text-[14px] font-semibold text-[var(--heading)]">No items yet</p>
          <p className="text-[13px] text-[var(--body)] mt-1">
            Generate a post above and hit “Save Draft” to start the approval flow
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => {
            const stage = (post.status as Stage) || "draft";
            const stageMeta = STAGE_META[stage];
            const platCfg = PLATFORM_CONFIG[post.platform] || PLATFORM_CONFIG.Instagram;
            const PlatIcon = platCfg.icon;
            const lang = detectLanguage(post.title + " " + post.content);
            const isPublishing = publishingId === post.id;
            const res = resultFor[post.id];

            return (
              <div key={post.id} className={cn(CARD, "p-4")}>
                {/* badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-semibold border"
                    style={{ backgroundColor: platCfg.bg, color: platCfg.color, borderColor: platCfg.color }}
                  >
                    <PlatIcon className="size-2.5" />
                    {post.platform}
                    {post.surface && post.surface !== "feed" ? ` · ${post.surface}` : ""}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-semibold border"
                    style={{ backgroundColor: stageMeta.bg, color: stageMeta.text, borderColor: stageMeta.border }}
                  >
                    {stage === "approved" ? <CircleCheck className="size-3" /> : null}
                    {stageMeta.label}
                  </span>
                  <span className="text-[13px] leading-none ml-auto" title={lang}>
                    {lang === "Estonian" ? "🇪🇪" : "🇬🇧"}
                  </span>
                </div>

                {/* title + content */}
                <h3 className="text-[15px] font-semibold text-[var(--heading)] mb-1.5">{post.title}</h3>
                <p className="text-[13px] text-[var(--body)] line-clamp-3 mb-3">{post.content}</p>

                {/* publish result */}
                {res && (
                  <div
                    className={cn(
                      "flex items-start gap-2 p-2.5 rounded-[2px] text-[12px] border mb-3",
                      res.ok
                        ? "bg-[var(--success-soft)] border-[var(--border-success-subtle)] text-[var(--fg-success)]"
                        : "bg-[var(--danger-soft)] border-[var(--border-danger-subtle)] text-[var(--fg-danger)]"
                    )}
                  >
                    {res.ok ? <CheckCircle2 className="size-3.5 shrink-0 mt-0.5" /> : <AlertCircle className="size-3.5 shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <p className="font-medium">{res.message}</p>
                      {res.url && (
                        <a href={res.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-0.5 underline">
                          View post <ExternalLink className="size-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* actions */}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] text-[var(--body-subtle)]">
                    <Calendar className="size-3" />
                    {new Date(post.scheduledDate).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {stage === "approved" ? (
                      <button
                        onClick={() => handlePublishFromQueue(post)}
                        disabled={isPublishing || !post.imageDataUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-[2px] disabled:opacity-50"
                        style={GRADIENT_BRAND}
                      >
                        {isPublishing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                        {isPublishing ? "Publishing…" : "Publish"}
                      </button>
                    ) : stage === "published" ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--success)]">
                        <CheckCircle2 className="size-3.5" /> Live
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdvance(post)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
                      >
                        {stage === "draft" ? "Mark Ready" : "Approve"}
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(post.id)}
                      title="Remove"
                      className="p-1.5 rounded-[2px] text-[var(--body-subtle)] hover:text-[var(--danger)] transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
