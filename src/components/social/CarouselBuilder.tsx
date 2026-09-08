"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { loadImage, fileToDataUrl, cropToPreset, FORMAT_PRESETS, isVideoFile, extractVideoThumb, getVideoMeta } from "@/lib/imageFormats";
import { formatImageSmart } from "@/lib/smartFormat";
import { parseGeneratedCopy, BRAND_SYSTEM_PROMPT } from "@/lib/captionParse";
import { FeedPreview, StoryPreview, type SocialPlatform, type PreviewDevice } from "./SocialPreviews";
import { Images, Plus, X, ChevronLeft, ChevronRight, Sparkles, Upload, GripVertical, Film, ImageIcon, Monitor, Smartphone, LayoutGrid, PenLine, Check } from "lucide-react";

const CARD = "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px]";
const GRADIENT_BRAND: React.CSSProperties = { background: "linear-gradient(135deg,#C8399C,#7C3AED)" };
const SQUARE = FORMAT_PRESETS[0];
const STORY = FORMAT_PRESETS.find((p) => p.key === "story") ?? FORMAT_PRESETS[0];

interface Slide {
  id: string;
  formatted: string | null;
  original: string | null;
  method?: string;
  isVideo?: boolean;
  videoBlobUrl?: string;
  duration?: number;
}

interface CarouselBuilderProps {
  onCarouselReady: (slides: string[]) => void;
  onCaptionReady?: (caption: string) => void;
  /** Files forwarded from single-mode multi-upload */
  initialFiles?: File[] | null;
  onFilesConsumed?: () => void;
}

export default function CarouselBuilder({ onCarouselReady, onCaptionReady, initialFiles, onFilesConsumed }: CarouselBuilderProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [status, setStatus] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  // preview surface controls (like single post)
  const [pvSurface, setPvSurface] = useState<"feed" | "story">("feed");
  const [pvPlatform, setPvPlatform] = useState<SocialPlatform>("instagram");
  const [pvDevice, setPvDevice] = useState<PreviewDevice>("desktop");

  // ── inline image editor ──
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editFit, setEditFit] = useState<"contain" | "cover">("contain");
  const [editFocusX, setEditFocusX] = useState(0.5);
  const [editFocusY, setEditFocusY] = useState(0.5);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  const openEditor = (idx: number) => {
    const s = slides[idx];
    if (!s || s.isVideo) return;
    setEditingIdx(idx);
    setEditFit("contain");
    setEditFocusX(0.5);
    setEditFocusY(0.5);
    setEditPreview(null);
  };

  const applyEdit = async () => {
    if (editingIdx === null) return;
    const s = slides[editingIdx];
    if (!s?.original) return;
    try {
      const img = await loadImage(s.original);
      const preset = SQUARE;
      const result = cropToPreset(img, preset, { fit: editFit, focusX: editFocusX, focusY: editFocusY });
      setSlides((prev) => { const n = [...prev]; n[editingIdx] = { ...n[editingIdx], formatted: result, method: editFit === "cover" ? "cover-crop" : "contain-fit" }; return n; });
    } catch { /* keep original */ }
    setEditingIdx(null);
  };

  // regenerate preview when edit controls change
  useEffect(() => {
    if (editingIdx === null) return;
    const s = slides[editingIdx];
    if (!s?.original) return;
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(s.original!);
        const result = cropToPreset(img, SQUARE, { fit: editFit, focusX: editFocusX, focusY: editFocusY });
        if (!cancelled) setEditPreview(result);
      } catch { /* */ }
    })();
    return () => { cancelled = true; };
  }, [editingIdx, editFit, editFocusX, editFocusY, slides]);

  // caption
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [cta, setCta] = useState("");
  const [genPrompt, setGenPrompt] = useState("");
  const [generatingCap, setGeneratingCap] = useState(false);

  const fullCap = [headline, body, hashtags, cta].filter(Boolean).join("\n\n");
  const notifyCap = (h: string, b: string, ht: string, c: string) =>
    onCaptionReady?.([h, b, ht, c].filter(Boolean).join("\n\n"));

  // notify parent of slide changes
  useEffect(() => {
    const filled = slides.filter((s) => s.formatted).map((s) => s.formatted!);
    onCarouselReady(filled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  // process forwarded files from single mode
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      handleBulk(initialFiles as unknown as FileList);
      onFilesConsumed?.();
    }
    // only run when initialFiles first arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]);

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  // ── Process single slide ──
  const processOne = useCallback(async (idx: number, file: File) => {
    const vid = isVideoFile(file);
    setStatus(`Slide ${idx + 1}: AI formatting…`);
    const src = await fileToDataUrl(file);
    let result: string | null = null;
    let method = "";
    let blobUrl: string | undefined;
    let dur: number | undefined;

    const preset = vid ? STORY : SQUARE;
    try {
      const img = await loadImage(src);
      result = cropToPreset(img, preset, { fit: vid ? "cover" : "contain" });
      method = "contain-fit";
    } catch { result = src; }

    if (vid) {
      blobUrl = URL.createObjectURL(file);
      try { const m = await getVideoMeta(file); dur = m.duration; } catch { /* */ }
    }

    setSlides((prev) => {
      const n = [...prev];
      n[idx] = { ...n[idx], original: src, formatted: result, method, isVideo: vid, videoBlobUrl: blobUrl, duration: dur };
      if (vid) setHasVideo(true);
      return n;
    });

    // AI enhance (image only)
    if (!vid) {
      try {
        const smart = await formatImageSmart(src, preset, { onStage: (s) => setStatus(s), description: "fashion photo" });
        result = smart.dataUrl; method = smart.method;
      } catch { /* */ }
      setSlides((prev) => { const n = [...prev]; n[idx] = { ...n[idx], formatted: result, method }; return n; });
    }
    setStatus("");
  }, []);

  // ── Bulk upload ──
  const handleBulk = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, 10);
    // only 1 video allowed
    const vidCount = arr.filter((f) => isVideoFile(f)).length;
    if (vidCount > 1) { setStatus("Only 1 video allowed in carousel."); return; }
    if (hasVideo && vidCount > 0) { setStatus("Already have a video. Only 1 allowed."); return; }

    const start = slides.length;
    const newSlides: Slide[] = arr.map((_, i) => ({
      id: `s${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
      formatted: null, original: null,
    }));
    setSlides((prev) => [...prev, ...newSlides].slice(0, 10));
    setActiveIdx(start);
    for (let i = 0; i < arr.length; i++) {
      const ai = start + i; if (ai >= 10) break;
      await processOne(ai, arr[i]);
    }
  }, [slides.length, processOne, hasVideo]);

  const removeSlide = (idx: number) => {
    const s = slides[idx];
    if (s?.videoBlobUrl) { URL.revokeObjectURL(s.videoBlobUrl); setHasVideo(false); }
    setSlides((prev) => prev.filter((_, i) => i !== idx));
    if (activeIdx >= slides.length - 1) setActiveIdx(Math.max(0, slides.length - 2));
  };

  // ── Drag & drop ──
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) setDragOverIdx(idx);
  };
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return;
    setSlides((prev) => { const n = [...prev]; const [m] = n.splice(dragIdx, 1); n.splice(idx, 0, m); return n; });
    setActiveIdx(idx); setDragIdx(null); setDragOverIdx(null);
  };

  // ── Caption generation ──
  const handleGenerateCaption = async () => {
    setGeneratingCap(true);
    try {
      const user = `Instagram carousel copy for TallinnDoll (${slides.length} slides):\n- ${genPrompt || "fashion collection"}\n- Estonian, "Sina/Sa" voice (never "Teie"). Provide: 1) Headline (max 40), 2) Body copy, 3) 3-5 hashtags from the brand set, 4) CTA`;
      const res = await fetch("/api/openai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemPrompt: BRAND_SYSTEM_PROMPT, userPrompt: user }) });
      const json = await res.json();
      if (json.result) {
        const p = parseGeneratedCopy(json.result);
        setHeadline(p.headline); setBody(p.primaryText); setHashtags(p.hashtags); setCta(p.cta);
        notifyCap(p.headline, p.primaryText, p.hashtags, p.cta);
      }
    } catch { /* */ }
    setGeneratingCap(false);
  };

  const filled = slides.filter((s) => s.formatted).length;

  return (
    <div className={cn(CARD, "p-5 space-y-4")}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Images className="size-5 text-[var(--brand)] shrink-0" />
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--heading)]">Carousel</h2>
            <p className="text-[12px] text-[var(--body-subtle)]">{filled}/10 slides · Drag to reorder · {hasVideo ? "🎬 1 video" : "Images only"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => bulkInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-[2px]" style={GRADIENT_BRAND}>
            <Upload className="size-3.5" /> Select files
          </button>
          <input ref={bulkInputRef} type="file" accept="image/*,video/*" multiple className="hidden"
            onChange={(e) => { handleBulk(e.target.files); if (e.target) e.target.value = ""; }} />
        </div>
      </div>

      {/* Empty dropzone */}
      {slides.length === 0 && (
        <label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); handleBulk(e.dataTransfer.files); }}
          className="flex flex-col items-center gap-3 py-14 border-2 border-dashed border-[var(--border-default-medium)] rounded-[2px] cursor-pointer hover:border-[var(--brand)] hover:bg-[var(--brand-softer)] transition-colors">
          <Upload className="size-8 text-[var(--body-subtle)]" />
          <p className="text-[14px] font-semibold text-[var(--heading)]">Drop images or videos here</p>
          <p className="text-[12px] text-[var(--body-subtle)]">Select multiple at once · Max 10 · 1 video allowed</p>
        </label>
      )}

      {slides.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          {/* LEFT: Thumbnail strip */}
          <div className="space-y-3">
            {/* Thumbnails */}
            <div className="flex flex-wrap gap-2">
              {slides.map((s, i) => (
                <div key={s.id} draggable
                  onDragStart={() => handleDragStart(i)} onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, i)} onDrop={() => handleDrop(i)}
                  onClick={() => setActiveIdx(i)}
                  className={cn("shrink-0 size-16 rounded-[2px] border-2 cursor-pointer overflow-hidden relative group transition-all",
                    i === activeIdx ? "border-[var(--brand)]" : "border-transparent hover:border-[var(--border-default)]",
                    dragOverIdx === i && "border-[var(--brand)] border-dashed bg-[var(--brand-softer)]")}>
                  {s.formatted ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.formatted} alt={`${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--neutral-secondary-medium)] text-[var(--body-subtle)] text-[10px]">{i + 1}</div>
                  )}
                  {s.isVideo && <Film className="absolute top-0.5 left-0.5 size-3 text-white drop-shadow" />}
                  <span className="absolute bottom-0 left-1 text-[9px] font-bold text-white drop-shadow">{i + 1}</span>
                  {/* remove */}
                  <button onClick={(ev) => { ev.stopPropagation(); removeSlide(i); }}
                    className="absolute top-0 right-0 size-4 rounded-bl-[2px] bg-[var(--danger)] text-white items-center justify-center hidden group-hover:flex"><X className="size-2.5" /></button>
                  {/* edit (images only) */}
                  {!s.isVideo && (
                    <button onClick={(ev) => { ev.stopPropagation(); openEditor(i); }}
                      className="absolute top-0 left-0 size-4 rounded-br-[2px] bg-black/60 text-white items-center justify-center hidden group-hover:flex"><PenLine className="size-2.5" /></button>
                  )}
                  {/* drag handle */}
                  <div className="absolute bottom-0 right-0 size-4 bg-black/40 rounded-tl-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab"><GripVertical className="size-2.5 text-white" /></div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--body-subtle)]">🖐 Drag thumbnails to reorder · Click to preview</p>
            {status && <span className="text-[12px] text-[var(--brand)] animate-pulse block">{status}</span>}
          </div>

          {/* RIGHT: dynamic preview */}
          <div className="flex flex-col items-center gap-3">
            {/* Preview controls */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <div className="inline-flex rounded-[2px] border border-[var(--border-default)] overflow-hidden">
                {(["feed", "story"] as const).map((s) => (
                  <button key={s} onClick={() => setPvSurface(s)}
                    className={cn("px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                      pvSurface === s ? "text-white" : "text-[var(--body-subtle)] hover:bg-[var(--neutral-secondary-medium)]")}
                    style={pvSurface === s ? GRADIENT_BRAND : undefined}>{s}</button>
                ))}
              </div>
              <div className="inline-flex rounded-[2px] border border-[var(--border-default)] overflow-hidden">
                {(["instagram", "facebook"] as const).map((p) => (
                  <button key={p} onClick={() => setPvPlatform(p)}
                    className={cn("px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                      pvPlatform === p ? "bg-[var(--brand-softer)] text-[var(--brand)]" : "text-[var(--body-subtle)] hover:bg-[var(--neutral-secondary-medium)]")}>{p === "instagram" ? "IG" : "FB"}</button>
                ))}
              </div>
              {pvSurface !== "story" && (
                <div className="inline-flex rounded-[2px] border border-[var(--border-default)] overflow-hidden">
                  <button onClick={() => setPvDevice("desktop")}
                    className={cn("px-1.5 py-1", pvDevice === "desktop" ? "bg-[var(--brand-softer)] text-[var(--brand)]" : "text-[var(--body-subtle)]")}><Monitor className="size-3.5" /></button>
                  <button onClick={() => setPvDevice("mobile")}
                    className={cn("px-1.5 py-1", pvDevice === "mobile" ? "bg-[var(--brand-softer)] text-[var(--brand)]" : "text-[var(--body-subtle)]")}><Smartphone className="size-3.5" /></button>
                </div>
              )}
            </div>

            {/* Dynamic preview */}
            {pvSurface === "feed" ? (
              <FeedPreview platform={pvPlatform} device={pvDevice}
                caption={{ headline, primaryText: body, hashtags, cta }}
                imageSrc={slides[activeIdx]?.formatted ?? null}
                isVideo={slides[activeIdx]?.isVideo} videoSrc={slides[activeIdx]?.videoBlobUrl ?? null}
                carouselSlides={slides}
                carouselIdx={activeIdx}
                onCarouselPrev={() => setActiveIdx((p) => Math.max(0, p - 1))}
                onCarouselNext={() => setActiveIdx((p) => Math.min(slides.length - 1, p + 1))} />
            ) : (
              <StoryPreview
                platform={pvPlatform}
                caption={{ headline, primaryText: body, hashtags, cta }}
                imageSrc={slides[activeIdx]?.formatted ?? null}
                isVideo={slides[activeIdx]?.isVideo}
                videoSrc={slides[activeIdx]?.videoBlobUrl ?? null}
              />
            )}
            <p className="text-[12px] font-medium text-[var(--body-subtle)]">{activeIdx + 1} / {slides.length}</p>
          </div>
        </div>
      )}

      {/* Caption generator (below carousel) */}
      {slides.length >= 2 && (
        <div className="p-4 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="size-3.5 text-[var(--brand)]" />
            <span className="text-[12px] font-semibold text-[var(--heading)]">Caption</span>
            <input value={genPrompt} onChange={(e) => setGenPrompt(e.target.value)}
              placeholder="Context (e.g. linen collection...)" style={{ backgroundColor: "var(--neutral-primary-soft)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }}
              className="flex-1 px-3 py-1.5 text-[13px] rounded-[2px] focus:outline-none min-w-[160px]" />
            <button onClick={handleGenerateCaption} disabled={generatingCap}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-white rounded-[2px] shrink-0 disabled:opacity-60" style={GRADIENT_BRAND}>
              <Sparkles className="size-3" /> {generatingCap ? "…" : "Generate"}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={headline} onChange={(e) => { setHeadline(e.target.value); notifyCap(e.target.value, body, hashtags, cta); }}
              placeholder="Headline" style={{ backgroundColor: "var(--neutral-primary-soft)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }}
              className="px-3 py-1.5 text-[13px] rounded-[2px] focus:outline-none" />
            <input value={cta} onChange={(e) => { setCta(e.target.value); notifyCap(headline, body, hashtags, e.target.value); }}
              placeholder="CTA (e.g. Shop Now)" style={{ backgroundColor: "var(--neutral-primary-soft)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }}
              className="px-3 py-1.5 text-[13px] rounded-[2px] focus:outline-none" />
          </div>
          <textarea value={body} onChange={(e) => { setBody(e.target.value); notifyCap(headline, e.target.value, hashtags, cta); }} rows={2}
            placeholder="Body copy" style={{ backgroundColor: "var(--neutral-primary-soft)", border: "1px solid var(--border-default-medium)", color: "var(--heading)" }}
            className="w-full px-3 py-1.5 text-[13px] rounded-[2px] focus:outline-none resize-none" />
          <input value={hashtags} onChange={(e) => { setHashtags(e.target.value); notifyCap(headline, body, e.target.value, cta); }}
            placeholder="#hashtags" style={{ backgroundColor: "var(--neutral-primary-soft)", border: "1px solid var(--border-default-medium)", color: "var(--brand)" }}
            className="w-full px-3 py-1.5 text-[13px] rounded-[2px] focus:outline-none" />
        </div>
      )}

      {/* ── Inline Image Editor Modal ── */}
      {editingIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setEditingIdx(null)}>
          <div className="bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[var(--heading)]">Edit Slide {editingIdx + 1}</h3>
              <button onClick={() => setEditingIdx(null)} className="p-1 text-[var(--body-subtle)] hover:text-[var(--heading)]"><X className="size-5" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div>
                <p className="text-[11px] font-semibold text-[var(--body-subtle)] mb-1 uppercase tracking-wider">Original</p>
                <div className="rounded-[2px] overflow-hidden bg-[var(--neutral-secondary-medium)]" style={{ aspectRatio: "1/1" }}>
                  {slides[editingIdx]?.original && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slides[editingIdx].original!} className="w-full h-full object-contain" alt="Original" />
                  )}
                </div>
              </div>
              {/* Edited preview */}
              <div>
                <p className="text-[11px] font-semibold text-[var(--body-subtle)] mb-1 uppercase tracking-wider">Preview</p>
                <div className="rounded-[2px] overflow-hidden bg-[var(--neutral-secondary-medium)]" style={{ aspectRatio: "1/1" }}>
                  {editPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editPreview} className="w-full h-full object-contain" alt="Preview" />
                  ) : slides[editingIdx]?.formatted ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slides[editingIdx].formatted!} className="w-full h-full object-contain" alt="Current" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--body-subtle)] text-[12px]">Processing…</div>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-[var(--body-subtle)] w-16">Fit mode</span>
                {(["contain", "cover"] as const).map((f) => (
                  <button key={f} onClick={() => setEditFit(f)}
                    className={cn("px-3 py-1.5 text-[12px] font-medium rounded-[2px] border capitalize transition-colors",
                      editFit === f ? "text-white border-transparent" : "text-[var(--body)] border-[var(--border-default)]")}
                    style={editFit === f ? GRADIENT_BRAND : undefined}>
                    {f === "contain" ? "Model-safe (full image)" : "Fill frame (crop edges)"}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[var(--body-subtle)]">Horizontal align</label>
                  <input type="range" min={0} max={1} step={0.01} value={editFocusX} onChange={(e) => setEditFocusX(parseFloat(e.target.value))}
                    className="w-full accent-[var(--brand)]" />
                </div>
                <div>
                  <label className="text-[11px] text-[var(--body-subtle)]">Vertical align</label>
                  <input type="range" min={0} max={1} step={0.01} value={editFocusY} onChange={(e) => setEditFocusY(parseFloat(e.target.value))}
                    className="w-full accent-[var(--brand)]" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setEditingIdx(null)}
                className="px-4 py-2 text-[13px] font-medium text-[var(--body)] rounded-[2px] border border-[var(--border-default)] hover:bg-[var(--neutral-secondary-medium)]">Cancel</button>
              <button onClick={applyEdit}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-[2px]" style={GRADIENT_BRAND}>
                <Check className="size-3.5" /> Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
