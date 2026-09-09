"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ScheduledPost } from "@/types/index";
import { cn } from "@/lib/utils";
import PostComposer, { type PublishTask } from "@/components/social/PostComposer";
import { uploadToPublicUrl } from "@/lib/uploadMedia";
import PreviewScreen from "@/components/social/PreviewScreen";
import CarouselBuilder from "@/components/social/CarouselBuilder";
import type { Caption } from "@/components/social/SocialPreviews";
import type { SongResult } from "@/components/social/SongSearch";
import {
  ImageIcon, Images, Loader2, CheckCircle2, AlertCircle, ExternalLink, X,
} from "lucide-react";

const COLLECTIONS = [
  "Summer Breeze", "Linen Luxe", "Evening Bloom", "Urban Edge",
  "Boho Spirit", "Classic Core", "Coastal Charm", "Minimal Muse",
  "Bold Statement", "Eco Essence",
];
const POST_TYPES = [
  "New Collection Launch", "Sale Announcement", "Behind the Scenes",
  "Styling Tips", "Customer Spotlight", "Seasonal Promotion",
];

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

// Convert stored plain-text caption back to Caption object
function parseCaptionFromText(text: string): Caption {
  const lines = text.split("\n").filter((l) => l.trim());
  const headline = lines[0] || "";
  const hashtagLines = lines.filter((l) => l.startsWith("#"));
  const hashtags = hashtagLines.join(" ");
  const bodyLines = lines.slice(1).filter((l) => !l.startsWith("#") && !l.startsWith("🎵"));
  const primaryText = bodyLines.join("\n");
  return { headline, primaryText, hashtags, cta: "" };
}

type ContentMode = "single" | "carousel";
type Step = "composer" | "preview";

// Persist posts to localStorage for History page.
// Merges new post with existing entries by id to avoid duplicates.
function persistPost(post: ScheduledPost) {
  try {
    const stored = localStorage.getItem("published-posts");
    const posts: ScheduledPost[] = stored ? JSON.parse(stored) : [];
    const existingIdx = posts.findIndex((p) => p.id === post.id);
    if (existingIdx >= 0) {
      posts[existingIdx] = { ...posts[existingIdx], ...post };
    } else {
      posts.unshift(post);
    }
    localStorage.setItem("published-posts", JSON.stringify(posts.slice(0, 100)));
  } catch { /* ignore */ }
}

export default function ContentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<ContentMode>("single");
  const [step, setStep] = useState<Step>("composer");

  // Snapshot from composer step — carries full media state to PreviewScreen
  const [snapshot, setSnapshot] = useState<{
    imageSrc: string | null;
    isVideo: boolean;
    videoSrc: string | null;
    caption: Caption;
    selectedPreviewLabel: string;
    surface: string;
    targetPlatforms: string[];
    carouselSlides?: { formatted: string | null; isVideo?: boolean; videoBlobUrl?: string | null }[];
    carouselIdx?: number;
    mediaFilesCount?: number;
  }>({
    imageSrc: null,
    isVideo: false,
    videoSrc: null,
    caption: { headline: "", primaryText: "", hashtags: "", cta: "" },
    selectedPreviewLabel: "Instagram Feed",
    surface: "feed",
    targetPlatforms: ["instagram", "facebook"],
  });

  // Success message + reset key
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [triggerPublish, setTriggerPublish] = useState(0);
  const [publishingFromPreview, setPublishingFromPreview] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());

  // carousel state
  const [carouselSlides, setCarouselSlides] = useState<string[]>([]);
  const [carouselCaption, setCarouselCaption] = useState("");
  const [carTargetPlatforms, setCarTargetPlatforms] = useState<("instagram" | "facebook")[]>(["instagram", "facebook"]);
  const [pendingCarouselFiles, setPendingCarouselFiles] = useState<File[] | null>(null);

  // ── Publish task queue ──
  const [publishTasks, setPublishTasks] = useState<PublishTask[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addPublishTask = useCallback((task: PublishTask) => {
    setPublishTasks((prev) => [task, ...prev]);
  }, []);
  const updatePublishTask = useCallback((id: string, update: Partial<PublishTask>) => {
    setPublishTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...update } : t)));
  }, []);
  const dismissPublishTask = useCallback((id: string) => {
    setPublishTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);
  const hasActiveTasks = publishTasks.some((t) => t.status === "processing");

  useEffect(() => {
    publishTasks.forEach((task) => {
      if (task.status === "success" && !timersRef.current.has(task.id)) {
        const timer = setTimeout(() => {
          dismissPublishTask(task.id);
          timersRef.current.delete(task.id);
        }, 5000);
        timersRef.current.set(task.id, timer);
      }
    });
  }, [publishTasks, dismissPublishTask]);

  // Read draft data from History (sessionStorage)
  const [draftData] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem("edit-draft");
      if (!raw) return null;
      sessionStorage.removeItem("edit-draft");
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  // Watch for publish completion when triggered from preview
  useEffect(() => {
    if (!publishingFromPreview) return;
    const completed = publishTasks.find((t) => t.status !== "processing");
    if (completed) {
      setPublishingFromPreview(false);
      if (completed.status === "success") {
        setResetKey((k) => k + 1);
        setStep("composer");
        setSuccessMsg("Your post has been published successfully.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [publishTasks, publishingFromPreview, setResetKey]);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const handleRequestCarousel = useCallback((files: File[]) => {
    const vids = files.filter((f) => isVideoFile(f));
    if (vids.length > 1) { alert("Only 1 video allowed in a carousel."); return; }
    setMode("carousel");
    setPendingCarouselFiles(files);
  }, []);

  const handleCarouselReady = useCallback((slides: string[]) => setCarouselSlides(slides), []);
  const handleCarouselCaption = useCallback((caption: string) => setCarouselCaption(caption), []);

  // ── Two-step flow ──
  const handleNext = useCallback((data: typeof snapshot) => {
    setSnapshot(data);
    setStep("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBack = useCallback(() => {
    setStep("composer");
  }, []);

  // Save Draft → History
  const handleSaveDraft = useCallback(() => {
    const post: ScheduledPost = {
      id: `draft-${Date.now()}`,
      title: snapshot.caption.headline || "Draft Post",
      content: [snapshot.caption.headline, snapshot.caption.primaryText, snapshot.caption.hashtags, snapshot.caption.cta].filter(Boolean).join("\n\n"),
      platform: snapshot.targetPlatforms.join(", "),
      scheduledDate: new Date().toISOString(),
      status: "draft",
      imageDataUrl: snapshot.imageSrc ?? undefined,
      surface: snapshot.isVideo ? "story" : "feed",
    };
    persistPost(post);
    router.push("/history");
  }, [snapshot, router]);

  // Schedule → save to server + localStorage + redirect
  const handleSchedule = useCallback(async (song: SongResult | null, scheduledDate: string) => {
    const localId = `scheduled-${Date.now()}`;
    const post: ScheduledPost = {
      id: localId,
      title: snapshot.caption.headline || "Scheduled Post",
      content: [snapshot.caption.headline, snapshot.caption.primaryText, snapshot.caption.hashtags, snapshot.caption.cta].filter(Boolean).join("\n\n"),
      platform: snapshot.targetPlatforms.join(", "),
      scheduledDate: scheduledDate,
      status: "scheduled",
      imageDataUrl: snapshot.imageSrc ?? undefined,
      surface: snapshot.isVideo ? "story" : snapshot.surface as "feed" | "story",
    };
    // Map surface to cron-compatible value: video story → reel
    const cronSurface = snapshot.isVideo ? "reel" : (snapshot.surface === "story" ? "story" : "feed");
    if (song) post.content += `\n\n🎵 ${song.artistName} - ${song.songTitle}`;
    persistPost(post);

    // Save to server for cron-based auto-publishing; store server task ID for cross-reference
    let serverError: string | undefined;
    if (snapshot.imageSrc) {
      try {
        let imageUrl = snapshot.imageSrc;
        if (imageUrl.startsWith("data:")) {
          imageUrl = await uploadToPublicUrl(imageUrl);
        }
        const res = await fetch("/api/cron/publish-scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl,
            caption: post.content,
            platforms: snapshot.targetPlatforms,
            surface: cronSurface,
            scheduledAt: scheduledDate,
          }),
        });
        const json = await res.json();
        if (json.ok && json.task?.id) {
          post.serverTaskId = json.task.id;
          persistPost(post);
          console.log(`📅 Scheduled: ${json.task.id.slice(-8)} for ${scheduledDate} [${cronSurface}] → server OK`);
        } else {
          serverError = json.error || "Server rejected schedule request";
          console.error(`📅 Schedule FAILED: ${serverError}`);
        }
      } catch (err) {
        serverError = err instanceof Error ? err.message : "Network error scheduling post";
        console.error(`📅 Schedule FAILED: ${serverError}`);
      }
    } else {
      serverError = "No image attached — cannot schedule without media";
    }

    // If server scheduling failed, keep as draft so user knows it didn't go through
    if (serverError) {
      post.status = "draft";
      persistPost(post);
      addPublishTask({
        id: `sched-err-${Date.now()}`,
        status: "error",
        message: `Schedule failed: ${serverError}. Post saved as draft — try again.`,
      });
      router.push("/history");
    } else {
      // Success — show toast then redirect to History
      setSuccessMsg(`Scheduled for ${scheduledDate.replace("T", " at ")} — will auto-publish then.`);
      setResetKey((k) => k + 1);
      setStep("composer");
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Brief delay so user sees the success toast before redirect
      setTimeout(() => router.push("/history"), 1500);
    }
  }, [snapshot, router]);

  // Publish → audio reel API if song selected, else regular publish
  const handlePublish = useCallback((song: SongResult | null) => {
    setPublishingFromPreview(true);

    if (song && snapshot.imageSrc) {
      const taskId = `pub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      addPublishTask({ id: taskId, status: "processing", message: "🎬 Downloading audio & merging…" });
      (async () => {
        try {
          let imageUrl = snapshot.imageSrc!;
          if (imageUrl.startsWith("data:")) imageUrl = await uploadToPublicUrl(imageUrl);

          // Download audio client-side (fresh Deezer token) then upload to Cloudinary
          updatePublishTask(taskId, { message: "🎬 Downloading audio track…" });
          const audioBlob = await fetch(song.audioUrl).then((r) => r.blob());
          const audioForm = new FormData();
          audioForm.append("file", audioBlob, "audio.mp3");
          audioForm.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
          const audioUp = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`, { method: "POST", body: audioForm });
          const audioUpJson = await audioUp.json();
          if (!audioUpJson.secure_url) throw new Error("Audio upload failed");
          const cloudAudioUrl = audioUpJson.secure_url;

          updatePublishTask(taskId, { message: "🎬 Merging image + audio via FFmpeg…" });
          const res = await fetch("/api/publish/audio-reel", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl, audioUrl: cloudAudioUrl, audioName: `${song.artistName} - ${song.songTitle}`, caption: [snapshot.caption.headline, snapshot.caption.primaryText, snapshot.caption.hashtags].filter(Boolean).join("\n\n"), targetPlatforms: snapshot.targetPlatforms, mediaType: snapshot.surface === "story" ? "story" : "reel" }),
          });
          const json = await res.json();
          if (json.ok) {
            const platforms: string[] = [];
            if (json.instagram) platforms.push("Instagram");
            if (json.facebook) platforms.push("Facebook");
            const msg = `🎬 Audio Reel posted to ${platforms.join(" & ")} with "${song.artistName} - ${song.songTitle}"!`;
            if (json.errors?.length) {
              updatePublishTask(taskId, { status: "success", message: msg + ` (Note: ${json.errors.join(", ")})`, url: json.instagram?.permalink || json.facebook?.permalink });
            } else {
              updatePublishTask(taskId, { status: "success", message: msg + " You can check it now.", url: json.instagram?.permalink || json.facebook?.permalink });
            }
            persistPost({ id: `published-${Date.now()}`, title: snapshot.caption.headline || "Audio Reel", content: [snapshot.caption.headline, snapshot.caption.primaryText, snapshot.caption.hashtags].filter(Boolean).join("\n\n") + `\n\n🎵 ${song.artistName} - ${song.songTitle}`, platform: snapshot.targetPlatforms.join(", "), scheduledDate: new Date().toISOString(), status: "published", imageDataUrl: snapshot.imageSrc ?? undefined, surface: "story" } as ScheduledPost);
          } else {
            updatePublishTask(taskId, { status: "error", message: json.errors?.join(" · ") || "Audio reel publish failed" });
          }
        } catch (err) {
          updatePublishTask(taskId, { status: "error", message: err instanceof Error ? err.message : "Audio reel error" });
        }
      })();
    } else {
      setTriggerPublish((k) => k + 1);
    }
  }, [snapshot, addPublishTask, updatePublishTask]);

  // Need isVideoFile for carousel
  function isVideoFile(file: File): boolean {
    return file.type.startsWith("video/");
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[26px] font-bold text-[var(--heading)] tracking-tight">
            Content &amp; Posts
          </h1>
          <p className="text-[14px] text-[var(--body-subtle)] mt-1">
            Create, preview, and publish to Instagram &amp; Facebook — AI-powered copy in your brand voice
          </p>
        </div>

        {/* Mode switcher */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-semibold border transition-all",
              mode === "single"
                ? "border-[var(--brand)] text-white"
                : "border-[var(--border-default)] text-[var(--body-subtle)] bg-[var(--neutral-secondary-medium)]"
            )}
            style={mode === "single" ? GRADIENT_BRAND : undefined}
          >
            <ImageIcon className="size-3.5" />
            Single / Reel
          </div>
          {mode === "single" && (
            <button
              onClick={() => setMode("carousel")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-semibold bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] hover:text-[var(--heading)] border border-[var(--border-default)] transition-colors"
            >
              <Images className="size-3.5" /> Switch to Carousel
            </button>
          )}
          {mode === "carousel" && (
            <button
              onClick={() => { setMode("single"); setPendingCarouselFiles(null); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-semibold bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] hover:text-[var(--heading)] border border-[var(--border-default)] transition-colors"
            >
              ← Back to Single
            </button>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[2px] bg-[var(--success)] text-white shadow-lg animate-fade-in">
          <CheckCircle2 className="size-5 shrink-0" />
          <p className="text-[14px] font-semibold flex-1">{successMsg}</p>
          <button onClick={() => setSuccessMsg(null)} className="shrink-0 p-1 hover:bg-white/20 rounded-[2px] transition-colors">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Two-Step Workflow Progress ── */}
      <div className="flex items-center gap-0">
        {/* Step 1 */}
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-l-[2px] border text-[12px] font-semibold transition-all",
            step === "composer"
              ? "text-white border-transparent shadow-xs"
              : "text-[var(--body-subtle)] bg-[var(--neutral-secondary-medium)] border-[var(--border-default)]"
          )}
          style={step === "composer" ? GRADIENT_BRAND : undefined}
        >
          <span
            className={cn(
              "size-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0",
              step === "composer"
                ? "bg-white/30 text-white"
                : "bg-[var(--neutral-tertiary)] text-[var(--body-subtle)]"
            )}
          >
            1
          </span>
          <span>Compose &amp; Edit</span>
        </div>

        {/* Connector */}
        <div
          className={cn(
            "h-[2px] w-8 shrink-0",
            step === "preview" ? "" : "bg-[var(--border-default)]"
          )}
          style={step === "preview" ? GRADIENT_BRAND : undefined}
        />

        {/* Step 2 */}
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-r-[2px] border text-[12px] font-semibold transition-all",
            step === "preview"
              ? "text-white border-transparent shadow-xs"
              : "text-[var(--body-subtle)] bg-[var(--neutral-secondary-medium)] border-[var(--border-default)]"
          )}
          style={step === "preview" ? GRADIENT_BRAND : undefined}
        >
          <span
            className={cn(
              "size-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0",
              step === "preview"
                ? "bg-white/30 text-white"
                : "bg-[var(--neutral-tertiary)] text-[var(--body-subtle)]"
            )}
          >
            2
          </span>
          <span>Review &amp; Publish</span>
        </div>
      </div>

      {/* Step Content — both screens stay mounted to preserve state */}
      <div className={step === "composer" ? "" : "hidden"}>
        <PostComposer
          collections={COLLECTIONS}
          postTypes={POST_TYPES}
          onCreatePost={(post) => {
            persistPost(post);
            setSuccessMsg("Draft saved! View it in History.");
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
          onRequestCarousel={handleRequestCarousel}
          publishTasks={publishTasks}
          onAddPublishTask={addPublishTask}
          onUpdatePublishTask={updatePublishTask}
          onDismissPublishTask={dismissPublishTask}
          hasActiveTasks={hasActiveTasks}
          mode="edit"
          onNext={handleNext}
          resetKey={resetKey}
          triggerPublish={triggerPublish}
          initialDraft={
            draftData
              ? {
                  caption: draftData.caption
                    ? parseCaptionFromText(draftData.caption)
                    : undefined,
                  imageDataUrl: draftData.imageDataUrl || undefined,
                  platform: draftData.platform,
                  surface: draftData.surface,
                }
              : undefined
          }
        />
      </div>

      <div className={step === "preview" ? "" : "hidden"}>
        <PreviewScreen
          imageSrc={snapshot.imageSrc}
          isVideo={snapshot.isVideo}
          videoSrc={snapshot.videoSrc}
          caption={snapshot.caption}
          selectedPreviewLabel={snapshot.selectedPreviewLabel}
          targetPlatforms={snapshot.targetPlatforms}
          platform={
            snapshot.targetPlatforms.includes("facebook") && !snapshot.targetPlatforms.includes("instagram")
              ? "facebook"
              : snapshot.targetPlatforms.includes("instagram") && !snapshot.targetPlatforms.includes("facebook")
                ? "instagram"
                : snapshot.selectedPreviewLabel.includes("Facebook") ? "facebook" : "instagram"
          }
          surface={snapshot.surface as "feed" | "story"}
          hasActiveTasks={hasActiveTasks || publishingFromPreview}
          isPublishing={publishingFromPreview}
          carouselSlides={snapshot.carouselSlides}
          carouselIdx={snapshot.carouselIdx}
          mediaFilesCount={snapshot.mediaFilesCount}
          onPublish={handlePublish}
          onSchedule={handleSchedule}
          onSaveDraft={handleSaveDraft}
          onBack={handleBack}
        />
      </div>

      {/* ── Publish Status ── */}
      {publishTasks.length > 0 && (
        <div className="space-y-2">
          {publishTasks.map((task) => (
            <div key={task.id} className={cn(
              "flex items-center gap-3 pl-4 pr-2 py-3 rounded-[2px] animate-fade-in border shadow-xs",
              task.status === "processing"
                ? "bg-[var(--neutral-primary-soft)] border-l-[3px] border-l-[var(--brand)] border-[var(--border-default)]"
                : task.status === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400"
            )}>
              {task.status === "processing" ? (
                <Loader2 className="size-4 text-[var(--brand)] animate-spin shrink-0" />
              ) : task.status === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <p className="text-[13px] font-medium flex-1 leading-snug">{task.message}</p>
              {task.url && (
                <a href={task.url} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-[2px] bg-[var(--neutral-secondary-medium)] hover:bg-[var(--brand-softer)] text-[var(--brand)] border border-[var(--border-default)] transition-colors">
                  <ExternalLink className="size-3" /> View Post
                </a>
              )}
              {task.status !== "processing" && (
                <button onClick={() => dismissPublishTask(task.id)}
                  className="shrink-0 p-1.5 rounded-[2px] hover:bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] hover:text-[var(--heading)] transition-colors">
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
