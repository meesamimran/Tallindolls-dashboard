"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { type Caption, FeedPreview, StoryPreview, type SocialPlatform, type PreviewDevice } from "./SocialPreviews";
import SongSearch, { type SongResult } from "./SongSearch";
import ScheduleModal from "./ScheduleModal";
import {
  Send,
  Loader2,
  Calendar,
  ArrowLeft,
  Music2,
  Play,
  Pause,
  Monitor,
  Smartphone,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Layers,
  Eye,
  Share2,
  Info,
  Clock,
  FileText,
} from "lucide-react";

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

interface PreviewScreenProps {
  imageSrc: string | null;
  isVideo: boolean;
  videoSrc?: string | null;
  caption: Caption;
  selectedPreviewLabel: string;
  targetPlatforms: string[];
  platform: SocialPlatform;
  surface: "feed" | "story";
  hasActiveTasks: boolean;
  isPublishing?: boolean;
  carouselSlides?: { formatted: string | null; isVideo?: boolean; videoBlobUrl?: string | null }[];
  carouselIdx?: number;
  mediaFilesCount?: number;
  onPublish: (song: SongResult | null) => void;
  onSchedule: (song: SongResult | null, scheduledDate: string) => void;
  onSaveDraft: () => void;
  onBack: () => void;
}

export default function PreviewScreen({
  imageSrc,
  isVideo,
  videoSrc,
  caption,
  selectedPreviewLabel,
  targetPlatforms,
  platform,
  surface,
  hasActiveTasks,
  isPublishing,
  carouselSlides,
  carouselIdx,
  mediaFilesCount,
  onPublish,
  onSchedule,
  onSaveDraft,
  onBack,
}: PreviewScreenProps) {
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioConsent, setAudioConsent] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [draftSaved, setDraftSaved] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanField = (s: string) =>
    s.replace(/^(headline|primary\s*text|body|hashtags|cta|call\s*to\s*action):?\s*/i, "").trim();

  const captionText = [
    cleanField(caption.headline),
    cleanField(caption.primaryText),
    caption.hashtags,
    cleanField(caption.cta),
  ]
    .filter(Boolean)
    .join("\n\n");

  const wordCount = captionText ? captionText.split(/\s+/).filter(Boolean).length : 0;
  const charCount = captionText.length;
  const isReadyToPublish = Boolean(captionText && imageSrc && (!selectedSong || audioConsent));

  const handleCopyCaption = () => {
    if (!captionText) return;
    navigator.clipboard.writeText(captionText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handlePlayPause = () => {
    if (!selectedSong?.audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedSong.audioUrl);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onerror = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => setPlaying(false));
      setPlaying(true);
    }
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    onSaveDraft();
    setTimeout(() => setDraftSaved(false), 2500);
  };

  const audioName = selectedSong ? `${selectedSong.artistName} - ${selectedSong.songTitle}` : undefined;
  const multiSlide = (carouselSlides?.length ?? 0) > 1;

  return (
    <div className={cn(CARD, "p-6 space-y-6")}>
      {/* ── Top Navigation Bar ── */}
      <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[2px] text-[13px] font-semibold text-[var(--body)] hover:text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-all"
        >
          <ArrowLeft className="size-4" /> Back to Compose
        </button>

        <div className="flex items-center gap-3">
          {draftSaved && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-[var(--success-soft)] text-[var(--fg-success)] text-[12px] font-semibold animate-fade-in border border-[var(--border-success)]">
              <CheckCircle2 className="size-3.5" /> Draft Saved
            </span>
          )}

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
            <span
              className={cn(
                "size-2 rounded-full",
                isReadyToPublish ? "bg-[var(--success)] animate-pulse" : "bg-[var(--warning)]"
              )}
            />
            <span className="text-[12px] font-semibold text-[var(--heading)]">
              {isReadyToPublish ? "Ready to Publish" : "Missing Requirements"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Summary, Audio, Specifications (5 cols)        */}
        {/* ============================================================ */}
        <div className="lg:col-span-5 space-y-5">
          {/* Post Specifications Card */}
          <div className="p-4 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--body-subtle)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="size-3.5 text-[var(--brand)]" /> Post Specifications
              </span>
              <span className="text-[11px] text-[var(--body-subtle)]">
                {charCount} chars · {wordCount} words
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px]">
              <div className="p-2.5 rounded-[2px] bg-[var(--neutral-primary-soft)] border border-[var(--border-default)]">
                <span className="text-[11px] text-[var(--body-subtle)] block font-medium">Placement</span>
                <span className="font-semibold text-[var(--heading)] capitalize">
                  {surface === "story" ? (isVideo ? "Reel / Story" : "Story") : "Feed Post"}
                </span>
              </div>
              <div className="p-2.5 rounded-[2px] bg-[var(--neutral-primary-soft)] border border-[var(--border-default)]">
                <span className="text-[11px] text-[var(--body-subtle)] block font-medium">Media Type</span>
                <span className="font-semibold text-[var(--heading)]">
                  {multiSlide
                    ? `Carousel (${carouselSlides?.length} slides)`
                    : isVideo
                      ? "Video / Reel"
                      : "Single Image"}
                </span>
              </div>
            </div>

            {/* Target Platform Badges */}
            <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-medium text-[var(--body-subtle)]">Destinations:</span>
              <div className="flex items-center gap-1.5">
                {targetPlatforms.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[11px] font-semibold uppercase tracking-wider"
                    style={
                      p === "instagram"
                        ? { backgroundColor: "rgba(217, 79, 176, 0.15)", color: "#D94FB0" }
                        : { backgroundColor: "rgba(24, 119, 242, 0.15)", color: "#1877F2" }
                    }
                  >
                    {p === "instagram" ? "📸 Instagram" : "🌐 Facebook"}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Caption Review Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-[var(--body-subtle)] uppercase tracking-wider">
                Caption Preview
              </p>
              {captionText && (
                <button
                  onClick={handleCopyCaption}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand)] hover:underline"
                >
                  {copiedCaption ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedCaption ? "Copied" : "Copy text"}
                </button>
              )}
            </div>

            <div className="p-4 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] max-h-[220px] overflow-y-auto">
              {captionText ? (
                <p className="text-[13px] text-[var(--heading)] whitespace-pre-line leading-relaxed">
                  {captionText}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--body-subtle)] italic">No caption generated or written yet.</p>
              )}
            </div>
          </div>

          {/* Audio Selection & Sync Card */}
          <div className="p-4 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[var(--body-subtle)] uppercase tracking-wider flex items-center gap-1.5">
                <Music2 className="size-3.5 text-[var(--brand)]" /> Background Audio
              </span>
              {selectedSong && (
                <span className="text-[10px] font-semibold text-[var(--brand)] uppercase tracking-wider">
                  Audio Synced
                </span>
              )}
            </div>

            <SongSearch onSelect={setSelectedSong} selectedSong={selectedSong} />

            {selectedSong && (
              <div className="space-y-2.5 pt-2 border-t border-[var(--border-default)]">
                <div className="flex items-center justify-between p-2 rounded-[2px] bg-[var(--neutral-primary-soft)] border border-[var(--border-default)]">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-[12px] font-semibold text-[var(--heading)] truncate">
                      {selectedSong.songTitle}
                    </p>
                    <p className="text-[11px] text-[var(--body-subtle)] truncate">
                      {selectedSong.artistName}
                    </p>
                  </div>
                  <button
                    onClick={handlePlayPause}
                    className="size-7 rounded-full bg-[var(--brand)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                  >
                    {playing ? <Pause className="size-3 fill-white" /> : <Play className="size-3 fill-white ml-[1px]" />}
                  </button>
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-[2px] bg-[var(--warning-soft)] border border-[var(--border-warning-subtle)]">
                  <input
                    type="checkbox"
                    checked={audioConsent}
                    onChange={(e) => setAudioConsent(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--brand)] cursor-pointer shrink-0"
                  />
                  <span className="text-[12px] text-[var(--fg-warning)] leading-snug font-medium">
                    I agree to attach &quot;{selectedSong.artistName} - {selectedSong.songTitle}&quot; to this publish task.
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Interactive Live Preview Stage (7 cols)        */}
        {/* ============================================================ */}
        <div className="lg:col-span-7 space-y-3">
          {/* Stage Controls Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
            {/* Selected preview label (matches the composer dropdown) */}
            <span className="text-[12px] font-semibold text-[var(--heading)] inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--brand)]" />
              {selectedPreviewLabel || `${platform} ${surface === "story" ? "Story" : "Feed"}`} Preview
            </span>

            {/* Device Switcher (Desktop vs Mobile) */}
            {surface === "feed" && (
              <div className="inline-flex rounded-[2px] border border-[var(--border-default)] overflow-hidden bg-[var(--neutral-secondary-medium)]">
                <button
                  onClick={() => setDevice("desktop")}
                  title="Desktop Web Preview"
                  className={cn(
                    "px-2.5 py-1 inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors",
                    device === "desktop"
                      ? "bg-[var(--brand-softer)] text-[var(--brand)]"
                      : "text-[var(--body-subtle)] hover:bg-[var(--neutral-primary-soft)]"
                  )}
                >
                  <Monitor className="size-3.5" /> Desktop
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  title="Mobile App Preview"
                  className={cn(
                    "px-2.5 py-1 inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors",
                    device === "mobile"
                      ? "bg-[var(--brand-softer)] text-[var(--brand)]"
                      : "text-[var(--body-subtle)] hover:bg-[var(--neutral-primary-soft)]"
                  )}
                >
                  <Smartphone className="size-3.5" /> Mobile
                </button>
              </div>
            )}
          </div>

          {/* Elevated Preview Canvas with Ambient Backing — single preview */}
          <div className="relative rounded-[2px] border border-[var(--border-default)] bg-[var(--neutral-secondary-medium)] p-4 sm:p-6 overflow-hidden min-h-[520px] flex items-start justify-center">
            <div className="w-full flex justify-center animate-fade-in">
              {surface === "story" ? (
                <StoryPreview
                  platform={platform}
                  caption={caption}
                  imageSrc={imageSrc}
                  isVideo={isVideo}
                  videoSrc={videoSrc ?? null}
                  audioName={audioName}
                  onAudioPlay={selectedSong ? handlePlayPause : undefined}
                  isAudioPlaying={playing}
                />
              ) : (
                <FeedPreview
                  platform={platform}
                  device={device}
                  caption={caption}
                  imageSrc={imageSrc}
                  isVideo={isVideo}
                  videoSrc={videoSrc ?? null}
                  carouselSlides={carouselSlides}
                  carouselIdx={carouselIdx}
                  audioName={audioName}
                  onAudioPlay={selectedSong ? handlePlayPause : undefined}
                  isAudioPlaying={playing}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Final Action Bar ── */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-default)] flex-wrap">
        <button
          onClick={handleSaveDraft}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
        >
          Save as Draft
        </button>

        <button
          onClick={() => setShowSchedule(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
        >
          <Calendar className="size-4 text-[var(--brand)]" />
          Schedule Date…
        </button>

        <button
          onClick={() => onPublish(selectedSong)}
          disabled={hasActiveTasks || !isReadyToPublish}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-all hover:opacity-90 disabled:opacity-50 ml-auto shadow-md"
          style={GRADIENT_BRAND}
        >
          {hasActiveTasks || isPublishing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {hasActiveTasks || isPublishing ? "Publishing Task Active…" : "Approve & Publish Live"}
        </button>
      </div>

      <ScheduleModal
        open={showSchedule}
        onClose={() => setShowSchedule(false)}
        onConfirm={(dateTime) => onSchedule(selectedSong, dateTime)}
      />
    </div>
  );
}

