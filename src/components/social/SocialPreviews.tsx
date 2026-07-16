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
  Music2,
  Home,
  Search,
  PlusSquare,
  Film,
  User,
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

// ── Helpers ──

function Avatar({ size = 40, ring = false }: { size?: number; ring?: boolean }) {
  const el = (
    <div
      className="rounded-full flex items-center justify-center text-white font-bold shrink-0 select-none"
      style={{ ...GRADIENT_BRAND, width: size, height: size, fontSize: size * 0.34 }}
    >
      TD
    </div>
  );
  if (!ring) return el;
  return (
    <div className="rounded-full p-[2px]" style={GRADIENT_BRAND}>
      <div className="rounded-full bg-white p-[2px]">{el}</div>
    </div>
  );
}

function formatCaption(caption: Caption): string {
  return [caption.primaryText, caption.hashtags].filter(Boolean).join("\n\n");
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
          "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
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
  const maxW = isMobile ? 360 : 520;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: maxW }}>
      {!isMobile && <BrowserChrome platform={platform} />}
      <div
        className={cn(
          "bg-white rounded-b-[8px] overflow-hidden",
          !isMobile && "border border-[#dbdbdb] shadow-sm",
          isMobile && "rounded-[28px] overflow-hidden shadow-lg"
        )}
      >
        {/* Header skeleton */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        {/* Media skeleton */}
        <Skeleton
          className="w-full"
          style={{ aspectRatio: isMobile ? "9/16" : "1/1" }}
        />
        {/* Actions skeleton */}
        <div className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full" />
          <Skeleton className="size-5 rounded-full ml-auto" />
        </div>
        {/* Caption skeleton */}
        <div className="px-4 pb-3 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DEVICE SHELLS
// ============================================================

function BrowserChrome({ platform }: { platform: SocialPlatform }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-[8px] bg-[#e9eaed] border border-b-0 border-[#d0d3d9]">
      <span className="size-2.5 rounded-full bg-[#ff5f57]" />
      <span className="size-2.5 rounded-full bg-[#febc2e]" />
      <span className="size-2.5 rounded-full bg-[#28c840]" />
      <div className="ml-2 flex-1 truncate rounded-[5px] bg-white px-2 py-0.5 text-[11px] text-[#65676b] font-sans">
        {platform === "facebook" ? "facebook.com" : "instagram.com"}
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
    <div className="mx-auto" style={{ width: 360 }}>
      <div className="rounded-[40px] border-[10px] border-[#1c1c1e] bg-[#1c1c1e] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="relative bg-white">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[130px] h-[22px] bg-[#1c1c1e] rounded-b-[16px] z-10" />
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-1.5 pb-0 text-[11px] font-semibold text-black bg-white">
            <span>9:41</span>
            <span>📶 🔋</span>
          </div>
          <div className="pt-2">{children}</div>
        </div>
      </div>
      <p className="text-center text-[11px] text-[var(--body-subtle)] mt-2 uppercase tracking-wider">
        Mobile
      </p>
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
        style={{
          backgroundColor: platform === "facebook" ? "#f0f2f5" : "#fafafa",
        }}
      >
        {children}
      </div>
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
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx > 0 && activeIdx > 0) {
        setSwipeDir("right");
        setSwiping(true);
        setTimeout(() => {
          onPrev();
          setSwiping(false);
          setSwipeDir(null);
        }, 200);
      } else if (dx < 0 && activeIdx < total - 1) {
        setSwipeDir("left");
        setSwiping(true);
        setTimeout(() => {
          onNext();
          setSwiping(false);
          setSwipeDir(null);
        }, 200);
      }
    }
  };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide content */}
      <div
        className={cn(
          "transition-transform duration-200 ease-out",
          swiping && swipeDir === "left" && "-translate-x-[10%] opacity-70",
          swiping && swipeDir === "right" && "translate-x-[10%] opacity-70"
        )}
      >
        {children}
      </div>

      {/* Prev button */}
      {total > 1 && activeIdx > 0 && (
        <button
          onClick={onPrev}
          className="absolute left-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
        >
          <ChevronLeft className="size-4 text-[#262626]" />
        </button>
      )}

      {/* Next button */}
      {total > 1 && activeIdx < total - 1 && (
        <button
          onClick={onNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 size-8 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors z-10"
        >
          <ChevronRight className="size-4 text-[#262626]" />
        </button>
      )}

      {/* Pagination dots */}
      {total > 1 && (
        <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-10 pointer-events-none">
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "size-1.5 rounded-full transition-all duration-200",
                i === activeIdx
                  ? "bg-[#0095f6] scale-125 shadow-sm"
                  : "bg-white/70"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// FACEBOOK FEED POST (Image & Video)
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
}) {
  const body = formatCaption(caption);
  const edgeToEdge = device === "mobile";
  const totalSlides = carouselSlides?.length ?? 1;
  const active = carouselSlides && carouselIdx !== undefined ? carouselSlides[carouselIdx] : null;
  const displaySrc = active?.formatted ?? imageSrc;
  const displayIsVideo = active?.isVideo ?? isVideo;
  const displayVideoSrc = active?.videoBlobUrl ?? videoSrc;
  const [videoMuted, setVideoMuted] = useState(true);

  return (
    <Shell platform="facebook" device={device}>
      <div
        className={cn(
          "bg-white text-[#050505] font-sans",
          edgeToEdge
            ? ""
            : "rounded-b-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.2)] border border-[#ced0d4]"
        )}
      >
        {/* ── Header ── */}
        <div
          className={cn(
            "flex items-center gap-2.5",
            edgeToEdge ? "px-3 pt-3 pb-2" : "px-4 pt-3 pb-2"
          )}
        >
          <Avatar size={edgeToEdge ? 36 : 40} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold leading-tight flex items-center gap-1 text-[#050505]">
              {BRAND_NAME}
              <span className="inline-flex items-center justify-center size-[14px] rounded-full bg-[#1877f2] text-white text-[8px]">
                ✓
              </span>
            </p>
            <div className="flex items-center gap-1 text-[12px] text-[#65676b]">
              {sponsored ? <span>Sponsored</span> : <span>Just now</span>}
              <span>·</span>
              <Globe className="size-3 text-[#65676b]" />
            </div>
          </div>
          <MoreHorizontal className="size-5 text-[#65676b] cursor-pointer" />
        </div>

        {/* ── Caption text ── */}
        {body && (
          <p
            className={cn(
              "text-[15px] leading-snug whitespace-pre-line text-[#050505]",
              edgeToEdge ? "px-3 pb-2" : "px-4 pb-2"
            )}
          >
            {body}
          </p>
        )}

        {/* ── Media ── */}
        {totalSlides > 1 && carouselSlides ? (
          /* Facebook carousel — horizontal slide with peek, arrows on edges, dots below */
          <div className="relative select-none">
            {/* Slide track */}
            <div className="relative overflow-hidden bg-[#e4e6eb]">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(-${(carouselIdx ?? 0) * 100}%)`,
                }}
              >
                {carouselSlides.map((slide, i) => {
                  const src = slide.formatted;
                  const vid = slide.isVideo && slide.videoBlobUrl;
                  return (
                    <div
                      key={i}
                      className="w-full shrink-0 flex items-center justify-center bg-[#e4e6eb]"
                      style={{ aspectRatio: "1/1" }}
                    >
                      {vid ? (
                        <video
                          src={slide.videoBlobUrl!}
                          poster={src ?? undefined}
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                      ) : src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={`Slide ${i + 1}`}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-[#8a8d91]">
                          <ImageIcon className="size-8" />
                          <span className="text-[12px]">Slide {i + 1}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Left arrow */}
              {(carouselIdx ?? 0) > 0 && (
                <button
                  onClick={onCarouselPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] flex items-center justify-center hover:bg-[#f0f2f5] transition-colors z-10"
                >
                  <ChevronLeft className="size-5 text-[#1c1e21]" />
                </button>
              )}

              {/* Right arrow */}
              {(carouselIdx ?? 0) < totalSlides - 1 && (
                <button
                  onClick={onCarouselNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] flex items-center justify-center hover:bg-[#f0f2f5] transition-colors z-10"
                >
                  <ChevronRight className="size-5 text-[#1c1e21]" />
                </button>
              )}
            </div>

            {/* Pagination dots — below the image, Facebook style */}
            <div className="flex items-center justify-center gap-1.5 py-2">
              {carouselSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (i < (carouselIdx ?? 0)) onCarouselPrev?.();
                    else if (i > (carouselIdx ?? 0)) onCarouselNext?.();
                  }}
                  className={cn(
                    "size-[7px] rounded-full transition-all duration-200",
                    i === (carouselIdx ?? 0)
                      ? "bg-[#1877f2] scale-100"
                      : "bg-[#bec3c9] hover:bg-[#8a8d91]"
                  )}
                />
              ))}
            </div>
          </div>
        ) : displayIsVideo && displayVideoSrc ? (
          /* Single video */
          <div className="relative w-full bg-black flex items-center justify-center" style={{ aspectRatio: "1/1" }}>
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
              className="absolute bottom-3 right-3 size-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
            >
              {videoMuted ? (
                <VolumeX className="size-4 text-white" />
              ) : (
                <Volume2 className="size-4 text-white" />
              )}
            </button>
          </div>
        ) : (
          /* Single image */
          <div
            className="w-full overflow-hidden flex items-center justify-center bg-[#e4e6eb]"
            style={{ aspectRatio: "1/1" }}
          >
            {displaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt="Post"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-[#8a8d91]">
                <ImageIcon className="size-8" />
                <span className="text-[12px]">Upload an image to preview</span>
              </div>
            )}
          </div>
        )}

        {/* ── Reaction summary ── */}
        <div
          className={cn(
            "flex items-center justify-between text-[13px] text-[#65676b]",
            edgeToEdge ? "px-3 py-1.5" : "px-4 py-1.5"
          )}
        >
          <div className="flex items-center gap-1">
            <span className="flex -space-x-1">
              <span className="size-[18px] rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[9px]">
                👍
              </span>
              <span className="size-[18px] rounded-full bg-[#f33e58] flex items-center justify-center text-white text-[9px]">
                ❤️
              </span>
              <span className="size-[18px] rounded-full bg-[#f7b125] flex items-center justify-center text-white text-[9px]">
                😆
              </span>
            </span>
            <span className="ml-1 hover:underline cursor-pointer">1.2K</span>
          </div>
          <div className="flex items-center gap-1 text-[13px]">
            <span className="hover:underline cursor-pointer">84 comments</span>
            <span>·</span>
            <span className="hover:underline cursor-pointer">12 shares</span>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div
          className={cn(
            "flex items-center justify-around border-t border-[#ced0d4] mx-3",
            edgeToEdge ? "py-0.5" : "py-1"
          )}
        >
          <span className="flex items-center gap-2 py-1.5 px-6 text-[14px] font-semibold text-[#65676b] hover:bg-[#f0f2f5] rounded-[4px] cursor-pointer transition-colors">
            <ThumbsUp className="size-[18px] text-[#1877f2]" /> Like
          </span>
          <span className="flex items-center gap-2 py-1.5 px-6 text-[14px] font-semibold text-[#65676b] hover:bg-[#f0f2f5] rounded-[4px] cursor-pointer transition-colors">
            <MessageCircle className="size-[18px]" /> Comment
          </span>
          <span className="flex items-center gap-2 py-1.5 px-6 text-[14px] font-semibold text-[#65676b] hover:bg-[#f0f2f5] rounded-[4px] cursor-pointer transition-colors">
            <Share2 className="size-[18px]" /> Share
          </span>
        </div>

        {/* ── Comment box ── */}
        <div
          className={cn(
            "flex items-center gap-2 border-t border-[#ced0d4]",
            edgeToEdge ? "px-3 py-2" : "px-4 py-2"
          )}
        >
          <Avatar size={28} />
          <div className="flex-1 flex items-center gap-2 rounded-full px-3 py-1.5 bg-[#f0f2f5]">
            <span className="text-[13px] text-[#8a8d91]">Write a comment…</span>
            <Smile className="size-4 text-[#8a8d91] ml-auto" />
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
}) {
  const captionText = [caption.primaryText, caption.hashtags]
    .filter(Boolean)
    .join(" ");
  const edgeToEdge = device === "mobile";
  const totalSlides = carouselSlides?.length ?? 1;
  const active = carouselSlides && carouselIdx !== undefined ? carouselSlides[carouselIdx] : null;
  const displaySrc = active?.formatted ?? imageSrc;
  const displayIsVideo = active?.isVideo ?? isVideo;
  const displayVideoSrc = active?.videoBlobUrl ?? videoSrc;
  const [videoMuted, setVideoMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <Shell platform="instagram" device={device}>
      <div
        className={cn(
          "bg-white text-[#262626] font-sans",
          edgeToEdge
            ? "border-x border-[#dbdbdb]"
            : "rounded-b-[3px] border border-[#dbdbdb]"
        )}
      >
        {/* ── Header ── */}
        <div
          className={cn(
            "flex items-center gap-2.5",
            edgeToEdge ? "px-3 py-2.5" : "px-4 py-3"
          )}
        >
          <Avatar size={edgeToEdge ? 28 : 32} ring />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold leading-tight text-[#262626]">
              {BRAND_HANDLE}
            </p>
            {sponsored && (
              <p className="text-[11px] text-[#8e8e8e]">Sponsored</p>
            )}
          </div>
          <MoreHorizontal className="size-5 text-[#262626] cursor-pointer" />
        </div>

        {/* ── Media ── */}
        {totalSlides > 1 && carouselSlides ? (
          <CarouselWrapper
            total={totalSlides}
            activeIdx={carouselIdx ?? 0}
            onPrev={onCarouselPrev ?? (() => {})}
            onNext={onCarouselNext ?? (() => {})}
          >
            <div
              className={cn(
                "w-full flex items-center justify-center",
                displayIsVideo ? "bg-black" : "bg-[#fafafa]",
                edgeToEdge ? "" : "border-y border-[#efefef]"
              )}
              style={{ aspectRatio: "1/1" }}
            >
              {displaySrc ? (
                displayIsVideo && displayVideoSrc ? (
                  <video
                    src={displayVideoSrc}
                    poster={displaySrc}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted={videoMuted}
                    loop
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={displaySrc}
                    alt="Post"
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-[#8e8e8e]">
                  <ImageIcon className="size-8" />
                  <span className="text-[12px]">Upload images</span>
                </div>
              )}
            </div>
          </CarouselWrapper>
        ) : (
          <div
            className={cn(
              "w-full flex items-center justify-center",
              displayIsVideo ? "bg-black" : "bg-[#fafafa]",
              edgeToEdge ? "" : "border-y border-[#efefef]"
            )}
            style={{ aspectRatio: "1/1" }}
          >
            {displayIsVideo && displayVideoSrc ? (
              <div className="relative w-full h-full">
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
                  className="absolute bottom-3 right-3 size-8 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
                >
                  {videoMuted ? (
                    <VolumeX className="size-3.5 text-white" />
                  ) : (
                    <Volume2 className="size-3.5 text-white" />
                  )}
                </button>
              </div>
            ) : displaySrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt="Post"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#8e8e8e]">
                <ImageIcon className="size-8" />
                <span className="text-[12px]">Upload an image</span>
              </div>
            )}
          </div>
        )}

        {/* ── Action row ── */}
        <div
          className={cn(
            "flex items-center gap-4",
            edgeToEdge ? "px-3 pt-3" : "px-4 pt-3"
          )}
        >
          <button onClick={() => setLiked(!liked)} className="transition-transform active:scale-125">
            <Heart
              className={cn(
                "size-6 transition-colors",
                liked ? "fill-[#ed4956] text-[#ed4956]" : "text-[#262626] hover:text-[#8e8e8e]"
              )}
            />
          </button>
          <MessageCircle className="size-6 text-[#262626] hover:text-[#8e8e8e] cursor-pointer" />
          <Send className="size-6 text-[#262626] hover:text-[#8e8e8e] cursor-pointer" />
          <button onClick={() => setSaved(!saved)} className="ml-auto transition-transform active:scale-125">
            <Bookmark
              className={cn(
                "size-6 transition-colors",
                saved ? "fill-[#262626] text-[#262626]" : "text-[#262626] hover:text-[#8e8e8e]"
              )}
            />
          </button>
        </div>

        {/* ── Likes ── */}
        <p
          className={cn(
            "text-[14px] font-semibold text-[#262626]",
            edgeToEdge ? "px-3 pt-2" : "px-4 pt-2"
          )}
        >
          {liked ? "1,249" : "1,248"} likes
        </p>

        {/* ── Caption ── */}
        {captionText && (
          <p
            className={cn(
              "text-[14px] leading-snug text-[#262626]",
              edgeToEdge ? "px-3 pt-1 pb-1" : "px-4 pt-1 pb-1"
            )}
          >
            <span className="font-semibold mr-1.5">{BRAND_HANDLE}</span>
            <span className="whitespace-pre-line">{captionText}</span>
          </p>
        )}

        {/* ── View comments ── */}
        <p
          className={cn(
            "text-[14px] text-[#8e8e8e] cursor-pointer",
            edgeToEdge ? "px-3 pt-1" : "px-4 pt-1"
          )}
        >
          View all 84 comments
        </p>

        {/* ── Comment input ── */}
        <div
          className={cn(
            "flex items-center gap-2 border-t border-[#efefef]",
            edgeToEdge ? "px-3 py-2.5 mt-2" : "px-4 py-3 mt-2"
          )}
        >
          <Avatar size={26} />
          <span className="text-[14px] text-[#8e8e8e] flex-1 cursor-text">
            Add a comment…
          </span>
          <span className="text-[14px] font-semibold text-[#b2dffc] cursor-pointer">
            Post
          </span>
        </div>

        {/* ── Timestamp ── */}
        <p
          className={cn(
            "text-[10px] uppercase text-[#8e8e8e] tracking-[0.5px]",
            edgeToEdge ? "px-3 pb-3 pt-2" : "px-4 pb-3 pt-2"
          )}
        >
          2 hours ago
        </p>
      </div>
    </Shell>
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
}: {
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
}) {
  const [muted, setMuted] = useState(true);
  const body = formatCaption(caption);

  return (
    <PhoneFrame platform="facebook">
      <div className="relative w-full bg-black" style={{ aspectRatio: "9/16" }}>
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
          <img
            src={imageSrc}
            alt="Reel"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e] text-white/60">
            <div className="flex flex-col items-center gap-3">
              <Film className="size-10" />
              <span className="text-[13px]">Upload a video to preview</span>
            </div>
          </div>
        )}

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />

        {/* Progress bar */}
        <div className="absolute top-2 inset-x-3 flex gap-1 z-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden"
            >
              <div
                className={cn(
                  "h-full bg-white rounded-full transition-all duration-300",
                  i === 0 ? "w-2/3" : "w-0"
                )}
              />
            </div>
          ))}
        </div>

        {/* Top: profile info */}
        <div className="absolute top-8 inset-x-3 flex items-center gap-2 z-10">
          <Avatar size={32} />
          <div>
            <span className="text-white text-[14px] font-semibold drop-shadow">
              {BRAND_NAME}
            </span>
          </div>
          <button className="ml-auto px-3 py-1 text-[12px] font-semibold text-black bg-white rounded-full">
            Follow
          </button>
        </div>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Right actions */}
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5 z-10">
          <button className="flex flex-col items-center gap-0.5">
            <div className="size-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <ThumbsUp className="size-5 text-white" />
            </div>
            <span className="text-[12px] text-white font-medium">Like</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <div className="size-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <MessageCircle className="size-5 text-white" />
            </div>
            <span className="text-[12px] text-white font-medium">Comment</span>
          </button>
          <button className="flex flex-col items-center gap-0.5">
            <div className="size-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
              <Send className="size-5 text-white" />
            </div>
            <span className="text-[12px] text-white font-medium">Share</span>
          </button>
        </div>

        {/* Mute button */}
        {isVideo && (
          <button
            onClick={() => setMuted(!muted)}
            className="absolute bottom-20 left-3 size-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center z-10"
          >
            {muted ? (
              <VolumeX className="size-4 text-white" />
            ) : (
              <Volume2 className="size-4 text-white" />
            )}
          </button>
        )}

        {/* Caption at bottom */}
        <div className="absolute inset-x-3 bottom-3 z-10 max-w-[70%]">
          {body && (
            <p className="text-[14px] text-white leading-snug drop-shadow line-clamp-3 whitespace-pre-line">
              {body}
            </p>
          )}
          <p className="text-[12px] text-white/70 mt-1">
            {BRAND_NAME} · Just now
          </p>
        </div>
      </div>
      <p className="text-center text-[12px] text-[var(--body-subtle)] mt-2">
        Facebook Reel
      </p>
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
}: {
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
}) {
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const body = formatCaption(caption);

  return (
    <PhoneFrame platform="instagram">
      <div className="relative w-full bg-black" style={{ aspectRatio: "9/16" }}>
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
          <img
            src={imageSrc}
            alt="Reel"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c1e] text-white/60">
            <div className="flex flex-col items-center gap-3">
              <Film className="size-10" />
              <span className="text-[13px]">Upload a video to preview</span>
            </div>
          </div>
        )}

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

        {/* Top header */}
        <div className="absolute top-8 inset-x-4 flex items-center gap-3 z-10">
          <span className="text-white text-[15px] font-semibold drop-shadow">
            Reels
          </span>
          <ChevronRight className="size-4 text-white/80" />
        </div>

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        {/* Right action buttons */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
          <button
            onClick={() => setLiked(!liked)}
            className="flex flex-col items-center gap-1"
          >
            <Heart
              className={cn(
                "size-7 drop-shadow transition-colors",
                liked ? "fill-[#ed4956] text-[#ed4956]" : "text-white"
              )}
            />
            <span className="text-[12px] text-white font-medium">1.2K</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <MessageCircle className="size-7 text-white drop-shadow" />
            <span className="text-[12px] text-white font-medium">84</span>
          </button>
          <button className="flex flex-col items-center gap-1">
            <Send className="size-6 text-white drop-shadow" />
          </button>
          <button
            onClick={() => setSaved(!saved)}
            className="flex flex-col items-center gap-1"
          >
            <Bookmark
              className={cn(
                "size-6 drop-shadow transition-colors",
                saved ? "fill-white text-white" : "text-white"
              )}
            />
          </button>
        </div>

        {/* Mute button */}
        {isVideo && (
          <button
            onClick={() => setMuted(!muted)}
            className="absolute bottom-24 left-3 size-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center z-10"
          >
            {muted ? (
              <VolumeX className="size-4 text-white" />
            ) : (
              <Volume2 className="size-4 text-white" />
            )}
          </button>
        )}

        {/* Bottom info */}
        <div className="absolute inset-x-4 bottom-14 z-10 max-w-[75%]">
          <p className="text-[14px] text-white font-semibold drop-shadow flex items-center gap-1">
            {BRAND_HANDLE}
            <span className="inline-flex items-center justify-center size-[14px] rounded-full bg-[#0095f6] text-white text-[8px]">
              ✓
            </span>
          </p>
          {body && (
            <p className="text-[14px] text-white leading-snug drop-shadow line-clamp-2 mt-0.5 whitespace-pre-line">
              {body}
            </p>
          )}
          <p className="text-[12px] text-white/80 mt-1 flex items-center gap-1">
            <Music2 className="size-3" />
            <span>Original audio · TallinnDoll</span>
          </p>
        </div>

        {/* Bottom nav (IG style) */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-around py-3 px-4 bg-black/60 backdrop-blur-sm z-10 border-t border-white/10">
          <Home className="size-6 text-white" />
          <Search className="size-6 text-white/60" />
          <PlusSquare className="size-6 text-white/60" />
          <Film className="size-6 text-white" />
          <User className="size-6 text-white/60" />
        </div>
      </div>
      <p className="text-center text-[12px] text-[var(--body-subtle)] mt-2">
        Instagram Reel
      </p>
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
    />
  );
}

export function StoryPreview({
  platform,
  caption,
  imageSrc,
  isVideo,
  videoSrc,
}: {
  platform: SocialPlatform;
  caption: Caption;
  imageSrc: string | null;
  isVideo?: boolean;
  videoSrc?: string | null;
}) {
  if (platform === "facebook") {
    return (
      <FacebookReelPost
        caption={caption}
        imageSrc={imageSrc}
        isVideo={isVideo}
        videoSrc={videoSrc}
      />
    );
  }
  return (
    <InstagramReelPost
      caption={caption}
      imageSrc={imageSrc}
      isVideo={isVideo}
      videoSrc={videoSrc}
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
