"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import ImageStudio, { type MediaFileEntry } from "./ImageStudio";
import {
  FeedPreview,
  StoryPreview,
  PreviewSkeleton,
  type Caption,
  type SocialPlatform,
  type PreviewDevice,
} from "./SocialPreviews";
import {
  FORMAT_PRESETS,
  type FormatPreset,
  loadImage,
  fileToDataUrl,
  cropToPreset,
  isVideoFile,
  getVideoMeta,
  extractVideoThumb,
  extractVideoFrames,
  fileToThumbnailDataUrl,
  downloadDataUrl,
} from "@/lib/imageFormats";
import {
  parseGeneratedCopy,
  buildUserPrompt,
  BRAND_SYSTEM_PROMPT,
} from "@/lib/captionParse";
import { publishPost } from "@/lib/publishPost";
import { uploadToPublicUrl, isUploadConfigured } from "@/lib/uploadMedia";
import type { ScheduledPost } from "@/types/index";
import {
  Sparkles,
  Monitor,
  Smartphone,
  Plus,
  Film,
  Loader2,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  ImageIcon,
  ChevronDown,
  Upload,
  X,
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

const SELECT_CLASSES =
  "w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none appearance-none cursor-pointer";

const EMPTY_CAPTION: Caption = {
  headline: "",
  primaryText: "",
  hashtags: "",
  cta: "",
};

// ── Unified preview selector ──

type PreviewOptionId =
  | "facebook-feed"
  | "instagram-feed"
  | "facebook-feed-video"
  | "facebook-reel"
  | "instagram-reel";

interface PreviewOption {
  id: PreviewOptionId;
  label: string;
  platform: SocialPlatform;
  surface: "feed" | "story";
  isVideo: boolean;
}

function previewOptionsFor(isVideo: boolean): PreviewOption[] {
  return isVideo
    ? [
        { id: "facebook-feed-video", label: "Facebook Feed Video", platform: "facebook", surface: "feed", isVideo: true },
        { id: "facebook-reel", label: "Facebook Reel", platform: "facebook", surface: "story", isVideo: true },
        { id: "instagram-reel", label: "Instagram Reel", platform: "instagram", surface: "story", isVideo: true },
      ]
    : [
        { id: "facebook-feed", label: "Facebook Feed", platform: "facebook", surface: "feed", isVideo: false },
        { id: "instagram-feed", label: "Instagram Feed", platform: "instagram", surface: "feed", isVideo: false },
      ];
}

// ── Props ──

export interface PublishTask {
  id: string;
  status: "processing" | "success" | "error";
  message: string;
  url?: string;
}

interface PostComposerProps {
  collections: string[];
  postTypes: string[];
  onCreatePost: (post: ScheduledPost) => void;
  onRequestCarousel?: (files: File[]) => void;
  // Publish task queue (owned by ContentPage)
  publishTasks: PublishTask[];
  onAddPublishTask: (task: PublishTask) => void;
  onUpdatePublishTask: (id: string, update: Partial<PublishTask>) => void;
  onDismissPublishTask: (id: string) => void;
  hasActiveTasks: boolean;
}

export default function PostComposer({
  collections,
  postTypes,
  onCreatePost,
  onRequestCarousel: _onRequestCarousel,
  publishTasks,
  onAddPublishTask,
  onUpdatePublishTask,
  onDismissPublishTask,
  hasActiveTasks,
}: PostComposerProps) {
  // ── Media state ──
  const [mediaFiles, setMediaFiles] = useState<MediaFileEntry[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editFit, setEditFit] = useState<"contain" | "cover">("contain");
  const [editPreview, setEditPreview] = useState<string | null>(null);
  const [focusX, setFocusX] = useState(0.5);
  const [focusY, setFocusY] = useState(0.5);
  const [activeFormatKey, setActiveFormatKey] = useState(FORMAT_PRESETS[0].key);
  const [fmtStatus, setFmtStatus] = useState<string>("");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [generatingThumbnails, setGeneratingThumbnails] = useState(false);
  const imgElRef = useRef<HTMLImageElement | null>(null);

  // ── Video thumbnail state ──
  const [suggestedThumbnails, setSuggestedThumbnails] = useState<string[]>([]);
  const [customThumbnail, setCustomThumbnail] = useState<string | null>(null);
  const thumbUploadRef = useRef<HTMLInputElement>(null);

  // ── Active file ──
  const activeFile = mediaFiles[activeSlideIdx] ?? null;
  const isVideo = activeFile?.isVideo ?? false;
  const multiSlide = mediaFiles.length > 1;

  // ── Preview state ──
  const [selectedPreviewId, setSelectedPreviewId] = useState<PreviewOptionId>("instagram-feed");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [fadeKey, setFadeKey] = useState(0);

  // ── Derive current preview option ──
  const previewOptions = useMemo(() => previewOptionsFor(isVideo), [isVideo]);
  const selectedPreview = useMemo(
    () => previewOptions.find((o) => o.id === selectedPreviewId) ?? previewOptions[0],
    [previewOptions, selectedPreviewId]
  );
  const surface = selectedPreview.surface;
  const platform = selectedPreview.platform;
  const showDeviceToggle = !isVideo || selectedPreviewId === "facebook-feed-video";

  // ── Publish targeting ──
  const [targetPlatforms, setTargetPlatforms] = useState<("instagram" | "facebook")[]>([
    "instagram",
    "facebook",
  ]);
  const [targetPlacements, setTargetPlacements] = useState<("feed" | "story")[]>(["feed"]);

  // ── Caption state ──
  const [collection, setCollection] = useState(collections[0]);
  const [postType, setPostType] = useState(postTypes[0]);
  const [language, setLanguage] = useState<"Estonian" | "English">("Estonian");
  const [detail, setDetail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [caption, setCaption] = useState<Caption>(EMPTY_CAPTION);
  const [genError, setGenError] = useState<string | null>(null);

  // ── Publishing state (lifted to ContentPage) ──

  const retryPublishTask = (id: string) => {
    onDismissPublishTask(id);
    handlePublish();
  };

  // ── Derive preview image ──
  const activeCrops = activeFile?.crops ?? {};
  const previewImage = useMemo(() => {
    if (isVideo) return activeFile?.dataUrl ?? null;
    if (surface === "story") return activeCrops["story"] ?? activeFile?.dataUrl ?? null;
    return activeCrops["square"] ?? activeFile?.dataUrl ?? null;
  }, [surface, activeCrops, activeFile, isVideo]);

  // ── Keep format key synced with selected preview ──
  useEffect(() => {
    if (surface === "story") setActiveFormatKey("story");
    else setActiveFormatKey("square");
  }, [surface]);

  // ── Auto-switch to video preview on video upload ──
  useEffect(() => {
    if (isVideo) {
      setSelectedPreviewId("instagram-reel");
    } else {
      setSelectedPreviewId((prev) =>
        prev === "facebook-feed-video" || prev === "facebook-reel" || prev === "instagram-reel"
          ? "instagram-feed"
          : prev
      );
    }
  }, [isVideo]);

  // ── Update imgElRef when active slide changes ──
  // This ensures crop calculations + smart formatting use the correct image
  // for each slide, not just the first one.
  useEffect(() => {
    if (!activeFile) return;
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(activeFile.dataUrl);
        if (!cancelled) imgElRef.current = img;
      } catch { /* */ }
    })();
    return () => { cancelled = true; };
  }, [activeSlideIdx, activeFile?.dataUrl]);

  // ── Recompute crops for the active slide ──
  // Loads the image FRESH from activeFile.dataUrl so each slide always
  // uses its own image — no stale imgElRef race condition.
  useEffect(() => {
    if (!activeFile) return;
    let cancelled = false;
    const run = async () => {
      const img = await loadImage(activeFile.dataUrl);
      if (cancelled) return;

      const next: Record<string, string> = {};
      const fitMode = isVideo ? ("cover" as const) : ("contain" as const);
      for (const preset of FORMAT_PRESETS) {
        try {
          next[preset.key] = cropToPreset(img, preset, {
            focusX,
            focusY,
            fit: fitMode,
          });
        } catch { /* skip */ }
      }
      if (cancelled) return;
      updateActiveFileCrops(next);

      if (isVideo) return;
      const { needsSmartFormat, formatImageSmart } = await import("@/lib/smartFormat");
      for (const preset of FORMAT_PRESETS) {
        if (cancelled) return;
        if (!needsSmartFormat(img, preset)) continue;
        setFmtStatus(`Enhancing ${preset.label}…`);
        try {
          const { dataUrl } = await formatImageSmart(activeFile.dataUrl, preset, {
            onStage: (s) => { if (!cancelled) setFmtStatus(s); },
            description: caption.headline ? `${caption.headline} fashion photo` : undefined,
          });
          if (!cancelled) updateActiveFileCrops({ [preset.key]: dataUrl });
        } catch { /* keep contain-fit */ }
      }
      if (!cancelled) setFmtStatus("");
    };
    run();
    return () => { cancelled = true; };
  }, [focusX, focusY, activeSlideIdx, activeFile?.dataUrl]);

  // ── Live edit preview ──
  useEffect(() => {
    if (!editingFileId || !activeFile) return;
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(activeFile.dataUrl);
        const result = cropToPreset(img, FORMAT_PRESETS[0], {
          fit: editFit,
          focusX,
          focusY,
        });
        if (!cancelled) setEditPreview(result);
      } catch { /* */ }
    })();
    return () => { cancelled = true; };
  }, [editingFileId, editFit, focusX, focusY, activeFile?.dataUrl]);

  // ── Helpers ──

  const updateActiveFileCrops = useCallback(
    (newCrops: Record<string, string>) => {
      setMediaFiles((prev) => {
        const n = [...prev];
        const idx = activeSlideIdx;
        if (n[idx]) n[idx] = { ...n[idx], crops: { ...(n[idx].crops ?? {}), ...newCrops } };
        return n;
      });
    },
    [activeSlideIdx]
  );

  const processFile = useCallback(
    async (file: File): Promise<MediaFileEntry> => {
      const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const vid = isVideoFile(file);
      const crops: Record<string, string> = {};
      let width: number | undefined;
      let height: number | undefined;
      let duration: number | undefined;
      let dataUrl: string;
      let videoBlobUrl: string | undefined;

      if (vid) {
        // Extract thumbnail frame for display in composer
        dataUrl = await extractVideoThumb(file);
        videoBlobUrl = URL.createObjectURL(file);
        try {
          const meta = await getVideoMeta(file);
          duration = meta.duration;
          width = meta.width;
          height = meta.height;
        } catch { /* */ }
      } else {
        dataUrl = await fileToDataUrl(file);
        try {
          const img = await loadImage(dataUrl);
          width = img.naturalWidth;
          height = img.naturalHeight;
        } catch { /* */ }
      }

      // Generate crops from thumbnail
      try {
        const img = await loadImage(dataUrl);
        const fitMode = vid ? ("cover" as const) : ("contain" as const);
        for (const preset of FORMAT_PRESETS) {
          try {
            crops[preset.key] = cropToPreset(img, preset, { fit: fitMode });
          } catch { /* */ }
        }
      } catch { /* */ }

      return { id, file, dataUrl, isVideo: vid, videoBlobUrl, width, height, duration, crops };
    },
    []
  );

  // ── Handlers ──

  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      setMediaLoading(true);
      const hasVideo = files.some((f) => isVideoFile(f));
      const newFiles: MediaFileEntry[] = [];
      for (let i = 0; i < Math.min(files.length, 10); i++) {
        setFmtStatus(`Processing ${i + 1}/${Math.min(files.length, 10)}…`);
        const entry = await processFile(files[i]);
        newFiles.push(entry);
      }

      // If there are existing files, append; otherwise replace
      setMediaFiles((prev) => {
        const combined = [...prev, ...newFiles].slice(0, 10);
        return combined;
      });
      setActiveSlideIdx((prev) => {
        const total = mediaFiles.length + newFiles.length;
        return Math.min(prev, total - 1);
      });

      // Load first new file's image element for focal point
      if (newFiles[0]) {
        try {
          const img = await loadImage(newFiles[0].dataUrl);
          imgElRef.current = img;
        } catch { /* */ }
      }

      setMediaLoading(false);
      setFmtStatus("");

      // Generate suggested thumbnails for video files
      if (hasVideo) {
        const videoFile = newFiles.find((f) => f.isVideo);
        if (videoFile) {
          setGeneratingThumbnails(true);
          extractVideoFrames(videoFile.file, 5)
            .then((frames) => {
              setSuggestedThumbnails(frames);
              setMediaFiles((prev) => {
                const n = [...prev];
                const vidIdx = n.findIndex((f) => f.id === videoFile.id);
                if (vidIdx >= 0) n[vidIdx] = { ...n[vidIdx], selectedThumbnail: frames[0] };
                return n;
              });
            })
            .catch(() => { /* frame extraction failed */ })
            .finally(() => setGeneratingThumbnails(false));
        }
      }
    },
    [processFile, mediaFiles.length]
  );

  const handleRemoveFile = useCallback((id: string) => {
    setMediaFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== id);
      if (filtered.length === 0) {
        imgElRef.current = null;
        setSuggestedThumbnails([]);
        setCustomThumbnail(null);
      }
      return filtered;
    });
    setActiveSlideIdx((prev) => Math.max(0, prev - 1));
    if (editingFileId === id) setEditingFileId(null);
  }, [editingFileId]);

  // ── Video thumbnail handlers ──

  const handleSelectThumbnail = useCallback((thumbnailDataUrl: string) => {
    setCustomThumbnail(thumbnailDataUrl);
    setMediaFiles((prev) => {
      const n = [...prev];
      const vidIdx = n.findIndex((f) => f.isVideo);
      if (vidIdx >= 0) n[vidIdx] = { ...n[vidIdx], selectedThumbnail: thumbnailDataUrl };
      return n;
    });
  }, []);

  const handleUploadCustomThumbnail = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      try {
        const dataUrl = await fileToThumbnailDataUrl(file);
        handleSelectThumbnail(dataUrl);
      } catch { /* */ }
    },
    [handleSelectThumbnail]
  );

  const handleResetThumbnail = useCallback(() => {
    setCustomThumbnail(null);
    setMediaFiles((prev) => {
      const n = [...prev];
      const vidIdx = n.findIndex((f) => f.isVideo);
      if (vidIdx >= 0 && suggestedThumbnails.length > 0) {
        n[vidIdx] = { ...n[vidIdx], selectedThumbnail: suggestedThumbnails[0] };
      }
      return n;
    });
  }, [suggestedThumbnails]);

  const handleEditFile = useCallback(
    async (id: string) => {
      if (editingFileId === id) {
        // Close edit — apply changes by regenerating crops
        const file = mediaFiles.find((f) => f.id === id);
        if (file && editPreview) {
          try {
            const img = await loadImage(file.dataUrl);
            const nextCrops: Record<string, string> = {};
            for (const preset of FORMAT_PRESETS) {
              try {
                nextCrops[preset.key] = cropToPreset(img, preset, {
                  fit: editFit,
                  focusX,
                  focusY,
                });
              } catch { /* */ }
            }
            setMediaFiles((prev) => {
              const n = [...prev];
              const idx = n.findIndex((f) => f.id === id);
              if (idx >= 0) n[idx] = { ...n[idx], crops: { ...(n[idx].crops ?? {}), ...nextCrops } };
              return n;
            });
            imgElRef.current = img;
          } catch { /* */ }
        }
        setEditingFileId(null);
        setEditPreview(null);
      } else {
        setEditingFileId(id);
        setEditFit("contain");
        setEditPreview(null);
        const idx = mediaFiles.findIndex((f) => f.id === id);
        if (idx >= 0) {
          setActiveSlideIdx(idx);
          // Load the file's image into imgElRef for crop calculations
          try {
            const img = await loadImage(mediaFiles[idx].dataUrl);
            imgElRef.current = img;
          } catch { /* */ }
        }
      }
    },
    [editingFileId, mediaFiles, editPreview, editFit, focusX, focusY]
  );

  const handleReset = useCallback(() => {
    setMediaFiles([]);
    setActiveSlideIdx(0);
    imgElRef.current = null;
    setEditingFileId(null);
    setFocusX(0.5);
    setFocusY(0.5);
    setSuggestedThumbnails([]);
    setCustomThumbnail(null);
    setCaption(EMPTY_CAPTION);
    setDetail("");
  }, []);

  const slug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleDownload = (preset: FormatPreset) => {
    const data = activeCrops[preset.key];
    if (data)
      downloadDataUrl(data, `tallindoll-${slug(collection)}-${preset.ratioLabel.replace(":", "x")}.jpg`);
  };

  const handleDownloadAll = () => {
    FORMAT_PRESETS.forEach((p, i) => {
      const data = activeCrops[p.key];
      if (data)
        setTimeout(
          () => downloadDataUrl(data, `tallindoll-${slug(collection)}-${p.ratioLabel.replace(":", "x")}.jpg`),
          i * 250
        );
    });
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const userPrompt = buildUserPrompt({
        collection,
        postType,
        surface,
        platform,
        language,
        detail,
        image: activeFile
          ? { orientation: "landscape", brightness: "0.5", dominantColor: "#C8399C" }
          : undefined,
      });
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: BRAND_SYSTEM_PROMPT,
          userPrompt,
          imageDataUrl: activeCrops["square"] ?? activeFile?.dataUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed");
      setCaption(parseGeneratedCopy(json.result));
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const captionText = () =>
    [caption.headline, caption.primaryText, caption.hashtags, caption.cta]
      .filter(Boolean)
      .join("\n\n");

  const cropFor = (s: "feed" | "story" | "ad") =>
    s === "story" ? activeCrops["story"] : activeCrops["square"];

  const toggleIn = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const effectivePlacements: ("feed" | "story")[] = targetPlacements;

  const targets = targetPlatforms.flatMap((p) =>
    effectivePlacements.map((s) => ({ platform: p, surface: s }))
  );

  const buildPost = (
    status: ScheduledPost["status"],
    p: "instagram" | "facebook",
    s: "feed" | "story" | "ad"
  ): ScheduledPost => ({
    id: `composer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: caption.headline || `${collection} — ${postType}`,
    content: captionText(),
    platform: p === "instagram" ? "Instagram" : "Facebook",
    scheduledDate: new Date().toISOString(),
    status,
    productRef: collection,
    imageDataUrl: cropFor(s) ?? undefined,
    surface: s,
  });

  const handleAddToQueue = () => {
    targets.forEach((t) => onCreatePost(buildPost("draft", t.platform, t.surface)));
  };

  const handlePublish = () => {
    if (targets.length === 0) {
      onAddPublishTask({
        id: `err-${Date.now()}`,
        status: "error",
        message: "Select at least one destination in 'Publish to'.",
      });
      return;
    }

    const taskId = `pub-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    onAddPublishTask({
      id: taskId,
      status: "processing",
      message: isVideo
        ? "🎬 Processing video…"
        : multiSlide
          ? `📷 Processing ${mediaFiles.length} images…`
          : "📷 Processing image…",
    });

    // Run the actual publish in background
    (async () => {
      try {
        if (isVideo && activeFile) {
          if (!isUploadConfigured()) throw new Error("Cloudinary not configured.");
          // Upload video
          const form = new FormData();
          form.append("file", activeFile.file);
          form.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
          const up = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/video/upload`,
            { method: "POST", body: form }
          );
          const upJson = await up.json();
          if (!upJson.secure_url) throw new Error("Video upload failed");
          const videoUrl = upJson.secure_url;

          // Upload selected thumbnail if available
          let thumbUrl: string | undefined;
          const selectedThumb = activeFile.selectedThumbnail;
          if (selectedThumb) {
            try {
              const thumbForm = new FormData();
              const thumbBlob = await (await fetch(selectedThumb)).blob();
              thumbForm.append("file", thumbBlob, "thumbnail.jpg");
              thumbForm.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
              const thumbUp = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: "POST", body: thumbForm }
              );
              const thumbJson = await thumbUp.json();
              if (thumbJson.secure_url) thumbUrl = thumbJson.secure_url;
            } catch { /* best-effort */ }
          }

          for (const t of targets) {
            const ep = t.platform === "instagram" ? "/api/publish/instagram" : "/api/publish/facebook";
            const isStory = t.surface === "story";
            const body: Record<string, unknown> =
              t.platform === "instagram"
                ? { imageUrl: videoUrl, caption: captionText(), isStory, isVideo: true, coverUrl: thumbUrl }
                : { imageUrl: videoUrl, message: isStory ? undefined : captionText(), isStory, isVideo: true, thumb: thumbUrl };
            const res = await fetch(ep, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const json = await res.json();
            if (res.ok && json.id) {
              onUpdatePublishTask(taskId, {
                status: "success",
                message: `🎬 Video published to ${t.platform} ${t.surface}${thumbUrl ? " (custom thumbnail)" : ""}! You can check it now.`,
                url: json.permalink,
              });
              onCreatePost(buildPost("published", t.platform, t.surface));
            } else {
              onUpdatePublishTask(taskId, {
                status: "error",
                message: json.error || "Video publish failed",
              });
            }
          }
          handleReset();
          return;
        }

    // ── Carousel (multi-image) publishing ──
    if (multiSlide) {
      try {
        if (!isUploadConfigured()) throw new Error("Cloudinary not configured.");
        // Upload all slides to Cloudinary
        const urls: string[] = [];
        for (const slide of mediaFiles) {
          const slideCrop = slide.crops["square"] ?? slide.dataUrl;
          const url = await uploadToPublicUrl(slideCrop);
          urls.push(url);
        }

        let anyOk = false;
        let firstUrl: string | undefined;
        const msgs: string[] = [];

        // Instagram → carousel API
        if (targetPlatforms.includes("instagram")) {
          try {
            const res = await fetch("/api/publish/carousel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrls: urls, caption: captionText() }),
            });
            const json = await res.json();
            if (res.ok && json.id) {
              anyOk = true;
              firstUrl = json.permalink;
              msgs.push(`IG carousel — ${urls.length} slides published`);
              onCreatePost(buildPost("published", "instagram", "feed"));
            } else {
              msgs.push(`IG carousel failed: ${json.error}`);
            }
          } catch (e) {
            msgs.push(`IG carousel error: ${e instanceof Error ? e.message : "Unknown"}`);
          }
        }

        // Facebook → publish first slide as photo (FB doesn't have carousel API for pages)
        if (targetPlatforms.includes("facebook")) {
          try {
            const r = await publishPost({
              platform: "facebook",
              surface: "feed",
              imageDataUrl: urls[0],
              captionText: captionText(),
            });
            if (r.ok) {
              anyOk = true;
              firstUrl = firstUrl ?? r.url;
              msgs.push("FB — first slide published");
              onCreatePost(buildPost("published", "facebook", "feed"));
            } else {
              msgs.push(`FB failed: ${r.message}`);
            }
          } catch (e) {
            msgs.push(`FB error: ${e instanceof Error ? e.message : "Unknown"}`);
          }
        }

        if (anyOk) {
          onUpdatePublishTask(taskId, {
            status: "success",
            message: `📷 Carousel posted successfully! You can check it now.`,
            url: firstUrl,
          });
          handleReset();
        } else {
          onUpdatePublishTask(taskId, {
            status: "error",
            message: msgs.join(" · "),
          });
        }
      } catch (err) {
        onUpdatePublishTask(taskId, {
          status: "error",
          message: err instanceof Error ? err.message : "Carousel publish failed",
        });
      }
      return;
    }

    // ── Single image publishing ──
    let anyOk = false;
    let firstUrl: string | undefined;
    const errs: string[] = [];
    for (const t of targets) {
      const r = await publishPost({
        platform: t.platform,
        surface: t.surface,
        imageDataUrl: cropFor(t.surface) ?? "",
        captionText: captionText(),
      });
      if (r.ok) {
        anyOk = true;
        firstUrl = firstUrl ?? r.url;
        onCreatePost(buildPost("published", t.platform, t.surface));
      } else {
        errs.push(`${t.platform} ${t.surface}: ${r.message}`);
      }
    }
    if (anyOk) {
      onUpdatePublishTask(taskId, {
        status: "success",
        message: `📷 Image posted successfully! You can check it now.`,
        url: firstUrl,
      });
      handleReset();
    } else {
      onUpdatePublishTask(taskId, {
        status: "error",
        message: errs.join(" · "),
      });
    }
      } catch (err) {
        onUpdatePublishTask(taskId, {
          status: "error",
          message: err instanceof Error ? err.message : "Publish failed",
        });
      }
    })();
  };

  const hasCaption =
    caption.headline || caption.primaryText || caption.hashtags || caption.cta;

  // ── Preview slides for carousel ──
  const previewSlides = mediaFiles.map((f) => ({
    formatted: f.dataUrl,
    isVideo: f.isVideo,
    videoBlobUrl: f.isVideo ? (f.videoBlobUrl ?? null) : null,
  }));

  const hasMedia = mediaFiles.length > 0;

  // ── Handle preview switch with fade ──
  const handlePreviewSwitch = useCallback((id: PreviewOptionId) => {
    setFadeKey((k) => k + 1);
    setSelectedPreviewId(id);
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Media Upload (compact thumbnails) ── */}
      <ImageStudio
        files={mediaFiles}
        activeFormatKey={activeFormatKey}
        focusX={focusX}
        focusY={focusY}
        statusMessage={fmtStatus}
        onUploadFiles={handleUploadFiles}
        onRemoveFile={handleRemoveFile}
        onEditFile={handleEditFile}
        onSelectFormat={setActiveFormatKey}
        onFocusChange={(x, y) => {
          setFocusX(x);
          setFocusY(y);
        }}
        onDownload={handleDownload}
        onDownloadAll={handleDownloadAll}
        onReset={handleReset}
        editingFileId={editingFileId}
        editPreview={editPreview}
        editFit={editFit}
        onEditFitChange={setEditFit}
      />

      {/* ── Video Thumbnail Selector (video only) ── */}
      {isVideo && activeFile && (
        <div className={cn(CARD, "p-5 space-y-3")}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Film className="size-4 text-[var(--brand)]" />
              <h3 className="text-[14px] font-semibold text-[var(--heading)]">
                Thumbnail
              </h3>
              <span className="text-[12px] text-[var(--body-subtle)]">
                — choose how your video appears before playback
              </span>
            </div>
            {/* Custom upload button */}
            <button
              onClick={() => thumbUploadRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[2px] border border-[var(--border-default)] text-[var(--body)] hover:bg-[var(--neutral-secondary-medium)] transition-colors"
            >
              <Upload className="size-3.5" />
              Upload Image
            </button>
            <input
              ref={thumbUploadRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadCustomThumbnail(f);
                if (e.target) e.target.value = "";
              }}
            />
          </div>

          {/* Suggested thumbnails from video frames */}
          {generatingThumbnails ? (
            <div className="flex items-center gap-2 text-[13px] text-[var(--body-subtle)] py-3">
              <Loader2 className="size-3.5 animate-spin" />
              Generating thumbnail suggestions…
            </div>
          ) : suggestedThumbnails.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider">
                Suggested
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestedThumbnails.map((frame, i) => {
                  const isSelected =
                    frame === (activeFile?.selectedThumbnail ?? suggestedThumbnails[0]);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelectThumbnail(frame)}
                      className={cn(
                        "shrink-0 rounded-[2px] overflow-hidden border-2 transition-all",
                        isSelected
                          ? "border-[var(--brand)] ring-1 ring-[var(--brand)]"
                          : "border-transparent hover:border-[var(--border-default-medium)]"
                      )}
                      style={{ width: 96, aspectRatio: "16/9" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={frame}
                        alt={`Frame ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
                {/* Custom thumbnail card */}
                {customThumbnail &&
                  !suggestedThumbnails.includes(customThumbnail) && (
                    <button
                      onClick={() => handleSelectThumbnail(customThumbnail)}
                      className={cn(
                        "shrink-0 rounded-[2px] overflow-hidden border-2 transition-all relative",
                        customThumbnail === activeFile?.selectedThumbnail
                          ? "border-[var(--brand)] ring-1 ring-[var(--brand)]"
                          : "border-transparent hover:border-[var(--border-default-medium)]"
                      )}
                      style={{ width: 96, aspectRatio: "16/9" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={customThumbnail}
                        alt="Custom thumbnail"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] py-0.5 text-center">
                        Custom
                      </span>
                    </button>
                  )}
              </div>
              {/* Reset to default */}
              {customThumbnail && (
                <button
                  onClick={handleResetThumbnail}
                  className="text-[11px] text-[var(--body-subtle)] hover:text-[var(--heading)] transition-colors"
                >
                  Reset to suggested thumbnail
                </button>
              )}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--body-subtle)] py-2">
              Upload a video to see suggested thumbnails.
            </p>
          )}
        </div>
      )}

      {/* ── Two-column layout: Editor | Live Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN — Composer                                         */}
        {/* ============================================================ */}
        <div className={cn(CARD, "p-5 space-y-4")}>
          {/* Section: AI Caption Generator */}
          <div className="flex items-start gap-3">
            <Sparkles className="size-5 text-[var(--brand)] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[16px] font-semibold text-[var(--heading)]">
                Caption Generator
              </h2>
              <p className="text-[13px] text-[var(--body)] mt-0.5">
                Estonian brand-voice copy, tailored to the placement
              </p>
            </div>
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collection">
              <input
                list="collection-list"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="Type or select…"
                className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none"
                style={INPUT_STYLE}
              />
              <datalist id="collection-list">
                {collections.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Post type">
              <input
                list="posttype-list"
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                placeholder="Type or select…"
                className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none"
                style={INPUT_STYLE}
              />
              <datalist id="posttype-list">
                {postTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
          </div>

          {/* Language */}
          <Field label="Language">
            <div className="flex gap-2">
              {(["Estonian", "English"] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-3 py-2 text-[13px] font-medium rounded-[2px] transition-colors",
                    language === lang ? "text-white" : "text-[var(--body-subtle)]"
                  )}
                  style={
                    language === lang
                      ? GRADIENT_BRAND
                      : {
                          backgroundColor: "var(--neutral-secondary-medium)",
                          border: "1px solid var(--border-default-medium)",
                        }
                  }
                >
                  {lang === "Estonian" ? "🇪🇪" : "🇬🇧"} {lang}
                </button>
              ))}
            </div>
          </Field>

          {/* Detail / context */}
          <Field label="Details / context (optional)">
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              placeholder="e.g. linen midi dress, sunset shoot, new arrival — anything the AI should mention"
              className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none resize-none"
              style={INPUT_STYLE}
            />
          </Field>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 disabled:opacity-60"
            style={GRADIENT_BRAND}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating
              ? "Generating…"
              : `Generate ${surface === "story" ? "story copy" : "caption"}`}
          </button>

          {genError && (
            <p className="text-[12px] text-[var(--danger)]">{genError}</p>
          )}

          {/* ── Editable caption fields ── */}
          <div className="space-y-3 pt-2 border-t border-[var(--border-default)]">
            <Field label="Headline">
              <input
                value={caption.headline}
                onChange={(e) => setCaption({ ...caption, headline: e.target.value })}
                placeholder="Catchy headline for the post"
                className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none"
                style={INPUT_STYLE}
              />
            </Field>
            <Field label="Body copy">
              <textarea
                value={caption.primaryText}
                onChange={(e) => setCaption({ ...caption, primaryText: e.target.value })}
                rows={3}
                placeholder="Main caption — supports emojis, line breaks, mentions, and hashtags"
                className="w-full px-3 py-2 text-[14px] rounded-[2px] focus:outline-none resize-none"
                style={INPUT_STYLE}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hashtags">
                <input
                  value={caption.hashtags}
                  onChange={(e) => setCaption({ ...caption, hashtags: e.target.value })}
                  placeholder="#tallindoll #fashion"
                  className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none"
                  style={{ ...INPUT_STYLE, color: "var(--brand)" }}
                />
              </Field>
              <Field label="Call to action">
                <input
                  value={caption.cta}
                  onChange={(e) => setCaption({ ...caption, cta: e.target.value })}
                  placeholder="Shop Now →"
                  className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none"
                  style={INPUT_STYLE}
                />
              </Field>
            </div>
          </div>

          {/* ── Publish-to targeting ── */}
          <div className="p-4 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] space-y-3">
            <div className="flex items-center gap-2">
              <Send className="size-3.5 text-[var(--brand)]" />
              <span className="text-[12px] font-semibold text-[var(--heading)] uppercase tracking-wider">
                Publish to
              </span>
              <span className="text-[11px] text-[var(--body-subtle)] ml-auto">
                {targets.length} destination{targets.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Platform chips */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--body-subtle)] w-20 shrink-0">Platform</span>
              {(["instagram", "facebook"] as const).map((p) => {
                const on = targetPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => setTargetPlatforms((prev) => toggleIn(prev, p))}
                    className={cn(
                      "px-3 py-1.5 text-[13px] font-medium rounded-[2px] border transition-all capitalize",
                      on
                        ? "text-white border-transparent"
                        : "text-[var(--body-subtle)] border-[var(--border-default)] hover:bg-[var(--neutral-primary-soft)]"
                    )}
                    style={on ? GRADIENT_BRAND : undefined}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            {/* Placement chips */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[var(--body-subtle)] w-20 shrink-0">Placement</span>
              {(["feed", "story"] as const).map((s) => {
                const on = effectivePlacements.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => setTargetPlacements((prev) => toggleIn(prev, s))}
                    className={cn(
                      "px-3 py-1.5 text-[13px] font-medium rounded-[2px] border transition-all capitalize",
                      on
                        ? "text-white border-transparent"
                        : "text-[var(--body-subtle)] border-[var(--border-default)] hover:bg-[var(--neutral-primary-soft)]"
                    )}
                    style={on ? GRADIENT_BRAND : undefined}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleAddToQueue}
              disabled={!hasCaption}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors disabled:opacity-50"
            >
              <Plus className="size-4" />
              Save Draft
            </button>
            <button
              onClick={handlePublish}
              disabled={hasActiveTasks || !hasCaption || !hasMedia}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[14px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 disabled:opacity-50"
              style={GRADIENT_BRAND}
            >
              {hasActiveTasks ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {hasActiveTasks ? "Publishing…" : "Approve & Publish"}
            </button>
          </div>

        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN — Live Preview (sticky)                            */}
        {/* ============================================================ */}
        <div className="lg:sticky lg:top-4">
          <div className={cn(CARD, "p-5")}>
            {/* ── Preview selector ── */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider">
                  Preview
                </span>
                <div className="relative">
                  <select
                    value={selectedPreviewId}
                    onChange={(e) => handlePreviewSwitch(e.target.value as PreviewOptionId)}
                    className="appearance-none pl-3 pr-8 py-2 text-[13px] font-semibold rounded-[2px] focus:outline-none cursor-pointer"
                    style={{ ...GRADIENT_BRAND, border: "none", color: "#ffffff" }}
                  >
                    {previewOptions.map((opt) => (
                      <option key={opt.id} value={opt.id} style={{ color: "#111827", background: "#ffffff" }}>
                        {opt.isVideo ? "🎬 " : "📷 "}
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-4 text-white pointer-events-none" />
                </div>
              </div>

              {/* Device toggle (feed previews only) */}
              {showDeviceToggle && (
                <div className="inline-flex rounded-[2px] border border-[var(--border-default)] overflow-hidden">
                  <button
                    onClick={() => setDevice("desktop")}
                    title="Desktop view"
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      device === "desktop"
                        ? "bg-[var(--brand-softer)] text-[var(--brand)]"
                        : "text-[var(--body-subtle)] hover:bg-[var(--neutral-secondary-medium)]"
                    )}
                  >
                    <Monitor className="size-4" />
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    title="Mobile view"
                    className={cn(
                      "px-2 py-1.5 transition-colors",
                      device === "mobile"
                        ? "bg-[var(--brand-softer)] text-[var(--brand)]"
                        : "text-[var(--body-subtle)] hover:bg-[var(--neutral-secondary-medium)]"
                    )}
                  >
                    <Smartphone className="size-4" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Media info bar ── */}
            {hasMedia && (
              <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)] text-[12px] font-medium">
                {multiSlide ? (
                  <>
                    <ImageIcon className="size-3.5" />
                    <span>
                      Carousel — {mediaFiles.length} slides · Slide {activeSlideIdx + 1}/{mediaFiles.length}
                    </span>
                  </>
                ) : isVideo ? (
                  <>
                    <Film className="size-3.5" />
                    <span>Video · {selectedPreview.label}</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="size-3.5" />
                    <span>
                      {activeFile?.file.name} · {activeFile?.width}×{activeFile?.height}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* ── Preview area — single large preview ── */}
            <div className="bg-[var(--neutral-secondary-medium)] rounded-[2px] p-4 sm:p-6 flex items-start justify-center min-h-[460px]">
              <div
                key={fadeKey}
                className="w-full flex justify-center animate-fade-in"
              >
                {mediaLoading ? (
                  <PreviewSkeleton platform={platform} device={device} />
                ) : !hasMedia ? (
                  /* Empty state */
                  <div className="flex flex-col items-center gap-3 text-[var(--body-subtle)] py-16">
                    <div
                      className="size-16 rounded-full flex items-center justify-center"
                      style={GRADIENT_BRAND}
                    >
                      <Eye className="size-7 text-white" />
                    </div>
                    <p className="text-[15px] font-semibold text-[var(--heading)]">
                      Live Preview
                    </p>
                    <p className="text-[13px] text-center max-w-[280px]">
                      Upload an image or video to see exactly how your post will look on{" "}
                      {isVideo ? "Facebook and Instagram" : "Facebook or Instagram"}
                    </p>
                  </div>
                ) : surface === "feed" ? (
                  /* ── Feed preview (image or video) ── */
                  <FeedPreview
                    platform={platform}
                    device={device}
                    caption={caption}
                    imageSrc={previewImage}
                    isVideo={selectedPreview.isVideo}
                    videoSrc={selectedPreview.isVideo ? activeFile?.videoBlobUrl ?? null : null}
                    carouselSlides={multiSlide ? previewSlides : undefined}
                    carouselIdx={multiSlide ? activeSlideIdx : undefined}
                    onCarouselPrev={() => setActiveSlideIdx((i) => Math.max(0, i - 1))}
                    onCarouselNext={() =>
                      setActiveSlideIdx((i) => Math.min(mediaFiles.length - 1, i + 1))
                    }
                  />
                ) : (
                  /* ── Story / Reel preview ── */
                  <StoryPreview
                    platform={platform}
                    caption={caption}
                    imageSrc={
                      selectedPreview.isVideo
                        ? activeFile?.dataUrl ?? null
                        : activeCrops["story"] ?? activeFile?.dataUrl ?? null
                    }
                    isVideo={selectedPreview.isVideo}
                    videoSrc={selectedPreview.isVideo ? activeFile?.videoBlobUrl ?? null : null}
                  />
                )}
              </div>
            </div>

            {/* Preview footer */}
            <p className="text-[11px] text-[var(--body-subtle)] mt-3 text-center">
              <Eye className="size-3 inline mr-1" />
              Live preview — updates instantly as you edit. Currently showing{" "}
              <span className="font-medium text-[var(--body)]">{selectedPreview.label}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Utility: form field wrapper ──

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-[var(--body-subtle)] mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
