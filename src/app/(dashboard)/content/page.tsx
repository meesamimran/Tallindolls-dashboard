"use client";

import { useState, useCallback } from "react";
import type { ScheduledPost } from "@/types/index";
import { cn } from "@/lib/utils";
import PostComposer from "@/components/social/PostComposer";
import CarouselBuilder from "@/components/social/CarouselBuilder";
import ApprovalQueue from "@/components/social/ApprovalQueue";
import { publishPost } from "@/lib/publishPost";
import { uploadToPublicUrl, isUploadConfigured } from "@/lib/uploadMedia";
import { isVideoFile } from "@/lib/imageFormats";
import { ImageIcon, Images, Send, Plus, Loader2, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

const CARD = "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";
const GRADIENT_BRAND: React.CSSProperties = { background: "linear-gradient(135deg,#C8399C,#7C3AED)" };

const COLLECTIONS = [
  "Summer Breeze", "Linen Luxe", "Evening Bloom", "Urban Edge",
  "Boho Spirit", "Classic Core", "Coastal Charm", "Minimal Muse",
  "Bold Statement", "Eco Essence",
];
const POST_TYPES = [
  "New Collection Launch", "Sale Announcement", "Behind the Scenes",
  "Styling Tips", "Customer Spotlight", "Seasonal Promotion",
];

type ContentMode = "single" | "carousel";

export default function ContentPage() {
  const [mode, setMode] = useState<ContentMode>("single");
  const [posts, setPosts] = useState<ScheduledPost[]>([]);

  // carousel state
  const [carouselSlides, setCarouselSlides] = useState<string[]>([]);
  const [carouselCaption, setCarouselCaption] = useState("");
  const [carPublishing, setCarPublishing] = useState(false);
  const [carPublishResult, setCarPublishResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null);
  const [carTargetPlatforms, setCarTargetPlatforms] = useState<("instagram" | "facebook")[]>(["instagram", "facebook"]);
  const [pendingCarouselFiles, setPendingCarouselFiles] = useState<File[] | null>(null);

  const handleCreatePost = (post: ScheduledPost) => {
    setPosts((prev) => [post, ...prev]);
    setTimeout(() => document.getElementById("approval-workflow")?.scrollIntoView({ behavior: "smooth" }), 120);
  };
  const handleUpdateStatus = (id: string, status: ScheduledPost["status"]) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  const handleRemove = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  const addDraft = (opts: { title: string; content: string; platform?: string; imageDataUrl?: string }) => {
    handleCreatePost({
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: opts.title, content: opts.content,
      platform: opts.platform ?? "Instagram",
      scheduledDate: new Date().toISOString(), status: "draft",
      imageDataUrl: opts.imageDataUrl, surface: "feed",
    });
  };

  // ── Auto-switch: single → carousel on multi-upload ──
  const handleRequestCarousel = useCallback((files: File[]) => {
    // check for video limit
    const vids = files.filter((f) => isVideoFile(f));
    if (vids.length > 1) { alert("Only 1 video allowed in a carousel."); return; }
    setMode("carousel");
    setPendingCarouselFiles(files);
  }, []);

  // ── Carousel ──
  const handleCarouselReady = useCallback((slides: string[]) => setCarouselSlides(slides), []);
  const handleCarouselCaption = useCallback((caption: string) => setCarouselCaption(caption), []);

  const carouselSaveDraft = () => {
    if (carouselSlides.length < 2) return;
    carouselSlides.forEach((dataUrl, i) => {
      addDraft({
        title: `Carousel ${i + 1}/${carouselSlides.length}`,
        content: i === 0 ? carouselCaption || "Carousel post" : `Slide ${i + 1}`,
        imageDataUrl: dataUrl,
      });
    });
    setCarouselSlides([]); setCarouselCaption(""); setCarPublishResult(null);
  };

  const carouselPublish = async () => {
    if (carouselSlides.length < 2) return;
    setCarPublishing(true); setCarPublishResult(null);
    try {
      if (!isUploadConfigured()) throw new Error("Cloudinary not configured.");
      const urls: string[] = [];
      for (const d of carouselSlides) urls.push(await uploadToPublicUrl(d));
      let anyOk = false; let firstUrl: string | undefined; const msgs: string[] = [];
      if (carTargetPlatforms.includes("instagram")) {
        const res = await fetch("/api/publish/carousel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrls: urls, caption: carouselCaption || "" }) });
        const json = await res.json();
        if (res.ok && json.id) { anyOk = true; firstUrl = json.permalink; addDraft({ title: "Carousel (IG)", content: carouselCaption || `${carouselSlides.length} slides`, imageDataUrl: carouselSlides[0] }); msgs.push(`IG carousel — ${carouselSlides.length} slides live`); }
        else msgs.push(`IG: ${json.error || "failed"}`);
      }
      if (carTargetPlatforms.includes("facebook")) {
        let fbOk = 0;
        for (let i = 0; i < urls.length; i++) {
          const r = await publishPost({ platform: "facebook", surface: "feed", imageDataUrl: carouselSlides[i], captionText: i === 0 ? (carouselCaption || "Carousel") : `Slide ${i + 1}` });
          if (r.ok) fbOk++;
        }
        if (fbOk > 0) { anyOk = true; msgs.push(`FB: ${fbOk} slides posted`); } else msgs.push("FB: failed");
      }
      setCarPublishResult({ ok: anyOk, message: msgs.join(" · "), url: firstUrl });
      if (anyOk) { setCarouselSlides([]); setCarouselCaption(""); }
    } catch (err) {
      setCarPublishResult({ ok: false, message: err instanceof Error ? err.message : "Publish failed" });
    } finally { setCarPublishing(false); }
  };

  const toggleCar = <T,>(arr: T[], v: T): T[] => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <div className="max-w-[1200px] mx-auto px-6 space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold text-[var(--heading)]">Content &amp; Posts</h1>
        <p className="text-[14px] text-[var(--body)] mt-1">
          Upload any image or video — we auto-detect the format. Single, reel, or carousel.
        </p>
      </div>

      {/* Mode hint */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-medium"
          style={{ backgroundColor: mode === "single" ? "var(--brand-softer)" : "var(--neutral-secondary-medium)", color: mode === "single" ? "var(--brand)" : "var(--body-subtle)" }}>
          <ImageIcon className="size-3.5" /> {mode === "single" ? "Single / Reel" : "Single"}
        </div>
        {mode === "single" && (
          <button onClick={() => setMode("carousel")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-medium bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] hover:text-[var(--heading)] transition-colors">
            <Images className="size-3.5" /> Switch to Carousel
          </button>
        )}
        {mode === "carousel" && (
          <button onClick={() => { setMode("single"); setPendingCarouselFiles(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-medium bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] hover:text-[var(--heading)] transition-colors">
            ← Back to Single
          </button>
        )}
        <span className="text-[11px] text-[var(--body-subtle)]">🎬 Video → auto reel · 📸 Multiple images → auto carousel</span>
      </div>

      {/* Active content */}
      {mode === "single" && (
        <PostComposer collections={COLLECTIONS} postTypes={POST_TYPES}
          onCreatePost={handleCreatePost} onRequestCarousel={handleRequestCarousel} />
      )}

      {mode === "carousel" && (
        <div className="space-y-4">
          <CarouselBuilder onCarouselReady={handleCarouselReady} onCaptionReady={handleCarouselCaption}
            initialFiles={pendingCarouselFiles} onFilesConsumed={() => setPendingCarouselFiles(null)} />
          {carouselSlides.length >= 2 && (
            <div className={cn(CARD, "p-4 space-y-3")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-semibold text-[var(--heading)]">Publish to:</span>
                {(["instagram", "facebook"] as const).map((p) => {
                  const on = carTargetPlatforms.includes(p);
                  return <button key={p} onClick={() => setCarTargetPlatforms((prev) => toggleCar(prev, p))}
                    className={cn("px-3 py-1.5 text-[13px] font-medium rounded-[2px] border capitalize", on ? "text-white border-transparent" : "text-[var(--body-subtle)] border-[var(--border-default)]")}
                    style={on ? GRADIENT_BRAND : undefined}>{p}</button>;
                })}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={carouselSaveDraft}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)]"><Plus className="size-3.5" /> Save Draft</button>
                <button onClick={carouselPublish} disabled={carPublishing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-[2px] disabled:opacity-60" style={GRADIENT_BRAND}>
                  {carPublishing ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Approve &amp; Publish</button>
              </div>
              {carPublishResult && (
                <div className={cn("flex items-start gap-2 p-3 rounded-[2px] text-[13px] border", carPublishResult.ok ? "bg-[var(--success-soft)] border-[var(--border-success-subtle)] text-[var(--fg-success)]" : "bg-[var(--danger-soft)] border-[var(--border-danger-subtle)] text-[var(--fg-danger)]")}>
                  {carPublishResult.ok ? <CheckCircle2 className="size-4 shrink-0 mt-0.5" /> : <AlertCircle className="size-4 shrink-0 mt-0.5" />}
                  <div className="min-w-0"><p className="font-medium">{carPublishResult.message}</p>{carPublishResult.url && <a href={carPublishResult.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 underline">View <ExternalLink className="size-3" /></a>}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div id="approval-workflow" className="scroll-mt-6">
        <ApprovalQueue posts={posts} onUpdate={handleUpdateStatus} onRemove={handleRemove} />
      </div>
    </div>
  );
}
