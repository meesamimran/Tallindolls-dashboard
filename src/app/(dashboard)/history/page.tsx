"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ScheduledPost } from "@/types/index";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import ScheduleModal from "@/components/social/ScheduleModal";
import { publishPost } from "@/lib/publishPost";
import { uploadToPublicUrl, isUploadConfigured } from "@/lib/uploadMedia";
import {
  Clock, ImageIcon, Send, Trash2, Edit, Calendar, Loader2, ExternalLink, RefreshCw,
} from "lucide-react";

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

const STORAGE_KEY = "published-posts";
const SYNC_INTERVAL_MS = 30_000; // Poll server every 30s for status updates

// ── Server task summary (from PUT /api/cron/publish-scheduled) ──

interface ServerTaskSummary {
  serverId: string;
  scheduledAt: string;
  status: "pending" | "processing" | "published" | "failed";
  error?: string;
  permalink?: string;
  platforms: string[];
  surface: string;
}

// ── Helpers ──

function safeFormat(dateStr: string | undefined, fallback: string, fmt: (d: Date) => string): string {
  if (!dateStr) return fallback;
  try {
    // Handle "YYYY-MM-DDTHH:MM" format (no timezone)
    const d = dateStr.includes("T") && !dateStr.includes("Z") && !dateStr.includes("+")
      ? new Date(dateStr + ":00")  // append seconds
      : new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return fmt(d);
  } catch {
    return fallback;
  }
}

function loadPosts(): ScheduledPost[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const raw = JSON.parse(stored);
    return Array.isArray(raw) ? raw.filter((p: any) => p && p.id) : [];
  } catch {
    return [];
  }
}

function savePosts(posts: ScheduledPost[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, 200)));
  } catch { /* quota exceeded */ }
}

function groupByDate(posts: ScheduledPost[]): Map<string, ScheduledPost[]> {
  const groups = new Map<string, ScheduledPost[]>();
  posts
    .slice()
    .sort((a, b) => {
      const getTime = (d: string | undefined) => {
        try { const t = new Date(d || "").getTime(); return isNaN(t) ? 0 : t; } catch { return 0; }
      };
      return getTime(b.scheduledDate) - getTime(a.scheduledDate);
    })
    .forEach((p) => {
      const date = safeFormat(p.scheduledDate, "Unknown", (d) => format(d, "yyyy-MM-dd"));
      const existing = groups.get(date) || [];
      existing.push(p);
      groups.set(date, existing);
    });
  return groups;
}

// ── Component ──

export default function HistoryPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());
  const [publishResults, setPublishResults] = useState<Record<string, { ok: boolean; message: string; url?: string }>>({});
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Initial load ──
  useEffect(() => {
    setPosts(loadPosts());
    setLoaded(true);
  }, []);

  // ── Persist on every change ──
  useEffect(() => {
    if (loaded) savePosts(posts);
  }, [posts, loaded]);

  // ── Server sync: poll for cron-published status updates ──
  const syncWithServer = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/cron/publish-scheduled", { method: "PUT" });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !Array.isArray(json.tasks)) return;

      const serverTasks: ServerTaskSummary[] = json.tasks;
      const serverMap = new Map<string, ServerTaskSummary>();
      serverTasks.forEach((t) => serverMap.set(t.serverId, t));

      setPosts((prev) => {
        let changed = false;
        const updated = prev.map((post) => {
          // Match by serverTaskId or by reconstructing the server ID pattern
          const serverId = post.serverTaskId;
          const serverTask = serverId ? serverMap.get(serverId) : undefined;

          if (!serverTask) return post;

          // Map server status → client status
          const serverStatus = serverTask.status;
          let newStatus: ScheduledPost["status"] = post.status;
          if (serverStatus === "published") newStatus = "published";
          else if (serverStatus === "failed") newStatus = post.status; // keep as "scheduled" so user can retry
          else if (serverStatus === "processing") newStatus = "scheduled"; // still in progress

          if (newStatus !== post.status || serverTask.permalink !== post.permalink) {
            changed = true;
            return { ...post, status: newStatus, permalink: serverTask.permalink };
          }
          return post;
        });

        return changed ? updated : prev;
      });
      setLastSync(new Date());
    } catch {
      // server may not be reachable — ignore
    } finally {
      setSyncing(false);
    }
  }, []);

  // Sync on mount and periodically
  useEffect(() => {
    syncWithServer();
    syncTimerRef.current = setInterval(syncWithServer, SYNC_INTERVAL_MS);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [syncWithServer]);

  // ── Actions ──

  const updatePost = useCallback((id: string, update: Partial<ScheduledPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...update } : p)));
  }, []);

  const deletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /** Publish Now — actually calls the publish API, not just a status change. */
  const publishNow = useCallback(async (post: ScheduledPost) => {
    if (!post.imageDataUrl) return;
    setPublishingIds((prev) => new Set(prev).add(post.id));

    try {
      let imageUrl = post.imageDataUrl;
      // Upload to Cloudinary if needed
      if (imageUrl.startsWith("data:") && isUploadConfigured()) {
        imageUrl = await uploadToPublicUrl(imageUrl);
      }

      const result = await publishPost({
        platform: post.platform.toLowerCase().includes("facebook") ? "facebook" : "instagram",
        surface: post.surface ?? "feed",
        imageDataUrl: imageUrl,
        captionText: post.content,
      });

      setPublishResults((prev) => ({ ...prev, [post.id]: result }));

      if (result.ok) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, status: "published" as const, scheduledDate: new Date().toISOString(), permalink: result.url }
              : p
          )
        );
      }
    } catch (err) {
      setPublishResults((prev) => ({
        ...prev,
        [post.id]: { ok: false, message: err instanceof Error ? err.message : "Publish failed" },
      }));
    } finally {
      setPublishingIds((prev) => {
        const next = new Set(prev);
        next.delete(post.id);
        return next;
      });
    }
  }, []);

  const saveAsScheduled = useCallback((id: string, date: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "scheduled" as const, scheduledDate: date } : p
      )
    );
  }, []);

  const editPost = useCallback((post: ScheduledPost) => {
    try {
      sessionStorage.setItem(
        "edit-draft",
        JSON.stringify({
          caption: post.content || "",
          imageDataUrl: post.imageDataUrl || null,
          platform: post.platform,
          surface: post.surface || "feed",
        })
      );
    } catch { /* ignore */ }
    router.push("/content");
  }, [router]);

  const grouped = groupByDate(posts);

  const statusStyle = (status: string) =>
    cn(
      "px-2 py-0.5 text-[10px] font-semibold rounded-[2px] capitalize",
      status === "published"
        ? "bg-[var(--success)] text-white"
        : status === "scheduled"
          ? "bg-[var(--warning)] text-white"
          : status === "draft"
            ? "bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)]"
            : "bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)]"
    );

  // ── Loading skeleton ──
  if (!loaded) {
    return (
      <div className="max-w-[900px] mx-auto px-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[var(--neutral-secondary-medium)] rounded-[2px]" />
          <div className="h-4 w-72 bg-[var(--neutral-secondary-medium)] rounded-[2px]" />
          <div className="space-y-2 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-[var(--neutral-secondary-medium)] rounded-[2px]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-semibold text-[var(--heading)] flex items-center gap-3">
            <Clock className="size-7 text-[var(--brand)]" />
            Posting History
          </h1>
          <p className="text-[14px] text-[var(--body)] mt-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""} — drafts, scheduled &amp; published.
          </p>
        </div>
        {/* Sync indicator */}
        <button
          onClick={syncWithServer}
          disabled={syncing}
          title={lastSync ? `Last synced ${format(lastSync, "HH:mm:ss")}` : "Sync with server"}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--body-subtle)] hover:text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
        >
          <RefreshCw className={cn("size-3", syncing && "animate-spin")} />
          {syncing ? "Syncing…" : lastSync ? `Synced ${format(lastSync, "HH:mm")}` : "Sync"}
        </button>
      </div>

      {/* Empty state */}
      {posts.length === 0 ? (
        <div className={cn(CARD, "p-12 text-center")}>
          <Clock className="size-12 text-[var(--body-subtle)] mx-auto mb-4" />
          <p className="text-[16px] font-semibold text-[var(--heading)]">No posts yet</p>
          <p className="text-[14px] text-[var(--body-subtle)] mt-1.5 max-w-[360px] mx-auto">
            Posts you save as draft, schedule, or publish will appear here. They persist even after refreshing the page.
          </p>
          <button
            onClick={() => router.push("/content")}
            className="inline-flex items-center gap-2 px-5 py-2.5 mt-5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90"
            style={GRADIENT_BRAND}
          >
            Create New Post
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, dayPosts]) => (
            <div key={date}>
              <h2 className="text-[14px] font-semibold text-[var(--body)] mb-3 flex items-center gap-2 sticky top-0 bg-[var(--neutral-primary)] py-2 z-10">
                <span className="size-2 rounded-full bg-[var(--brand)]" />
                {date === "Unknown"
                  ? "Unknown Date"
                  : format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                <span className="text-[12px] text-[var(--body-subtle)] font-normal">
                  ({dayPosts.length})
                </span>
              </h2>
              <div className="space-y-2">
                {dayPosts.map((post) => {
                  const isPublishing = publishingIds.has(post.id);
                  const pubResult = publishResults[post.id];

                  return (
                  <div key={post.id} className={cn(CARD, "p-4 flex items-start gap-4 group")}>
                    {/* Thumbnail */}
                    <div className="shrink-0">
                      {post.imageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.imageDataUrl}
                          alt=""
                          className="size-16 rounded-[2px] object-cover border border-[var(--border-default)]"
                        />
                      ) : (
                        <div className="size-16 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] flex items-center justify-center">
                          <ImageIcon className="size-6 text-[var(--body-subtle)]" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-[var(--heading)] truncate">
                          {post.title}
                        </p>
                        <span className={statusStyle(post.status)}>{post.status}</span>
                        {post.permalink && (
                          <a
                            href={post.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[10px] font-medium text-[var(--brand)] hover:underline"
                          >
                            <ExternalLink className="size-2.5" /> View
                          </a>
                        )}
                      </div>
                      <p className="text-[12px] text-[var(--body-subtle)] mt-1 line-clamp-2 leading-snug">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)]">
                          {post.platform}
                        </span>
                        {post.surface && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-[2px] capitalize bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)]">
                            {post.surface}
                          </span>
                        )}
                        <span className="text-[11px] text-[var(--body-subtle)]">
                          {safeFormat(post.scheduledDate, "--:--", (d) => format(d, "HH:mm"))}
                        </span>
                      </div>

                      {/* Publish result feedback */}
                      {pubResult && (
                        <div className={cn(
                          "mt-2 p-2 rounded-[2px] text-[12px]",
                          pubResult.ok
                            ? "bg-[var(--success-soft)] text-[var(--fg-success)]"
                            : "bg-[var(--danger-soft)] text-[var(--fg-danger)]"
                        )}>
                          {pubResult.message}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {post.status === "published" ? (
                        <button
                          onClick={() => deletePost(post.id)}
                          title="Delete"
                          className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--danger-soft)] text-[var(--body-subtle)] hover:text-[var(--danger)] transition-colors"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      ) : (
                        <>
                          {/* Publish Now — actually publishes via API */}
                          <button
                            onClick={() => publishNow(post)}
                            disabled={isPublishing || !post.imageDataUrl}
                            title="Publish now"
                            className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--success-soft)] text-[var(--body-subtle)] hover:text-[var(--fg-success)] disabled:opacity-50 transition-colors"
                          >
                            {isPublishing ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => editPost(post)}
                            title="Edit"
                            className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] hover:text-[var(--heading)] transition-colors"
                          >
                            <Edit className="size-3.5" />
                          </button>
                          {/* Reschedule */}
                          {post.status === "scheduled" && (
                            <button
                              onClick={() => setEditingScheduleId(post.id)}
                              title="Reschedule"
                              className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--warning-soft)] text-[var(--body-subtle)] hover:text-[var(--fg-warning)] transition-colors"
                            >
                              <Calendar className="size-3.5" />
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => deletePost(post.id)}
                            title="Delete"
                            className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--danger-soft)] text-[var(--body-subtle)] hover:text-[var(--danger)] transition-colors"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ScheduleModal
        open={!!editingScheduleId}
        onClose={() => setEditingScheduleId(null)}
        initialDate={editingScheduleId ? posts.find((p) => p.id === editingScheduleId)?.scheduledDate : undefined}
        onConfirm={async (dateTime) => {
          if (!editingScheduleId) return;
          const post = posts.find((p) => p.id === editingScheduleId);
          if (!post) return;

          // Update locally first
          setPosts((prev) => prev.map((p) => p.id === editingScheduleId ? { ...p, status: "scheduled" as const, scheduledDate: dateTime } : p));
          setEditingScheduleId(null);

          // Also POST to server so the cron can publish it
          if (post.imageDataUrl) {
            try {
              let imageUrl = post.imageDataUrl;
              if (imageUrl.startsWith("data:") && isUploadConfigured()) {
                imageUrl = await uploadToPublicUrl(imageUrl);
              }
              const res = await fetch("/api/cron/publish-scheduled", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageUrl,
                  caption: post.content,
                  platforms: post.platform.toLowerCase().includes("facebook") ? ["facebook"] : ["instagram"],
                  surface: post.surface === "story" ? "story" : "feed",
                  scheduledAt: dateTime,
                }),
              });
              const json = await res.json();
              if (json.ok && json.task?.id) {
                setPosts((prev) => prev.map((p) => p.id === editingScheduleId ? { ...p, serverTaskId: json.task.id } : p));
              }
            } catch { /* localStorage is already updated; server will catch up on next Content page schedule */ }
          }
        }}
      />
    </div>
  );
}
