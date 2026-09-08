"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { FORMAT_PRESETS, cropToPreset, loadImage, fileToDataUrl } from "@/lib/imageFormats";
import { uploadToPublicUrl } from "@/lib/uploadMedia";
import {
  Upload, ImageIcon, Sparkles, Loader2, Download, CheckCircle2, AlertCircle,
  Trash2, ExternalLink,
} from "lucide-react";

// ── Constants ──

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: "var(--neutral-secondary-medium)",
  border: "1px solid var(--border-default-medium)",
  color: "var(--heading)",
};

const STORY_PRESET = FORMAT_PRESETS.find((p) => p.key === "story")!;

// ── Types ──

interface CaptionFields {
  headline: string;
  caption: string;
  price: string;
  cta: string;
}

interface GenerationResult {
  imageUrl: string;
  uid: string;
}

// ── Component ──

export default function StoryDetailingPage() {
  // Image state
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [storyCrop, setStoryCrop] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [imageLoading, setImageLoading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Caption state
  const [caption, setCaption] = useState<CaptionFields>({
    headline: "",
    caption: "",
    price: "",
    cta: "",
  });

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Process uploaded image to story format (9:16) ──
  const processImage = useCallback(async (dataUrl: string) => {
    setImageLoading(true);
    setError(null);
    setResult(null);
    try {
      const img = await loadImage(dataUrl);
      // Crop to story format (9:16) — cover fit, center focus
      const cropped = cropToPreset(img, STORY_PRESET, {
        fit: "cover",
        focusX: 0.5,
        focusY: 0.38, // push subject slightly up (IG story safe zone)
      });
      setStoryCrop(cropped);
    } catch {
      setError("Failed to process image. Try a different file.");
      setStoryCrop(null);
    } finally {
      setImageLoading(false);
    }
  }, []);

  // ── File drop handler ──
  const handleFileDrop = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file.");
        return;
      }
      setFileName(file.name);
      const dataUrl = await fileToDataUrl(file);
      setImageDataUrl(dataUrl);
      await processImage(dataUrl);
    },
    [processImage]
  );

  // ── Drag/drop events ──
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileDrop(e.dataTransfer.files);
  };

  // ── Generate via Bannerbear ──
  const handleGenerate = async () => {
    if (!storyCrop) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      // 1) Upload cropped story image to Cloudinary for public URL
      const publicImageUrl = await uploadToPublicUrl(storyCrop);

      // 2) Build Bannerbear modifications
      const modifications: { name: string; [key: string]: string }[] = [];

      // Always include the photo layer
      modifications.push({ name: "photo", image_url: publicImageUrl });

      // Add text layers (use the field label as layer name — flexible, matches template)
      if (caption.headline.trim()) {
        modifications.push({ name: "headline", text: caption.headline.trim() });
      }
      if (caption.caption.trim()) {
        modifications.push({ name: "caption", text: caption.caption.trim() });
      }
      if (caption.price.trim()) {
        modifications.push({ name: "price", text: caption.price.trim() });
      }
      if (caption.cta.trim()) {
        modifications.push({ name: "cta", text: caption.cta.trim() });
      }

      // 3) Call Bannerbear API
      const res = await fetch("/api/bannerbear/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modifications }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Bannerbear generation failed");
      }

      setResult({ imageUrl: json.imageUrl || json.imageUrlJpg, uid: json.uid });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // ── Reset ──
  const handleReset = () => {
    setImageDataUrl(null);
    setStoryCrop(null);
    setFileName("");
    setCaption({ headline: "", caption: "", price: "", cta: "" });
    setResult(null);
    setError(null);
  };

  // ── Download result ──
  const handleDownload = async () => {
    if (!result?.imageUrl) return;
    try {
      const blob = await fetch(result.imageUrl).then((r) => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tallindoll-story-${Date.now()}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* */ }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-[var(--heading)] flex items-center gap-3">
          <Sparkles className="size-7 text-[var(--brand)]" />
          Story Detailing
        </h1>
        <p className="text-[14px] text-[var(--body)] mt-1">
          Upload an image, add captions, and generate a branded story banner via Bannerbear.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[2px] bg-[var(--danger-soft)] border border-[var(--border-danger-subtle)] text-[var(--fg-danger)] animate-fade-in">
          <AlertCircle className="size-4 shrink-0" />
          <p className="text-[13px] font-medium flex-1">{error}</p>
          <button onClick={() => setError(null)} className="shrink-0 text-[var(--fg-danger)]/70 hover:text-[var(--fg-danger)]">✕</button>
        </div>
      )}

      {/* Success banner */}
      {result && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[2px] bg-[var(--success-soft)] border border-[var(--border-success-subtle)] text-[var(--fg-success)] animate-fade-in">
          <CheckCircle2 className="size-4 shrink-0" />
          <p className="text-[13px] font-medium flex-1">Banner generated successfully!</p>
          <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white rounded-[2px] hover:opacity-90 transition-opacity" style={GRADIENT_BRAND}>
            <Download className="size-3.5" /> Download
          </button>
          {result.imageUrl && (
            <a href={result.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 text-[12px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors">
              <ExternalLink className="size-3.5" /> Open
            </a>
          )}
        </div>
      )}

      {/* Main: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── LEFT: Upload + Caption ── */}
        <div className={cn(CARD, "p-6 space-y-5")}>
          {/* Upload section */}
          <div>
            <h2 className="text-[16px] font-semibold text-[var(--heading)] flex items-center gap-2">
              <Upload className="size-4 text-[var(--brand)]" />
              Upload Image
            </h2>
            <p className="text-[12px] text-[var(--body-subtle)] mt-0.5">
              Drop or select an image — auto-cropped to 9:16 story format
            </p>
          </div>

          {/* Dropzone */}
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "relative border-2 border-dashed rounded-[2px] p-8 text-center cursor-pointer transition-all",
              dragOver
                ? "border-[var(--brand)] bg-[var(--brand-softer)]"
                : "border-[var(--border-default)] hover:border-[var(--border-default-medium)] hover:bg-[var(--neutral-secondary-medium)]"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileDrop(e.target.files)}
            />

            {imageDataUrl && fileName ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDataUrl} alt="Uploaded" className="max-h-32 mx-auto rounded-[2px] object-contain" />
                <p className="text-[13px] font-medium text-[var(--heading)]">{fileName}</p>
                <p className="text-[11px] text-[var(--body-subtle)]">Click or drop to change</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="size-14 mx-auto rounded-full flex items-center justify-center" style={GRADIENT_BRAND}>
                  <ImageIcon className="size-6 text-white" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-[var(--heading)]">
                    Drop image here or click to browse
                  </p>
                  <p className="text-[12px] text-[var(--body-subtle)] mt-0.5">
                    PNG, JPG, WebP — auto-resized to 9:16 story format
                  </p>
                </div>
              </div>
            )}

            {imageLoading && (
              <div className="absolute inset-0 bg-[var(--neutral-primary-soft)]/80 rounded-[2px] flex items-center justify-center">
                <Loader2 className="size-6 text-[var(--brand)] animate-spin" />
              </div>
            )}
          </div>

          {/* Caption fields */}
          <div className="space-y-3 pt-2 border-t border-[var(--border-default)]">
            <h2 className="text-[16px] font-semibold text-[var(--heading)]">
              Caption Details
            </h2>
            <p className="text-[12px] text-[var(--body-subtle)]">
              These fields map to your Bannerbear template layers. Leave blank to skip.
            </p>

            <Field label="Headline" hint="Main title on the banner">
              <input
                value={caption.headline}
                onChange={(e) => setCaption({ ...caption, headline: e.target.value })}
                placeholder="e.g. Summer Breeze Collection"
                className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none"
                style={INPUT_STYLE}
              />
            </Field>

            <Field label="Caption" hint="Supporting text below headline">
              <textarea
                value={caption.caption}
                onChange={(e) => setCaption({ ...caption, caption: e.target.value })}
                rows={2}
                placeholder="e.g. New arrivals just landed — shop the look"
                className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none resize-none"
                style={INPUT_STYLE}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Price" hint="e.g. €140">
                <input
                  value={caption.price}
                  onChange={(e) => setCaption({ ...caption, price: e.target.value })}
                  placeholder="€140"
                  className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none"
                  style={INPUT_STYLE}
                />
              </Field>
              <Field label="CTA" hint="e.g. Shop Now">
                <input
                  value={caption.cta}
                  onChange={(e) => setCaption({ ...caption, cta: e.target.value })}
                  placeholder="Shop Now"
                  className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none"
                  style={INPUT_STYLE}
                />
              </Field>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleGenerate}
              disabled={!storyCrop || generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={GRADIENT_BRAND}
            >
              {generating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {generating ? "Generating…" : "Generate Banner"}
            </button>
            {imageDataUrl && (
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--body)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
              >
                <Trash2 className="size-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Story Preview + Result ── */}
        <div className="space-y-4">
          {/* Story Preview */}
          <div className={cn(CARD, "p-5")}>
            <h2 className="text-[14px] font-semibold text-[var(--heading)] mb-3 flex items-center gap-2">
              <ImageIcon className="size-4 text-[var(--brand)]" />
              Story Preview (9:16)
            </h2>

            <div className="bg-[var(--neutral-secondary-medium)] rounded-[2px] p-4 flex items-center justify-center min-h-[400px]">
              {imageLoading ? (
                <div className="flex flex-col items-center gap-3 text-[var(--body-subtle)]">
                  <Loader2 className="size-8 animate-spin text-[var(--brand)]" />
                  <span className="text-[13px]">Processing image…</span>
                </div>
              ) : storyCrop ? (
                <div className="relative mx-auto" style={{ width: 280 }}>
                  {/* Phone frame */}
                  <div className="rounded-[28px] border-[8px] border-[#1c1c1e] bg-black overflow-hidden shadow-xl">
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-4 pt-1.5 pb-0.5 text-[10px] font-semibold text-white bg-black">
                      <span>9:41</span>
                      <span>📶 🔋</span>
                    </div>
                    {/* Image */}
                    <div className="relative" style={{ aspectRatio: "9/16" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={storyCrop}
                        alt="Story preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Caption overlay on preview */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12">
                        {caption.headline && (
                          <p className="text-[15px] font-semibold text-white drop-shadow">
                            {caption.headline}
                          </p>
                        )}
                        {caption.caption && (
                          <p className="text-[12px] text-white/90 drop-shadow mt-1 leading-snug">
                            {caption.caption}
                          </p>
                        )}
                        {(caption.price || caption.cta) && (
                          <div className="flex items-center gap-2 mt-2">
                            {caption.price && (
                              <span className="px-2 py-0.5 text-[11px] font-bold text-black bg-white rounded-[4px]">
                                {caption.price}
                              </span>
                            )}
                            {caption.cta && (
                              <span className="text-[11px] font-semibold text-white">
                                {caption.cta} →
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-[var(--body-subtle)] mt-2">
                    Story Preview — 9:16
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-[var(--body-subtle)] py-12">
                  <div className="size-16 rounded-full flex items-center justify-center" style={GRADIENT_BRAND}>
                    <ImageIcon className="size-7 text-white" />
                  </div>
                  <p className="text-[15px] font-semibold text-[var(--heading)]">
                    Story Preview
                  </p>
                  <p className="text-[13px] text-center max-w-[260px]">
                    Upload an image on the left to see how it looks in 9:16 story format.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Generated Banner Result */}
          {result && (
            <div className={cn(CARD, "p-5 animate-fade-in")}>
              <h2 className="text-[14px] font-semibold text-[var(--heading)] mb-3 flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[var(--success)]" />
                Generated Banner
              </h2>
              <div className="bg-[var(--neutral-secondary-medium)] rounded-[2px] p-4 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.imageUrl}
                  alt="Generated banner"
                  className="max-w-full rounded-[2px] shadow-lg"
                  style={{ maxHeight: 500 }}
                />
              </div>
              <p className="text-[11px] text-[var(--body-subtle)] mt-2 text-center truncate">
                UID: {result.uid}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Utility: form field wrapper ──

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--body-subtle)] mb-1">
        {label}
        {hint && <span className="text-[11px] text-[var(--body-subtle)]/60 ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
