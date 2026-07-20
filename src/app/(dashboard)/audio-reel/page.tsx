"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { fileToDataUrl, extractVideoThumb, isVideoFile } from "@/lib/imageFormats";
import {
  Upload,
  Music2,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  X,
  ImageIcon,
} from "lucide-react";

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

interface TrackInfo {
  songTitle: string;
  artistName: string;
  audioUrl: string;
}

export default function AudioReelPage() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null); // Cloudinary URL
  const [songName, setSongName] = useState("");
  const [track, setTrack] = useState<TrackInfo | null>(null);
  const [caption, setCaption] = useState("");
  const [searching, setSearching] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    igUrl?: string;
    fbUrl?: string;
    videoUrl?: string;
  } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image Upload ──
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageUploading(true);
    const dataUrl = await fileToDataUrl(file);
    setImageDataUrl(dataUrl);

    // Upload to Cloudinary
    try {
      const form = new FormData();
      const blob = await (await fetch(dataUrl)).blob();
      form.append("file", blob, "audio-reel-image.jpg");
      form.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
      const up = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: form }
      );
      const json = await up.json();
      if (json.secure_url) setImageUrl(json.secure_url);
    } catch {
      // Continue with dataUrl as fallback
    }
    setImageUploading(false);
  };

  // ── Deezer Search (via server proxy) ──
  const handleSearch = async () => {
    if (!songName.trim()) return;
    setSearching(true);
    setTrack(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/deezer-search?q=${encodeURIComponent(songName.trim())}`
      );
      const json = await res.json();
      if (json.found) {
        setTrack({
          songTitle: json.songTitle,
          artistName: json.artistName,
          audioUrl: json.audioUrl,
        });
      } else {
        setResult({
          ok: false,
          message: json.message || `No free preview found for "${songName}". Try a different song.`,
        });
      }
    } catch {
      setResult({ ok: false, message: "Search failed. Check your connection." });
    }
    setSearching(false);
  };

  // ── Publish ──
  const handlePublish = async () => {
    if (!imageUrl || !track) return;
    setPublishing(true);
    setResult(null);

    try {
      const res = await fetch("/api/publish/audio-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          audioUrl: track.audioUrl,
          audioName: `${track.artistName} - ${track.songTitle}`,
          caption: caption || undefined,
        }),
      });
      const json = await res.json();

      if (json.ok) {
        setResult({
          ok: true,
          message: "Audio Reel published to both platforms!",
          igUrl: json.instagram?.permalink,
          fbUrl: json.facebook?.permalink,
          videoUrl: json.videoUrl,
        });
      } else {
        setResult({
          ok: false,
          message: json.errors?.join(" · ") || "Publish failed",
        });
      }
    } catch (err) {
      setResult({
        ok: false,
        message: err instanceof Error ? err.message : "Publish failed",
      });
    }
    setPublishing(false);
  };

  // ── Reset ──
  const handleReset = () => {
    setImageDataUrl(null);
    setImageUrl(null);
    setTrack(null);
    setSongName("");
    setCaption("");
    setResult(null);
  };

  return (
    <div className="max-w-[900px] mx-auto px-6 space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold text-[var(--heading)] flex items-center gap-3">
          <Music2 className="size-7 text-[var(--brand)]" />
          Audio Reel
        </h1>
        <p className="text-[14px] text-[var(--body)] mt-1">
          Upload an image + search a song → auto-merge &amp; post to Instagram &amp; Facebook Reels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── LEFT: Controls ── */}
        <div className={cn(CARD, "p-5 space-y-4")}>
          {/* Image Upload */}
          <div>
            <label className="block text-[12px] font-medium text-[var(--body-subtle)] mb-1.5">
              Image
            </label>
            {imageDataUrl ? (
              <div className="relative group rounded-[2px] overflow-hidden border border-[var(--border-default)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Upload"
                  className="w-full object-cover"
                  style={{ maxHeight: 220 }}
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 size-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3.5 text-white" />
                </button>
              </div>
            ) : (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleImageUpload(f);
                }}
                className="flex flex-col items-center justify-center gap-3 py-10 rounded-[2px] border-2 border-dashed border-[var(--border-default-medium)] cursor-pointer hover:border-[var(--brand)] hover:bg-[var(--brand-softer)] transition-colors text-center"
              >
                {imageUploading ? (
                  <Loader2 className="size-6 text-[var(--brand)] animate-spin" />
                ) : (
                  <div className="size-12 rounded-full flex items-center justify-center" style={GRADIENT_BRAND}>
                    <Upload className="size-5 text-white" />
                  </div>
                )}
                <p className="text-[14px] font-semibold text-[var(--heading)]">
                  {imageUploading ? "Uploading…" : "Drop image or click to upload"}
                </p>
              </label>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f);
              }}
            />
          </div>

          {/* Song Search */}
          <div>
            <label className="block text-[12px] font-medium text-[var(--body-subtle)] mb-1.5">
              Song Name
            </label>
            <div className="flex gap-2">
              <input
                value={songName}
                onChange={(e) => setSongName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. Coldplay Yellow"
                className="flex-1 px-3 py-2 text-[14px] rounded-[2px] focus:outline-none"
                style={INPUT_STYLE}
              />
              <button
                onClick={handleSearch}
                disabled={searching || !songName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-white rounded-[2px] disabled:opacity-50 transition-opacity"
                style={GRADIENT_BRAND}
              >
                {searching ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Track Result */}
          {track && (
            <div className="p-3 rounded-[2px] bg-[var(--success-soft)] border border-[var(--border-success-subtle)] flex items-center gap-3">
              <Music2 className="size-5 text-[var(--success)] shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-[var(--fg-success)]">
                  {track.artistName} — {track.songTitle}
                </p>
                <p className="text-[11px] text-[var(--body-subtle)]">30s preview from Deezer</p>
              </div>
            </div>
          )}

          {/* Caption */}
          <div>
            <label className="block text-[12px] font-medium text-[var(--body-subtle)] mb-1.5">
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="Add a caption for your Reel…"
              className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none resize-none"
              style={INPUT_STYLE}
            />
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={publishing || !imageUrl || !track}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-[15px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 disabled:opacity-50"
            style={GRADIENT_BRAND}
          >
            {publishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {publishing ? "Publishing…" : "Publish Audio Reel"}
          </button>

          {/* Result */}
          {result && (
            <div
              className={cn(
                "flex items-start gap-3 p-4 rounded-[2px] text-[13px] border",
                result.ok
                  ? "bg-[var(--success-soft)] border-[var(--border-success-subtle)] text-[var(--fg-success)]"
                  : "bg-[var(--danger-soft)] border-[var(--border-danger-subtle)] text-[var(--fg-danger)]"
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">{result.message}</p>
                <div className="flex gap-3 mt-1.5">
                  {result.igUrl && (
                    <a href={result.igUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline text-[12px] font-medium">
                      Instagram <ExternalLink className="size-3" />
                    </a>
                  )}
                  {result.fbUrl && (
                    <a href={result.fbUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 underline text-[12px] font-medium">
                      Facebook <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>
              <button onClick={() => setResult(null)}
                className="shrink-0 p-0.5 rounded-[2px] hover:bg-black/10 transition-colors">
                <X className="size-4 opacity-60" />
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview ── */}
        <div className={cn(CARD, "p-5")}>
          <h2 className="text-[14px] font-semibold text-[var(--heading)] mb-3 flex items-center gap-2">
            <Music2 className="size-4 text-[var(--brand)]" />
            Preview
          </h2>

          {!imageDataUrl && !track ? (
            <div className="flex flex-col items-center gap-3 py-16 text-[var(--body-subtle)]">
              <div className="size-16 rounded-full flex items-center justify-center" style={GRADIENT_BRAND}>
                <Music2 className="size-7 text-white" />
              </div>
              <p className="text-[14px] font-medium text-[var(--heading)]">Audio Reel Preview</p>
              <p className="text-[12px] text-center max-w-[240px]">
                Upload an image and search a song to see how your Reel will look
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image preview */}
              {imageDataUrl && (
                <div>
                  <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1.5">
                    Your Image
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageDataUrl}
                    alt="Preview"
                    className="w-full rounded-[2px] object-cover"
                    style={{ maxHeight: 280 }}
                  />
                </div>
              )}

              {/* Track info */}
              {track && (
                <div className="p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
                  <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1">
                    Audio Track
                  </p>
                  <p className="text-[14px] font-semibold text-[var(--heading)]">
                    {track.artistName}
                  </p>
                  <p className="text-[13px] text-[var(--body)]">{track.songTitle}</p>
                  <p className="text-[11px] text-[var(--body-subtle)] mt-1 flex items-center gap-1">
                    <Music2 className="size-3" />
                    30s Deezer preview
                  </p>
                </div>
              )}

              {/* Platform badges */}
              <div className="flex gap-2">
                <span className="px-2.5 py-1 text-[11px] font-medium rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)]">
                  Instagram Reel
                </span>
                <span className="px-2.5 py-1 text-[11px] font-medium rounded-[2px] bg-[rgba(139,92,246,0.12)] text-[var(--purple)]">
                  Facebook Reel
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
