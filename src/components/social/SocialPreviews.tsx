"use client";

// ============================================================
// Social Previews — Meta Business Suite–grade live previews.
//   Facebook Feed / Instagram Feed / Facebook Reel / Instagram Reel
//   Carousel wrapper • Skeleton loader • Device shells
// ============================================================

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  ThumbsUp,
  Share2,
  MoreHorizontal,
  Globe,
  ImageIcon,
  Smile,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Music2,
  Home,
  Search,
  PlusSquare,
  Film,
  User,
  Check,
  Camera,
  Compass,
  Lock,
  RotateCw,
  Sparkles,
} from "lucide-react";

// ── Public types (backward-compatible exports) ──

export interface Caption {
  headline: string;
  primaryText: string;
  hashtags: string;
  cta: string;
}

export type SocialPlatform = "facebook" | "instagram";
export type PreviewDevice = "desktop" | "mobile";

// ── Brand constants ──

const BRAND_NAME = "TallinnDoll";
const BRAND_HANDLE = "tallindoll";

const GRADIENT_BRAND: React.CSSProperties = {
  background: "linear-gradient(135deg, #C8399C 0%, #7C3AED 100%)",
};

const IG_STORY_GRADIENT =
  "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";

// ── Helpers ──

function Avatar({
  size = 40,
  ring = false,
  platform = "instagram",
}: {
  size?: number;
  ring?: boolean;
  platform?: SocialPlatform;
}) {
  const el = (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none shadow-xs"
      style={{
        ...GRADIENT_BRAND,
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        letterSpacing: "-0.5px",
      }}
    >
      TD
    </div>
  );

  if (!ring) return el;

  const ringStyle = platform === "instagram" ? { background: IG_STORY_GRADIENT } : GRADIENT_BRAND;

  return (
    <div className="rounded-full p-[2px] transition-transform hover:scale-105" style={ringStyle}>
      <div className="rounded-full bg-white dark:bg-black p-[2px]">{el}</div>
    </div>
  );
}

function VerifiedBadge({ platform = "instagram" }: { platform?: SocialPlatform }) {
  if (platform === "facebook") {
    return (
      <span
        title="Verified Page"
        className="inline-flex items-center justify-center size-[14px] rounded-full bg-[#1877F2] text-white shadow-xs"
      >
        <Check className="size-[9px] stroke-[3]" />
      </span>
    );
  }
  return (
    <span
      title="Verified Account"
      className="inline-flex items-center justify-center size-[14px] rounded-full bg-[#0095F6] text-white shadow-xs"
    >
      <Check className="size-[9px] stroke-[3]" />
    </span>
  );
}

function formatCaption(caption: Caption): string {
  return [caption.headline, caption.primaryText, caption.hashtags, caption.cta]
    .filter(Boolean)
    .join("\n\n");
}

function renderFormattedCaption(text: string) {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return parts.map((part, i) => {
    if (part.startsWith("#") && part.length > 1) {
      return (
        <span
          key={i}
          className="text-[#00376B] dark:text-[#3897f0] hover:underline cursor-pointer font-medium"
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("@") && part.length > 1) {
      return (
        <span key={i} className="text-[#00376B] dark:text-[#3897f0] hover:underline cursor-pointer font-medium">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ============================================================
// SKELETON LOADER
// ============================================================

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("animate-shimmer rounded-[4px]", className)}
      style={{
        background:
          "linear-gradient(90deg, rgba(240,240,240,0.8) 25%, rgba(220,220,220,0.9) 50%, rgba(240,240,240,0.8) 75%)",
        backgroundSize: "200% 100%",
        ...style,
      }}
    />
  );
}

export function PreviewSkeleton({
  platform,
  device,
}: {
  platform: SocialPlatform;
  device: PreviewDevice;
}) {
  const isMobile = device === "mobile";
  const maxW = isMobile ? 380 : 540;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: maxW }}>
      {!isMobile && <BrowserChrome platform={platform} />}
      <div
        className={cn(
          "bg-white rounded-b-[8px] overflow-hidden",
          !isMobile && "border border-[#dbdbdb] shadow-sm",
          isMobile && "rounded-[38px] overflow-hidden shadow-xl border-[6px] border-[#1c1c1e]"
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <Skeleton className="w-full" style={{ aspectRatio: isMobile ? "9/16" : "1/1" }} />
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full ml-auto" />
        </div>
        <div className="px-4 pb-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ULTRA-REALISTIC DEVICE SHELLS
// ============================================================

function BrowserChrome({ platform }: { platform: SocialPlatform }) {
  const url = platform === "facebook" ? "facebook.com/tallindoll" : "instagram.com/tallindoll";

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-t-[10px] bg-[#f1f3f5] dark:bg-[#1e1e24] border border-b-0 border-[#d0d3d9] dark:border-white/10 select-none shadow-xs">
      {/* Traffic light window controls */}
      <div className="flex items-center gap-2">
        <span className="size-3 rounded-full bg-[#ff5f57] border border-[#e0443e] shadow-inner" />
        <span className="size-3 rounded-full bg-[#febc2e] border border-[#d8a123] shadow-inner" />
        <span className="size-3 rounded-full bg-[#28c840] border border-[#1aab29] shadow-inner" />
      </div>

      {/* Nav chevrons */}
      <div className="hidden sm:flex items-center gap-1 text-[#65676b] dark:text-neutral-400">
        <ChevronLeft className="size-3.5 opacity-60" />
        <ChevronRight className="size-3.5 opacity-30" />
        <RotateCw className="size-3 opacity-60 ml-1" />
      </div>

      {/* URL Pill */}
      <div className="flex-1 max-w-[260px] mx-2 flex items-center justify-center gap-1.5 rounded-full bg-white dark:bg-[#121216] border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] font-sans text-[#333] dark:text-neutral-200 shadow-2xs">
        <Lock className="size-2.5 text-[#008a00] shrink-0" />
        <span className="truncate font-normal tracking-tight">{url}</span>
      </div>

      {/* Platform badge */}
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[#65676b] dark:text-neutral-400 px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
        {platform}
      </div>
    </div>
  );
}

function PhoneFrame({
  children,
  platform,
}: {
  children: React.ReactNode;
  platform?: SocialPlatform;
}) {
  return (
    <div className="mx-auto select-none" style={{ width: 375, maxWidth: "100%" }}>
      {/* Outer titanium body */}
      <div className="relative rounded-[48px] p-[9px] bg-gradient-to-b from-[#3a3b40] via-[#24252a] to-[#1a1a1e] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.12)]">
        {/* Screen container */}
        <div className="relative rounded-[39px] overflow-hidden bg-black text-white">
          {/* Dynamic Island */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between w-[112px] h-[28px] bg-black rounded-full px-2.5 shadow-md ring-1 ring-white/10 pointer-events-none">
            {/* Front camera lens */}
            <div className="size-3 rounded-full bg-[#111] ring-1 ring-white/20 flex items-center justify-center">
              <span className="size-1 rounded-full bg-[#0d2a45]" />
            </div>
            {/* Sensor */}
            <div className="size-2.5 rounded-full bg-[#0c0c0e]" />
          </div>

          {/* iOS Status Bar */}
          <div className="relative z-30 flex items-center justify-between px-7 pt-3 pb-1 text-[12px] font-semibold text-white tracking-tight pointer-events-none">
            <span>9:41</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              {/* Signal bars */}
              <div className="flex items-end gap-[1.5px] h-2.5">
                <span className="w-[2.5px] h-1 bg-white rounded-xs" />
                <span className="w-[2.5px] h-1.5 bg-white rounded-xs" />
                <span className="w-[2.5px] h-2 bg-white rounded-xs" />
                <span className="w-[2.5px] h-2.5 bg-white rounded-xs" />
              </div>
              <span className="text-[10px] font-bold">5G</span>
              {/* Battery */}
              <div className="relative w-5 h-2.5 rounded-[3px] border border-white p-[1px] flex items-center">
                <div className="h-full w-3.5 bg-white rounded-[1.5px]" />
                <div className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-[1.5px] h-1 bg-white rounded-r-xs" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative bg-white text-[#262626] min-h-[580px]">{children}</div>

          {/* Home indicator bar */}
          <div className="absolute bottom-1.5 inset-x-0 z-40 flex justify-center pointer-events-none">
            <div className="w-32 h-[4px] rounded-full bg-neutral-400/80 dark:bg-white/70 shadow-xs" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-center text-[11px] text-[var(--body-subtle)] mt-3">
        <span className="size-1.5 rounded-full bg-[var(--brand)]" />
        <span className="uppercase tracking-wider font-semibold">Mobile Device Preview (iOS)</span>
      </div>
    </div>
  );
}

function DesktopShell({
  platform,
  children,
}: {
  platform: SocialPlatform;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[540px]">
      <BrowserChrome platform={platform} />
      <div
        className="rounded-b-[10px] overflow-hidden border border-[#d0d3d9] dark:border-white/10 shadow-lg"
        style={{
          backgroundColor: platform === "facebook" ? "#f0f2f5" : "#fafafa",
        }}
      >
        {children}
      </div>
      <p className="text-center text-[11px] text-[var(--body-subtle)] mt-3 uppercase tracking-wider font-semibold">
        Desktop Browser View
      </p>
    </div>
  );
}

function Shell({
  platform,
  device,
  children,
}: {
  platform: SocialPlatform;
  device: PreviewDevice;
  children: React.ReactNode;
}) {
  if (device === "mobile") {
    return <PhoneFrame platform={platform}>{children}</PhoneFrame>;
  }
  return <DesktopShell platform={platform}>{children}</DesktopShell>;
}

// ============================================================
// CAROUSEL WRAPPER
// ============================================================

function CarouselWrapper({
  total,
  activeIdx,
  onPrev,
  onNext,
  children,
  className,
}: {
  total: number;
  activeIdx: number;
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [swiping, setSwiping] = useState(false);
  const [swipeDir, setSwipeDir] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 35) {
      if (dx > 0 && activeIdx > 0) {
        setSwipeDir("right");
        setSwiping(true);
        setTimeout(() => {
          onPrev();
          setSwiping(false);
          setSwipeDir(null);
        }, 180);
      } else if (dx < 0 && activeIdx < total - 1) {
        setSwipeDir("left");
        setSwiping(true);
        setTimeout(() => {
          onNext();
          setSwiping(false);
          setSwipeDir(null);
        }, 180);
      }
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden group select-none", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide counter badge */}
      {total > 1 && (
        <div className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold tracking-wider shadow-sm">
          {activeIdx + 1}/{total}
        </div>
      )}

      {/* Slide Content */}
      <div
        className={cn(
          "transition-transform duration-300 ease-out",
          swiping && swipeDir === "left" && "-translate-x-[6%] opacity-80",
          swiping && swipeDir === "right" && "translate-x-[6%] opacity-80"
        )}
      >
        {children}
      </div>

      {/* Prev arrow */}
      {total > 1 && activeIdx > 0 && (
        <button
          onClick={onPrev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 dark:bg-black/80 shadow-md flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all z-20"
        >
          <ChevronLeft className="size-4 text-[#262626] dark:text-white" />
        </button>
      )}

      {/* Next arrow */}
      {total > 1 && activeIdx < total - 1 && (
        <button
          onClick={onNext}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 dark:bg-black/80 shadow-md flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all z-20"
        >
          <ChevronRight className="size-4 text-[#262626] dark:text-white" />
        </button>
      )}

      {/* Pagination dots */}
      {total > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-1.5 z-20 pointer-events-none">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-200",
                i === activeIdx
                  ? "w-2.5 h-1.5 bg-[#0095f6] shadow-sm"
                  : "size-1.5 bg-white/70 shadow-xs"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FACEBOOK FEED POST (Image, Video & Carousel)
// ============================================================

function FacebookFeedPost({
  caption,
  imageSrc,
  device,
  sponsored = false,
  isVideo,
  videoSrc,
  carouselSlides,
  carouselIdx,
  onCarouselPrev,
  onCarouselNext,
  audioName,
  onAudioPlay,
  isAudioPlaying,
}: {
  caption: Caption;
  imageSrc: string | null;
  device: PreviewDevice;
  sponsored?: boolean;
  isVideo?: boolean;
  videoSrc?: string | null;
  carouselSlides?: { formatted: string | null; isVideo?: boolean; videoBlobUrl?: string | null }[];
  carouselIdx?: number;
  onCarouselPrev?: () => void;
  onCarouselNext?: () => void;
  audioName?: string;
  onAudioPlay?: () => void;
  isAudioPlaying?: boolean;
}) {
  const body = formatCaption(caption);
  const totalSlides = carouselSlides?.length ?? 1;
  const active = carouselSlides && carouselIdx !== undefined ? carouselSlides[carouselIdx] : null;
  const displaySrc = active?.formatted ?? imageSrc;
  const displayIsVideo = active?.isVideo ?? isVideo;
  const displayVideoSrc = active?.videoBlobUrl ?? videoSrc;

  const [videoMuted, setVideoMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [activeReaction, setActiveReaction] = useState<"like" | "love" | "care" | "haha">("like");
  const [expandedCaption, setExpandedCaption] = useState(false);

  const reactions = [
    { type: "like", emoji: "👍", label: "Like", color: "text-[#1877F2]" },
    { type: "love", emoji: "❤️", label: "Love", color: "text-[#FA3E3E]" },
    { type: "care", emoji: "🥰", label: "Care", color: "text-[#F7B125]" },
    { type: "haha", emoji: "😆", label: "Haha", color: "text-[#F7B125]" },
  ];

  return (
    <Shell platform="facebook" device={device}>
      <div className="bg-white text-[#050505] font-sans antialiased text-left select-none">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
          <Avatar size={40} platform="facebook" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[15px] font-bold text-[#050505] leading-tight hover:underline cursor-pointer">
                {BRAND_NAME}
              </span>
              <VerifiedBadge platform="facebook" />
            </div>
            <div className="flex items-center gap-1 text-[12px] text-[#65676b] font-normal leading-tight mt-0.5">
              {sponsored ? <span>Sponsored</span> : <span>Just now</span>}
              <span>·</span>
              <Globe className="size-3 text-[#65676b]" aria-label="Shared with Public" />
            </div>

            {audioName && (
              <div className="flex items-center gap-2 mt-1 px-2 py-0.5 rounded-full bg-[#f0f2f5] w-fit">
                <Music2 className="size-3 text-[#1877f2] shrink-0" />
                <span className="text-[11px] text-[#050505] font-medium truncate max-w-[200px]">
                  {audioName}
                </span>
                {onAudioPlay && (
                  <button
                    onClick={onAudioPlay}
                    className="size-4 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:opacity-90"
                  >
                    {isAudioPlaying ? <Pause className="size-2 fill-white" /> : <Play className="size-2 fill-white ml-[1px]" />}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center text-[#65676b]">
            <button className="p-1.5 rounded-full hover:bg-[#f0f2f5] transition-colors">
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </div>

        {/* ── Caption text ── */}
        {body && (
          <div className="px-4 pb-3">
            <p className="text-[15px] leading-snug text-[#050505] whitespace-pre-line break-words">
              {body.length > 240 && !expandedCaption ? (
                <>
                  {renderFormattedCaption(body.slice(0, 240))}…{" "}
                  <button
                    onClick={() => setExpandedCaption(true)}
                    className="font-semibold text-[#65676b] hover:underline"
                  >
                    See more
                  </button>
                </>
              ) : (
                renderFormattedCaption(body)
              )}
            </p>
          </div>
        )}

        {/* ── Media Surface ── */}
        {totalSlides > 1 && carouselSlides ? (
          <CarouselWrapper
            total={totalSlides}
            activeIdx={carouselIdx ?? 0}
            onPrev={onCarouselPrev ?? (() => {})}
            onNext={onCarouselNext ?? (() => {})}
          >
            <div className="w-full bg-[#f0f2f5] flex items-center justify-center overflow-hidden" style={{ aspectRatio: "1/1" }}>
              {displayIsVideo && displayVideoSrc ? (
                <video
                  src={displayVideoSrc}
                  poster={displaySrc ?? undefined}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted={videoMuted}
                  loop
                  playsInline
                />
              ) : displaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displaySrc} alt="Post media" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#65676b]">
                  <ImageIcon className="size-10 stroke-[1.5]" />
                  <span className="text-[13px] font-medium">Slide { (carouselIdx ?? 0) + 1 }</span>
                </div>
              )}
            </div>
          </CarouselWrapper>
        ) : displayIsVideo && displayVideoSrc ? (
          <div className="relative w-full bg-black flex items-center justify-center overflow-hidden" style={{ aspectRatio: "1/1" }}>
            <video
              src={displayVideoSrc}
              poster={displaySrc ?? undefined}
              className="w-full h-full object-contain"
              autoPlay
              muted={videoMuted}
              loop
              playsInline
            />
            <button
              onClick={() => setVideoMuted(!videoMuted)}
              aria-label="Toggle mute"
              className="absolute bottom-3 right-3 size-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-transform active:scale-90"
            >
              {videoMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
          </div>
        ) : (
          <div className="w-full bg-[#e4e6eb] flex items-center justify-center overflow-hidden" style={{ aspectRatio: "1/1" }}>
            {displaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displaySrc} alt="Post media" className="w-full h-full object-cover" draggable={false} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#65676b] py-16">
                <div className="size-12 rounded-full bg-black/5 flex items-center justify-center">
                  <ImageIcon className="size-6 text-[#65676b]" />
                </div>
                <span className="text-[13px] font-medium">Upload an image to preview</span>
              </div>
            )}
          </div>
        )}

        {/* ── Reaction Summary Bar ── */}
        <div className="flex items-center justify-between px-4 py-2 text-[13px] text-[#65676b] border-b border-[#ced0d4]/60 mx-1">
          <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
            <span className="flex -space-x-1.5 items-center">
              <span className="size-[20px] rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[10px] ring-2 ring-white shadow-xs">
                👍
              </span>
              <span className="size-[20px] rounded-full bg-[#FA3E3E] flex items-center justify-center text-white text-[10px] ring-2 ring-white shadow-xs">
                ❤️
              </span>
              <span className="size-[20px] rounded-full bg-[#F7B125] flex items-center justify-center text-white text-[10px] ring-2 ring-white shadow-xs">
                🥰
              </span>
            </span>
            <span className="font-medium ml-1 text-[#65676b]">{liked ? "1,249" : "1,248"}</span>
          </div>

          <div className="flex items-center gap-2.5 text-[13px] font-medium">
            <span className="hover:underline cursor-pointer">84 comments</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">18 shares</span>
          </div>
        </div>

        {/* ── Action Toolbar with Reaction Drawer ── */}
        <div className="relative px-2 py-1 flex items-center justify-around border-b border-[#ced0d4]/60 mx-1">
          {/* Reaction popover on hover/focus */}
          {showReactions && (
            <div
              onMouseEnter={() => setShowReactions(true)}
              onMouseLeave={() => setShowReactions(false)}
              className="absolute -top-11 left-4 z-30 flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-xl border border-black/10 animate-fade-in"
            >
              {reactions.map((r) => (
                <button
                  key={r.type}
                  onClick={() => {
                    setActiveReaction(r.type as any);
                    setLiked(true);
                    setShowReactions(false);
                  }}
                  className="size-7 rounded-full flex items-center justify-center text-lg hover:scale-130 transition-transform active:scale-95"
                  title={r.label}
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          )}

          {/* Like Button */}
          <button
            onClick={() => setLiked(!liked)}
            onMouseEnter={() => setShowReactions(true)}
            className={cn(
              "flex items-center justify-center gap-2 flex-1 py-2 text-[14px] font-semibold rounded-[4px] hover:bg-[#f0f2f5] transition-colors",
              liked ? "text-[#1877F2]" : "text-[#65676b]"
            )}
          >
            <ThumbsUp className={cn("size-4", liked && "fill-[#1877F2]")} />
            <span>{liked ? (activeReaction === "love" ? "Love" : "Liked") : "Like"}</span>
          </button>

          {/* Comment Button */}
          <button className="flex items-center justify-center gap-2 flex-1 py-2 text-[14px] font-semibold text-[#65676b] rounded-[4px] hover:bg-[#f0f2f5] transition-colors">
            <MessageCircle className="size-4" />
            <span>Comment</span>
          </button>

          {/* Share Button */}
          <button className="flex items-center justify-center gap-2 flex-1 py-2 text-[14px] font-semibold text-[#65676b] rounded-[4px] hover:bg-[#f0f2f5] transition-colors">
            <Share2 className="size-4" />
            <span>Share</span>
          </button>
        </div>

        {/* ── Comment Input Box ── */}
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Avatar size={32} platform="facebook" />
          <div className="flex-1 flex items-center gap-2 rounded-full px-3 py-1.5 bg-[#f0f2f5] border border-transparent focus-within:border-[#1877f2] transition-colors">
            <span className="text-[13px] text-[#65676b] flex-1">Write a comment…</span>
            <div className="flex items-center gap-1 text-[#65676b]">
              <Smile className="size-4 hover:text-[#050505] cursor-pointer" />
              <Camera className="size-4 hover:text-[#050505] cursor-pointer" />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// INSTAGRAM FEED POST
// ============================================================

function InstagramFeedPost({
  caption,
  imageSrc,
  device,
  sponsored = false,
  isVideo,
  videoSrc,
  carouselSlides,
  carouselIdx,
  onCarouselPrev,
  onCarouselNext,
  audioName,
  onAudioPlay,
  isAudioPlaying,
}: {
  caption: Caption;
  imageSrc: string | null;
  device: PreviewDevice;
  sponsored?: boolean;
  isVideo?: boolean;
  videoSrc?: string | null;
  carouselSlides?: { formatted: string | null; isVideo?: boolean; videoBlobUrl?: string | null }[];
  carouselIdx?: number;
  onCarouselPrev?: () => void;
  onCarouselNext?: () => void;
  audioName?: string;
  onAudioPlay?: () => void;
  isAudioPlaying?: boolean;
}) {
  const captionText = [caption.primaryText, caption.hashtags].filter(Boolean).join(" ");
  const totalSlides = carouselSlides?.length ?? 1;
  const active = carouselSlides && carouselIdx !== undefined ? carouselSlides[carouselIdx] : null;
  const displaySrc = active?.formatted ?? imageSrc;
  const displayIsVideo = active?.isVideo ?? isVideo;
  const displayVideoSrc = active?.videoBlobUrl ?? videoSrc;

  const [videoMuted, setVideoMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);

  // Double tap to like on photo
  const handlePhotoDoubleTap = () => {
    setLiked(true);
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 800);
  };

  return (
    <Shell platform="instagram" device={device}>
      <div className="bg-white text-[#262626] font-sans antialiased text-left select-none">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#efefef]">
          <div className="flex items-center gap-3">
            <Avatar size={34} ring platform="instagram" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[14px] font-bold text-[#262626] leading-none hover:underline cursor-pointer">
                  {BRAND_HANDLE}
                </span>
                <VerifiedBadge platform="instagram" />
              </div>
              {sponsored ? (
                <span className="text-[11px] text-[#8e8e8e] leading-tight">Sponsored</span>
              ) : (
                <span className="text-[11px] text-[#8e8e8e] leading-tight">Tallinn, Estonia</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {audioName && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#fafafa] border border-[#efefef] text-[11px]">
                <Music2 className="size-3 text-[#262626]" />
                <span className="truncate max-w-[120px] font-medium">{audioName}</span>
                {onAudioPlay && (
                  <button onClick={onAudioPlay} className="size-4 rounded-full bg-black/10 flex items-center justify-center">
                    {isAudioPlaying ? <Pause className="size-2 fill-black" /> : <Play className="size-2 fill-black ml-[1px]" />}
                  </button>
                )}
              </div>
            )}
            <button className="p-1 text-[#262626] hover:opacity-70 transition-opacity">
              <MoreHorizontal className="size-5" />
            </button>
          </div>
        </div>

        {/* ── Media Surface ── */}
        <div className="relative overflow-hidden" onDoubleClick={handlePhotoDoubleTap}>
          {/* Double-tap animated heart */}
          {showHeartPop && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none animate-bounce">
              <Heart className="size-24 text-white fill-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
            </div>
          )}

          {totalSlides > 1 && carouselSlides ? (
            <CarouselWrapper
              total={totalSlides}
              activeIdx={carouselIdx ?? 0}
              onPrev={onCarouselPrev ?? (() => {})}
              onNext={onCarouselNext ?? (() => {})}
            >
              <div className="w-full bg-[#fafafa] flex items-center justify-center overflow-hidden" style={{ aspectRatio: "1/1" }}>
                {displayIsVideo && displayVideoSrc ? (
                  <video
                    src={displayVideoSrc}
                    poster={displaySrc ?? undefined}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted={videoMuted}
                    loop
                    playsInline
                  />
                ) : displaySrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displaySrc} alt="Instagram post" className="w-full h-full object-cover" draggable={false} />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#8e8e8e]">
                    <ImageIcon className="size-10 stroke-[1.5]" />
                    <span className="text-[12px]">Slide { (carouselIdx ?? 0) + 1 }</span>
                  </div>
                )}
              </div>
            </CarouselWrapper>
          ) : displayIsVideo && displayVideoSrc ? (
            <div className="relative w-full bg-black flex items-center justify-center overflow-hidden" style={{ aspectRatio: "1/1" }}>
              <video
                src={displayVideoSrc}
                poster={displaySrc ?? undefined}
                className="w-full h-full object-contain"
                autoPlay
                muted={videoMuted}
                loop
                playsInline
              />
              <button
                onClick={() => setVideoMuted(!videoMuted)}
                className="absolute bottom-3 right-3 size-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-transform active:scale-90"
              >
                {videoMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            </div>
          ) : (
            <div className="w-full bg-[#fafafa] flex items-center justify-center overflow-hidden" style={{ aspectRatio: "1/1" }}>
              {displaySrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={displaySrc} alt="Instagram post" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#8e8e8e] py-16">
                  <div className="size-12 rounded-full bg-black/5 flex items-center justify-center">
                    <ImageIcon className="size-6 text-[#8e8e8e]" />
                  </div>
                  <span className="text-[12px] font-medium">Upload photo to preview</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action Toolbar ── */}
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setLiked(!liked);
                if (!liked) {
                  setShowHeartPop(true);
                  setTimeout(() => setShowHeartPop(false), 800);
                }
              }}
              aria-label="Like post"
              className="transition-transform active:scale-125"
            >
              <Heart
                className={cn(
                  "size-6 transition-colors",
                  liked ? "fill-[#ed4956] text-[#ed4956]" : "text-[#262626] hover:opacity-60"
                )}
              />
            </button>
            <button aria-label="Comment" className="transition-transform active:scale-110">
              <MessageCircle className="size-6 text-[#262626] hover:opacity-60" />
            </button>
            <button aria-label="Share" className="transition-transform active:scale-110">
              <Send className="size-6 text-[#262626] hover:opacity-60" />
            </button>
          </div>

          <button
            onClick={() => setSaved(!saved)}
            aria-label="Save post"
            className="transition-transform active:scale-125"
          >
            <Bookmark
              className={cn(
                "size-6 transition-colors",
                saved ? "fill-[#262626] text-[#262626]" : "text-[#262626] hover:opacity-60"
              )}
            />
          </button>
        </div>

        {/* ── Likes counter with stacked micro-avatars ── */}
        <div className="flex items-center gap-2 px-3.5 pt-1.5">
          <div className="flex -space-x-1.5 overflow-hidden">
            <span className="inline-block size-4 rounded-full bg-purple-500 ring-1 ring-white" />
            <span className="inline-block size-4 rounded-full bg-pink-500 ring-1 ring-white" />
            <span className="inline-block size-4 rounded-full bg-amber-500 ring-1 ring-white" />
          </div>
          <p className="text-[13px] text-[#262626]">
            Liked by <span className="font-semibold">nordic_fashion</span> and{" "}
            <span className="font-semibold">{liked ? "1,249 others" : "1,248 others"}</span>
          </p>
        </div>

        {/* ── Caption text ── */}
        {captionText && (
          <div className="px-3.5 pt-1.5">
            <p className="text-[14px] leading-snug text-[#262626] break-words">
              <span className="font-bold mr-1.5 hover:underline cursor-pointer">{BRAND_HANDLE}</span>
              {captionText.length > 120 && !expandedCaption ? (
                <>
                  {renderFormattedCaption(captionText.slice(0, 120))}…{" "}
                  <button
                    onClick={() => setExpandedCaption(true)}
                    className="text-[#8e8e8e] font-normal hover:underline"
                  >
                    more
                  </button>
                </>
              ) : (
                renderFormattedCaption(captionText)
              )}
            </p>
          </div>
        )}

        {/* ── Comments teaser & Timestamp ── */}
        <div className="px-3.5 pt-1 space-y-1">
          <p className="text-[13px] text-[#8e8e8e] cursor-pointer hover:underline">View all 84 comments</p>
          <p className="text-[10px] uppercase text-[#8e8e8e] tracking-wider">2 HOURS AGO</p>
        </div>

        {/* ── Comment input field ── */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 mt-1 border-t border-[#efefef]">
          <Avatar size={24} platform="instagram" />
          <span className="text-[13px] text-[#8e8e8e] flex-1">Add a comment…</span>
          <button className="text-[13px] font-semibold text-[#0095f6] opacity-60 hover:opacity-100">
            Post
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ============================================================
// FACEBOOK STORY (IMAGE) PREVIEW
// ============================================================

function FacebookStoryPost({
  caption,
  imageSrc,
}: {
  caption: Caption;
  imageSrc: string | null;
}) {
  const body = formatCaption(caption);

  return (
    <PhoneFrame platform="facebook">
      <div className="relative w-full bg-black text-white font-sans overflow-hidden select-none" style={{ aspectRatio: "9/16" }}>
        {/* Media */}
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="Facebook Story" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1c1c1e] to-[#2a2a2e] text-white/60">
            <div className="flex flex-col items-center gap-3">
              <ImageIcon className="size-12 stroke-[1.5]" />
              <span className="text-[13px] font-medium">Upload photo for Story</span>
            </div>
          </div>
        )}

        {/* Top Story Segments */}
        <div className="absolute top-3 inset-x-3 flex gap-1 z-20">
          <div className="h-[2.5px] flex-1 rounded-full bg-white" />
          <div className="h-[2.5px] flex-1 rounded-full bg-white/40" />
          <div className="h-[2.5px] flex-1 rounded-full bg-white/40" />
        </div>

        {/* Top Profile Header */}
        <div className="absolute top-7 inset-x-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2.5">
            <Avatar size={34} ring platform="facebook" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[14px] font-bold drop-shadow">{BRAND_NAME}</span>
                <VerifiedBadge platform="facebook" />
              </div>
              <span className="text-[11px] text-white/80 drop-shadow">Just now</span>
            </div>
          </div>

          <button className="px-3 py-1 text-[11px] font-semibold text-black bg-white rounded-full shadow hover:bg-neutral-100 transition-colors">
            Follow
          </button>
        </div>

        {/* Caption Overlay */}
        {body && (
          <div className="absolute inset-x-4 bottom-20 z-20 bg-black/40 backdrop-blur-md rounded-[8px] p-3.5 border border-white/10 shadow-lg">
            <p className="text-[13px] text-white leading-snug whitespace-pre-line">{body}</p>
          </div>
        )}

        {/* Bottom Quick Reply Bar */}
        <div className="absolute inset-x-4 bottom-4 z-20 flex items-center gap-2">
          <div className="flex-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 px-3.5 py-2 text-[12px] text-white/80">
            Send message…
          </div>
          <button className="size-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60">
            👍
          </button>
          <button className="size-9 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/60">
            ❤️
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ============================================================
// FACEBOOK REEL PREVIEW
// ============================================================

function FacebookReelPost({
  caption,
  imageSrc,
  isVideo,
  videoSrc,
  audioName,
  onAudioPlay,
  isAudioPlaying,
}: {
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
  audioName?: string;
  onAudioPlay?: () => void;
  isAudioPlaying?: boolean;
}) {
  const [muted, setMuted] = useState(true);
  const body = formatCaption(caption);

  return (
    <PhoneFrame platform="facebook">
      <div className="relative w-full bg-black text-white font-sans overflow-hidden select-none" style={{ aspectRatio: "9/16" }}>
        {/* Media */}
        {isVideo && videoSrc ? (
          <video
            src={videoSrc}
            poster={imageSrc ?? undefined}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted={muted}
            loop
            playsInline
          />
        ) : imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="Facebook Reel" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e] text-white/60">
            <div className="flex flex-col items-center gap-3">
              <Film className="size-12 stroke-[1.5]" />
              <span className="text-[13px] font-medium">Upload video for Facebook Reel</span>
            </div>
          </div>
        )}

        {/* Scrims */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10" />

        {/* Header */}
        <div className="absolute top-8 inset-x-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <Avatar size={34} platform="facebook" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-[14px] font-bold text-white drop-shadow">{BRAND_NAME}</span>
                <VerifiedBadge platform="facebook" />
              </div>
              <span className="text-[11px] text-white/70">Reels</span>
            </div>
          </div>
          <button className="px-3.5 py-1 text-[12px] font-semibold text-black bg-white rounded-full shadow hover:bg-neutral-100 transition-colors">
            Follow
          </button>
        </div>

        {/* Right side actions */}
        <div className="absolute right-3.5 bottom-20 z-20 flex flex-col items-center gap-4">
          <button className="flex flex-col items-center gap-0.5">
            <div className="size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow">
              <ThumbsUp className="size-5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-white">2.4K</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <div className="size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow">
              <MessageCircle className="size-5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-white">128</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <div className="size-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow">
              <Share2 className="size-5 text-white" />
            </div>
            <span className="text-[11px] font-medium text-white">Share</span>
          </button>
        </div>

        {/* Caption & audio */}
        <div className="absolute left-4 bottom-8 right-16 z-20 space-y-2">
          {body && (
            <p className="text-[13px] text-white leading-snug drop-shadow line-clamp-3 whitespace-pre-line">
              {body}
            </p>
          )}
          {audioName && (
            <div className="flex items-center gap-2 text-[12px] text-white/90 pt-1">
              <Music2 className="size-3.5 text-[#1877f2]" />
              <span className="truncate font-medium">{audioName}</span>
              {onAudioPlay && (
                <button onClick={onAudioPlay} className="size-4.5 rounded-full bg-white/20 flex items-center justify-center">
                  {isAudioPlaying ? <Pause className="size-2 fill-white" /> : <Play className="size-2 fill-white ml-[1px]" />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </PhoneFrame>
  );
}

// ============================================================
// INSTAGRAM REEL PREVIEW
// ============================================================

function InstagramReelPost({
  caption,
  imageSrc,
  isVideo,
  videoSrc,
  audioName,
  onAudioPlay,
  isAudioPlaying,
}: {
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
  audioName?: string;
  onAudioPlay?: () => void;
  isAudioPlaying?: boolean;
}) {
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const body = formatCaption(caption);

  return (
    <PhoneFrame platform="instagram">
      <div className="relative w-full bg-black text-white font-sans overflow-hidden select-none" style={{ aspectRatio: "9/16" }}>
        {/* Media Background */}
        {isVideo && videoSrc ? (
          <video
            src={videoSrc}
            poster={imageSrc ?? undefined}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            muted={muted}
            loop
            playsInline
          />
        ) : imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt="Reel media" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e] text-white/60">
            <div className="flex flex-col items-center gap-3">
              <Film className="size-12 stroke-[1.5]" />
              <span className="text-[13px] font-medium">Upload video for Reel</span>
            </div>
          </div>
        )}

        {/* Top Gradient Scrim */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 via-black/30 to-transparent pointer-events-none z-10" />

        {/* Reel Top Header */}
        <div className="absolute top-8 inset-x-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <span className="text-[17px] font-bold drop-shadow-md">Reels</span>
            <ChevronRight className="size-4 opacity-80" />
          </div>

          <div className="flex items-center gap-2">
            {isVideo && (
              <button
                onClick={() => setMuted(!muted)}
                className="size-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:bg-black/60"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            )}
            <div className="size-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
              <Camera className="size-4" />
            </div>
          </div>
        </div>

        {/* Bottom Gradient Scrim */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

        {/* Right-Hand Action Column */}
        <div className="absolute right-3.5 bottom-24 z-20 flex flex-col items-center gap-4.5">
          {/* Like */}
          <button
            onClick={() => setLiked(!liked)}
            className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
          >
            <div className="size-10 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Heart
                className={cn(
                  "size-6 drop-shadow-md transition-colors",
                  liked ? "fill-[#ed4956] text-[#ed4956]" : "text-white"
                )}
              />
            </div>
            <span className="text-[11px] font-semibold text-white drop-shadow">
              {liked ? "14.3K" : "14.2K"}
            </span>
          </button>

          {/* Comments */}
          <button className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
            <div className="size-10 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center shadow-lg">
              <MessageCircle className="size-6 text-white drop-shadow-md" />
            </div>
            <span className="text-[11px] font-semibold text-white drop-shadow">342</span>
          </button>

          {/* Share */}
          <button className="flex flex-col items-center gap-1 group active:scale-90 transition-transform">
            <div className="size-10 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Send className="size-5.5 text-white drop-shadow-md" />
            </div>
            <span className="text-[11px] font-semibold text-white drop-shadow">1.1K</span>
          </button>

          {/* Bookmark */}
          <button
            onClick={() => setSaved(!saved)}
            className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
          >
            <div className="size-10 rounded-full bg-black/25 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Bookmark
                className={cn(
                  "size-5.5 drop-shadow-md transition-colors",
                  saved ? "fill-white text-white" : "text-white"
                )}
              />
            </div>
          </button>

          {/* Spinning Vinyl Album Art */}
          <div className="mt-1">
            <div className="relative size-8 rounded-full border-2 border-white/60 bg-neutral-900 flex items-center justify-center animate-[spin_4s_linear_infinite] shadow-lg">
              <span className="size-2.5 rounded-full bg-white ring-2 ring-black" />
            </div>
          </div>
        </div>

        {/* Bottom Left Creator & Caption Row */}
        <div className="absolute left-4 bottom-18 right-16 z-20 space-y-2">
          {/* Creator handle + Follow pill */}
          <div className="flex items-center gap-2">
            <Avatar size={32} ring platform="instagram" />
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-bold text-white drop-shadow-md">{BRAND_HANDLE}</span>
              <VerifiedBadge platform="instagram" />
            </div>
            <button className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-[11px] font-semibold text-white transition-colors">
              Follow
            </button>
          </div>

          {/* Expandable Caption */}
          {body && (
            <p className="text-[13px] text-white/95 leading-snug drop-shadow-md whitespace-pre-line break-words">
              {body.length > 90 && !expanded ? (
                <>
                  {body.slice(0, 90)}…{" "}
                  <button onClick={() => setExpanded(true)} className="font-semibold text-white/80 hover:underline">
                    more
                  </button>
                </>
              ) : (
                renderFormattedCaption(body)
              )}
            </p>
          )}

          {/* Audio Ticker with Sound Waves */}
          <div className="flex items-center gap-2 pt-1 text-[12px] text-white/90">
            <Music2 className="size-3.5 shrink-0 text-white animate-pulse" />
            <span className="truncate font-medium drop-shadow">
              {audioName ? audioName : `Original audio · ${BRAND_NAME}`}
            </span>
            {onAudioPlay && (
              <button
                onClick={onAudioPlay}
                className="size-5 rounded-full bg-white/20 backdrop-blur flex items-center justify-center shrink-0"
              >
                {isAudioPlaying ? <Pause className="size-2.5 fill-white" /> : <Play className="size-2.5 fill-white ml-[1px]" />}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Instagram App Navigation */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around py-3 px-4 bg-black/80 backdrop-blur-md z-20 border-t border-white/10">
          <Home className="size-5.5 text-white/70 hover:text-white" />
          <Search className="size-5.5 text-white/70 hover:text-white" />
          <PlusSquare className="size-5.5 text-white/70 hover:text-white" />
          <Film className="size-5.5 text-white fill-white" />
          <User className="size-5.5 text-white/70 hover:text-white" />
        </div>
      </div>
    </PhoneFrame>
  );
}

// ============================================================
// PUBLIC EXPORTS (backward-compatible API)
// ============================================================

export function FeedPreview({
  platform,
  device,
  caption,
  imageSrc,
  isVideo,
  videoSrc,
  carouselSlides,
  carouselIdx,
  onCarouselPrev,
  onCarouselNext,
  audioName,
  onAudioPlay,
  isAudioPlaying,
}: {
  platform: SocialPlatform;
  device: PreviewDevice;
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
  carouselSlides?: { formatted: string | null; isVideo?: boolean; videoBlobUrl?: string | null }[];
  carouselIdx?: number;
  onCarouselPrev?: () => void;
  onCarouselNext?: () => void;
  audioName?: string;
  onAudioPlay?: () => void;
  isAudioPlaying?: boolean;
}) {
  if (platform === "facebook") {
    return (
      <FacebookFeedPost
        caption={caption}
        imageSrc={imageSrc}
        device={device}
        isVideo={isVideo}
        videoSrc={videoSrc}
        carouselSlides={carouselSlides}
        carouselIdx={carouselIdx}
        onCarouselPrev={onCarouselPrev}
        onCarouselNext={onCarouselNext}
        audioName={audioName}
        onAudioPlay={onAudioPlay}
        isAudioPlaying={isAudioPlaying}
      />
    );
  }
  return (
    <InstagramFeedPost
      caption={caption}
      imageSrc={imageSrc}
      device={device}
      isVideo={isVideo}
      videoSrc={videoSrc}
      carouselSlides={carouselSlides}
      carouselIdx={carouselIdx}
      onCarouselPrev={onCarouselPrev}
      onCarouselNext={onCarouselNext}
      audioName={audioName}
      onAudioPlay={onAudioPlay}
      isAudioPlaying={isAudioPlaying}
    />
  );
}

export function StoryPreview({
  platform,
  caption,
  imageSrc,
  isVideo,
  videoSrc,
  audioName,
  onAudioPlay,
  isAudioPlaying,
}: {
  platform: SocialPlatform;
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
  audioName?: string;
  onAudioPlay?: () => void;
  isAudioPlaying?: boolean;
}) {
  if (platform === "facebook") {
    // Route: video → Reel, image → Story (different UIs)
    if (isVideo) {
      return (
        <FacebookReelPost
          caption={caption}
          imageSrc={imageSrc}
          isVideo={isVideo}
          videoSrc={videoSrc}
          audioName={audioName}
          onAudioPlay={onAudioPlay}
          isAudioPlaying={isAudioPlaying}
        />
      );
    }
    return (
      <FacebookStoryPost
        caption={caption}
        imageSrc={imageSrc}
      />
    );
  }
  return (
    <InstagramReelPost
      caption={caption}
      imageSrc={imageSrc}
      isVideo={isVideo}
      videoSrc={videoSrc}
      audioName={audioName}
      onAudioPlay={onAudioPlay}
      isAudioPlaying={isAudioPlaying}
    />
  );
}

export function AdPreview({
  platform,
  device,
  caption,
  imageSrc,
  isVideo,
  videoSrc,
}: {
  platform: SocialPlatform;
  device: PreviewDevice;
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
}) {
  if (platform === "facebook") {
    return (
      <FacebookFeedPost
        caption={caption}
        imageSrc={imageSrc}
        device={device}
        sponsored
        isVideo={isVideo}
        videoSrc={videoSrc}
      />
    );
  }
  return (
    <InstagramFeedPost
      caption={caption}
      imageSrc={imageSrc}
      device={device}
      sponsored
      isVideo={isVideo}
      videoSrc={videoSrc}
    />
  );
}
