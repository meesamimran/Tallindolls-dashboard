"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { type Caption, FeedPreview, StoryPreview, type SocialPlatform, type PreviewDevice } from "./SocialPreviews";
import SongSearch, { type SongResult } from "./SongSearch";
import ScheduleModal from "./ScheduleModal";
import {
  Send, Loader2, Calendar, ArrowLeft, Music2, Play, Pause, Monitor, Smartphone, CheckCircle2,
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const cleanField = (s: string) =>
    s.replace(/^(headline|primary\s*text|body|hashtags|cta|call\s*to\s*action):?\s*/i, "").trim();
  const captionText = [cleanField(caption.headline), cleanField(caption.primaryText), caption.hashtags, cleanField(caption.cta)]
    .filter(Boolean)
    .join("\n\n");

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
    <div className={cn(CARD, "p-6 space-y-5")}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--body)] hover:text-[var(--heading)] transition-colors"
        >
          <ArrowLeft className="size-4" /> Back to Editor
        </button>
        <div className="flex items-center gap-2">
          {draftSaved && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--fg-success)] animate-fade-in">
              <CheckCircle2 className="size-3.5" /> Draft saved
            </span>
          )}
          <span className="text-[12px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider">
            Final Review &amp; Publish
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: Caption + Audio + Info */}
        <div className="space-y-4">
          {/* Caption */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1.5">
              Caption
            </p>
            <div className="p-3 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] max-h-[180px] overflow-y-auto">
              {captionText ? (
                <p className="text-[13px] text-[var(--heading)] whitespace-pre-line leading-snug">
                  {captionText}
                </p>
              ) : (
                <p className="text-[13px] text-[var(--body-subtle)] italic">No caption yet</p>
              )}
            </div>
          </div>

          {/* Audio Selection */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1.5">
              🎵 Audio (optional)
            </p>
            <SongSearch onSelect={setSelectedSong} selectedSong={selectedSong} />
            {selectedSong && (
              <div className="space-y-2">
                <p className="text-[11px] text-[var(--body-subtle)]">
                  Audio attached — visible in the preview on the right.
                </p>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-[2px] bg-[var(--warning-soft)] border border-[var(--border-warning-subtle)]">
                  <input
                    type="checkbox"
                    checked={audioConsent}
                    onChange={(e) => setAudioConsent(e.target.checked)}
                    className="mt-0.5 size-4 accent-[var(--brand)] cursor-pointer shrink-0"
                  />
                  <span className="text-[13px] text-[var(--fg-warning)] leading-snug font-medium">
                    I understand this will be posted as a <strong>{surface === "story" ? (isVideo ? "Reel" : "Story") : "Feed post"}</strong> with the audio track
                    &quot;{selectedSong.artistName} - {selectedSong.songTitle}&quot;.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Story caption hint */}
          {surface === "story" && captionText && (
            <p className="text-[11px] text-[var(--body-subtle)]">
              Caption will appear as text overlay on your Story.
            </p>
          )}

          {/* Publishing info */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1.5">
              Publishing to
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 text-[12px] font-medium rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)]">
                {surface === "story" ? (isVideo ? "Reel" : "Story") : "Feed"}
              </span>
              {targetPlatforms.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 text-[12px] font-medium rounded-[2px] bg-[var(--neutral-secondary-medium)] text-[var(--body)] capitalize border border-[var(--border-default)]"
                >
                  {p}
                </span>
              ))}
              {multiSlide && (
                <span className="px-2.5 py-1 text-[12px] font-medium rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)]">
                  {carouselSlides?.length} slides
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider">
              Live Preview
            </p>
            {/* Device toggle for feed previews */}
            {surface === "feed" && (
              <div className="inline-flex rounded-[2px] border border-[var(--border-default)] overflow-hidden">
                <button
                  onClick={() => setDevice("desktop")}
                  title="Desktop view"
                  className={cn(
                    "px-1.5 py-1 transition-colors",
                    device === "desktop"
                      ? "bg-[var(--brand-softer)] text-[var(--brand)]"
                      : "text-[var(--body-subtle)] hover:bg-[var(--neutral-secondary-medium)]"
                  )}
                >
                  <Monitor className="size-3.5" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  title="Mobile view"
                  className={cn(
                    "px-1.5 py-1 transition-colors",
                    device === "mobile"
                      ? "bg-[var(--brand-softer)] text-[var(--brand)]"
                      : "text-[var(--body-subtle)] hover:bg-[var(--neutral-secondary-medium)]"
                  )}
                >
                  <Smartphone className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className={cn(
            "bg-[var(--neutral-secondary-medium)] rounded-[2px] p-4",
            targetPlatforms.length > 1 && surface === "feed" ? "grid grid-cols-1 xl:grid-cols-2 gap-4" : "flex justify-center"
          )}>
            {targetPlatforms.map((p) => {
              const pv = p as "instagram" | "facebook";
              return (
                <div key={p} className="flex justify-center min-w-0">
                  {surface === "story" ? (
                    <StoryPreview
                      platform={pv}
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
                      platform={pv}
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-default)]">
        <button
          onClick={handleSaveDraft}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
        >
          Save Draft
        </button>
        <button
          onClick={() => setShowSchedule(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
        >
          <Calendar className="size-4" />
          Schedule
        </button>
        <button
          onClick={() => onPublish(selectedSong)}
          disabled={hasActiveTasks || !captionText || !imageSrc || (!!selectedSong && !audioConsent)}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 disabled:opacity-50 ml-auto"
          style={GRADIENT_BRAND}
        >
          {hasActiveTasks || isPublishing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {hasActiveTasks || isPublishing ? "Publishing…" : "Approve & Publish"}
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
