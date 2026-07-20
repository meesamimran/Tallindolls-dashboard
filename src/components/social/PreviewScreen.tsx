"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { type Caption, FeedPreview, StoryPreview, type SocialPlatform } from "./SocialPreviews";
import SongSearch, { type SongResult } from "./SongSearch";
import {
  Send, Loader2, Calendar, ArrowLeft, Music2, Play, Pause,
} from "lucide-react";

const CARD =
  "bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-[var(--shadow-xs)]";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

interface PreviewScreenProps {
  imageSrc: string | null;
  isVideo: boolean;
  caption: Caption;
  selectedPreviewLabel: string;
  targetPlatforms: string[];
  platform: SocialPlatform;
  surface: "feed" | "story";
  hasActiveTasks: boolean;
  isPublishing?: boolean;
  onPublish: (song: SongResult | null) => void;
  onSchedule: (song: SongResult | null, scheduledDate: string) => void;
  onSaveDraft: () => void;
  onBack: () => void;
}

export default function PreviewScreen({
  imageSrc,
  isVideo,
  caption,
  selectedPreviewLabel,
  targetPlatforms,
  platform,
  surface,
  hasActiveTasks,
  isPublishing,
  onPublish,
  onSchedule,
  onSaveDraft,
  onBack,
}: PreviewScreenProps) {
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioConsent, setAudioConsent] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
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

  const audioName = selectedSong ? `${selectedSong.artistName} - ${selectedSong.songTitle}` : undefined;

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
        <span className="text-[12px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider">
          Final Review &amp; Publish
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* LEFT: Caption + Audio */}
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
                    I understand this will be posted as a <strong>Reel</strong> with the audio track
                    &quot;{selectedSong.artistName} - {selectedSong.songTitle}&quot;.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Publishing info */}
          <div>
            <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1.5">
              Publishing to
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 text-[12px] font-medium rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)]">
                {selectedPreviewLabel}
              </span>
              {targetPlatforms.map((p) => (
                <span
                  key={p}
                  className="px-2.5 py-1 text-[12px] font-medium rounded-[2px] bg-[var(--neutral-secondary-medium)] text-[var(--body)] capitalize border border-[var(--border-default)]"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Live Preview (same component as Screen 1) */}
        <div>
          <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider mb-1.5">
            Live Preview
          </p>
          <div className="bg-[var(--neutral-secondary-medium)] rounded-[2px] p-4 flex justify-center">
            {surface === "story" ? (
              <StoryPreview
                platform={platform}
                caption={caption}
                imageSrc={imageSrc}
                isVideo={isVideo}
                videoSrc={null}
                audioName={audioName}
                onAudioPlay={selectedSong ? handlePlayPause : undefined}
                isAudioPlaying={playing}
              />
            ) : (
              <FeedPreview
                platform={platform}
                device="desktop"
                caption={caption}
                imageSrc={imageSrc}
                isVideo={isVideo}
                videoSrc={null}
                audioName={audioName}
                onAudioPlay={selectedSong ? handlePlayPause : undefined}
                isAudioPlaying={playing}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-default)]">
        <button
          onClick={onSaveDraft}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
        >
          Save Draft
        </button>
        <button
          onClick={() => {
            const now = new Date();
            now.setHours(now.getHours() + 1);
            setScheduleDate(now.toISOString().slice(0, 10));
            setScheduleTime(now.toISOString().slice(11, 16));
            setShowSchedule(true);
          }}
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

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSchedule(false)}>
          <div className="bg-[var(--neutral-primary-soft)] border border-[var(--border-default)] rounded-[2px] shadow-2xl w-full max-w-[380px] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[16px] font-semibold text-[var(--heading)]">Schedule Post</h3>
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
              <button onClick={() => setShowSchedule(false)}
                className="px-4 py-2 text-[13px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--body)] hover:bg-[var(--neutral-secondary-medium)] transition-colors">Cancel</button>
              <button onClick={() => { setShowSchedule(false); onSchedule(selectedSong, `${scheduleDate}T${scheduleTime}:00`); }}
                disabled={!scheduleDate || !scheduleTime}
                className="px-4 py-2 text-[13px] font-semibold text-white rounded-[2px] disabled:opacity-50" style={GRADIENT_BRAND}>
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
