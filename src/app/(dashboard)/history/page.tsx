"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ScheduledPost } from "@/types/index";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Clock, ImageIcon, Send, Trash2, Edit, CheckCircle2, Calendar, MoreHorizontal,
} from "lucide-react";

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

const STORAGE_KEY = "published-posts";

function loadPosts(): ScheduledPost[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePosts(posts: ScheduledPost[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts.slice(0, 200)));
  } catch { /* quota exceeded — silently ignore */ }
}

function groupByDate(posts: ScheduledPost[]): Map<string, ScheduledPost[]> {
  const groups = new Map<string, ScheduledPost[]>();
  posts
    .slice()
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .forEach((p) => {
      const date = format(new Date(p.scheduledDate), "yyyy-MM-dd");
      const existing = groups.get(date) || [];
      existing.push(p);
      groups.set(date, existing);
    });
  return groups;
}

export default function HistoryPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  useEffect(() => {
    setPosts(loadPosts());
    setLoaded(true);
  }, []);

  // Persist on every change
  useEffect(() => {
    if (loaded) savePosts(posts);
  }, [posts, loaded]);

  const updatePost = useCallback((id: string, update: Partial<ScheduledPost>) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...update } : p)));
  }, []);

  const deletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const publishNow = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "published" as const, scheduledDate: new Date().toISOString() }
          : p
      )
    );
    // If publishing a draft, the draft entry becomes "published"
  }, []);

  const saveAsScheduled = useCallback((id: string, date: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "scheduled" as const, scheduledDate: date } : p
      )
    );
  }, []);

  const editPost = useCallback((post: ScheduledPost) => {
    // Save draft data to sessionStorage so Content page can pre-fill
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
      </div>

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
                {format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
                <span className="text-[12px] text-[var(--body-subtle)] font-normal">
                  ({dayPosts.length})
                </span>
              </h2>
              <div className="space-y-2">
                {dayPosts.map((post) => (
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
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold text-[var(--heading)] truncate">
                          {post.title}
                        </p>
                        <span className={statusStyle(post.status)}>{post.status}</span>
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
                          {format(new Date(post.scheduledDate), "HH:mm")}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {/* Published: read-only, just delete */}
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
                          {/* Draft & Scheduled: Publish Now */}
                          <button
                            onClick={() => publishNow(post.id)}
                            title="Publish now"
                            className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--success-soft)] text-[var(--body-subtle)] hover:text-[var(--fg-success)] transition-colors"
                          >
                            <Send className="size-3.5" />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => editPost(post)}
                            title="Edit"
                            className="size-8 rounded-[2px] flex items-center justify-center hover:bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] hover:text-[var(--heading)] transition-colors"
                          >
                            <Edit className="size-3.5" />
                          </button>
                          {/* Scheduled: Change date/time */}
                          {post.status === "scheduled" && (
                            <button
                              onClick={() => {
                                setEditingScheduleId(post.id);
                                const d = new Date(post.scheduledDate);
                                setScheduleDate(d.toISOString().slice(0, 10));
                                setScheduleTime(d.toISOString().slice(11, 16));
                              }}
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reschedule Modal */}
      {editingScheduleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingScheduleId(null)}>
          <div className="bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-2xl w-full max-w-[360px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold text-[var(--heading)]">Reschedule Post</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1">Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none"
                  style={{ backgroundColor: "var(--neutral-secondary-medium)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }} />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1">Time</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none"
                  style={{ backgroundColor: "var(--neutral-secondary-medium)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }} />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setEditingScheduleId(null)}
                className="px-4 py-2 text-[13px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--body)] hover:bg-[var(--neutral-secondary-medium)] transition-colors">Cancel</button>
              <button onClick={() => {
                setPosts((prev) => prev.map((p) => p.id === editingScheduleId ? { ...p, scheduledDate: `${scheduleDate}T${scheduleTime}:00` } : p));
                setEditingScheduleId(null);
              }}
                disabled={!scheduleDate || !scheduleTime}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded-[2px] disabled:opacity-50" style={GRADIENT_BRAND}>
                Update Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
