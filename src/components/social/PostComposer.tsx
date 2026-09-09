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
  Wand2,
  Check,
  ArrowRight,
  Hash,
  Type,
  Layers,
  Share2,
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

function previewOptionsFor(isVideo: boolean, placements: ("feed" | "story")[]): PreviewOption[] {
  if (isVideo) {
    const opts: PreviewOption[] = [];
    if (placements.includes("feed")) opts.push({ id: "facebook-feed-video", label: "Facebook Feed Video", platform: "facebook", surface: "feed", isVideo: true });
    if (placements.includes("story")) {
      opts.push({ id: "facebook-reel", label: "Facebook Reel", platform: "facebook", surface: "story", isVideo: true });
      opts.push({ id: "instagram-reel", label: "Instagram Reel", platform: "instagram", surface: "story", isVideo: true });
    }
    return opts.length > 0 ? opts : [
      { id: "facebook-reel", label: "Facebook Reel", platform: "facebook", surface: "story", isVideo: true },
      { id: "instagram-reel", label: "Instagram Reel", platform: "instagram", surface: "story", isVideo: true },
    ];
  }
  // Images — feed or story based on placement selection
  const opts: PreviewOption[] = [];
  if (placements.includes("feed")) {
    opts.push({ id: "facebook-feed", label: "Facebook Feed", platform: "facebook", surface: "feed", isVideo: false });
    opts.push({ id: "instagram-feed", label: "Instagram Feed", platform: "instagram", surface: "feed", isVideo: false });
  }
  if (placements.includes("story")) {
    opts.push({ id: "facebook-reel", label: "Facebook Story", platform: "facebook", surface: "story", isVideo: false });
    opts.push({ id: "instagram-reel", label: "Instagram Story", platform: "instagram", surface: "story", isVideo: false });
  }
  return opts.length > 0 ? opts : [
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
  // Two-step mode
  mode?: "edit" | "preview";
  onNext?: (data: {
    imageSrc: string | null;
    isVideo: boolean;
    videoSrc: string | null;
    caption: Caption;
    selectedPreviewLabel: string;
    surface: string;
    targetPlatforms: string[];
    carouselSlides?: { formatted: string | null; isVideo?: boolean; videoBlobUrl?: string | null }[];
    carouselIdx?: number;
    mediaFilesCount?: number;
  }) => void;
  onBack?: () => void;
  // Pre-fill from draft (when editing from History)
  initialDraft?: {
    caption?: Caption;
    imageDataUrl?: string;
    platform?: string;
    surface?: string;
  };
  // Increment to force a full reset of all composer state
  resetKey?: number;
  // Increment to trigger publish from outside (PreviewScreen)
  triggerPublish?: number;
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
  mode = "edit",
  onNext,
  onBack,
  initialDraft,
  resetKey,
  triggerPublish,
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

  // ── Publish targeting ──
  const [targetPlatforms, setTargetPlatforms] = useState<("instagram" | "facebook")[]>([
    "instagram",
    "facebook",
  ]);
  const [targetPlacements, setTargetPlacements] = useState<("feed" | "story")[]>(["feed"]);

  // ── Derive current preview option ──
  const previewOptions = useMemo(() => previewOptionsFor(isVideo, targetPlacements), [isVideo, targetPlacements]);
  const selectedPreview = useMemo(
    () => previewOptions.find((o) => o.id === selectedPreviewId) ?? previewOptions[0],
    [previewOptions, selectedPreviewId]
  );
  const surface = selectedPreview.surface;
  const platform = selectedPreview.platform;
  const showDeviceToggle = !isVideo || selectedPreviewId === "facebook-feed-video";

  // Sync placement chips with preview selection
  useEffect(() => {
    if (surface === "story" && !targetPlacements.includes("story")) {
      setTargetPlacements(["story"]);
    } else if (surface === "feed" && !targetPlacements.includes("feed")) {
      setTargetPlacements(["feed"]);
    }
  }, [surface]);

  // Sync preview dropdown with platform selection (bidirectional)
  useEffect(() => {
    const hasIG = targetPlatforms.includes("instagram");
    const hasFB = targetPlatforms.includes("facebook");
    // If only one platform selected, pick a preview option for that platform
    if (hasFB && !hasIG) {
      const fbOpt = previewOptions.find((o) => o.platform === "facebook");
      if (fbOpt && selectedPreviewId.includes("instagram")) {
        setSelectedPreviewId(fbOpt.id);
      }
    } else if (hasIG && !hasFB) {
      const igOpt = previewOptions.find((o) => o.platform === "instagram");
      if (igOpt && selectedPreviewId.includes("facebook") && !selectedPreviewId.includes("feed-video")) {
        setSelectedPreviewId(igOpt.id);
      }
    }
  }, [targetPlatforms]);

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

  // ── Keep format key synced + safe zone for story ──
  useEffect(() => {
    if (surface === "story") {
      setActiveFormatKey("story");
      // Push subject lower — top 20% is Instagram's text overlay zone
      if (focusY === 0.5) setFocusY(0.38);
    } else {
      setActiveFormatKey("square");
      if (focusY < 0.4) setFocusY(0.5); // Restore default
    }
  }, [surface]);

  // ── Pre-fill from draft (edit from History) ──
  useEffect(() => {
    if (!initialDraft) return;
    if (initialDraft.caption) {
      setCaption(initialDraft.caption);
    }
    // Load draft image if available
    if (initialDraft.imageDataUrl && !mediaFiles.length) {
      const dataUrl = initialDraft.imageDataUrl;
      // Create a mock FileEntry for the pre-existing image
      const id = `draft-${Date.now()}`;
      setMediaFiles([
        {
          id,
          file: new File([], "draft-image.jpg", { type: "image/jpeg" }),
          dataUrl,
          isVideo: false,
          crops: {},
        },
      ]);
      // Load image for preview
      (async () => {
        try {
          const img = await loadImage(dataUrl);
          imgElRef.current = img;
        } catch { /* */ }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraft?.imageDataUrl]);

  // ── Full reset when resetKey changes (after successful publish) ──
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      handleReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // ── Trigger publish from outside (PreviewScreen) ──
  useEffect(() => {
    if (triggerPublish !== undefined && triggerPublish > 0 && hasMedia) {
      handlePublish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerPublish]);

  // ── Auto-switch to video preview on video upload ──
  useEffect(() => {
    if (isVideo) {
      setSelectedPreviewId("instagram-reel");
    } else {
      // When switching to image, pick a valid image option based on placements
      const imageOpts = previewOptionsFor(false, targetPlacements);
      setSelectedPreviewId((prev) => {
        const stillValid = imageOpts.find((o) => o.id === prev);
        return stillValid ? prev : imageOpts[0]?.id || "instagram-feed";
      });
    }
  }, [isVideo]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // ── Keep preview in sync with placement changes ──
  useEffect(() => {
    const validIds = new Set(previewOptions.map((o) => o.id));
    if (!validIds.has(selectedPreviewId)) {
      setSelectedPreviewId(previewOptions[0]?.id || "instagram-feed");
    }
  }, [previewOptions, selectedPreviewId]);

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
            focusX,
            focusY,
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

  // Strip label prefixes that might leak from AI response or manual input
  const cleanField = (s: string) =>
    s.replace(/^(headline|primary\s*text|body\s*text|body|copy|hashtags|cta|call\s*to\s*action):?\s*/i, "").trim();

  const captionText = () =>
    [cleanField(caption.headline), cleanField(caption.primaryText), caption.hashtags, cleanField(caption.cta)]
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

        // Import smart formatter dynamically
        const { formatImageSmart } = await import("@/lib/smartFormat");

        // Process & upload all slides — run AI smart format on each
        const urls: string[] = [];
        for (let i = 0; i < mediaFiles.length; i++) {
          const slide = mediaFiles[i];
          onUpdatePublishTask(taskId, { message: `🎨 Enhancing slide ${i + 1}/${mediaFiles.length}…` });
          let enhanced = slide.crops["square"] ?? slide.dataUrl;
          // Run AI smart format if needed
          try {
            const preset = FORMAT_PRESETS.find((p) => p.key === "square")!;
            const result = await formatImageSmart(slide.dataUrl, preset, {
              description: caption.headline ? `${caption.headline} fashion photo` : undefined,
            });
            enhanced = result.dataUrl;
          } catch { /* keep original */ }
          const url = await uploadToPublicUrl(enhanced);
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

        // Facebook → create a collage grid and post as single image
        if (targetPlatforms.includes("facebook")) {
          try {
            onUpdatePublishTask(taskId, { message: `🖼️ Creating collage for Facebook…` });
            const loadedImages = await Promise.all(urls.map((u) => loadImage(u)));
            // Create a 2-column grid collage
            const cols = Math.min(loadedImages.length, 2);
            const rows = Math.ceil(loadedImages.length / cols);
            const cellSize = 1080;
            const canvas = document.createElement("canvas");
            canvas.width = cellSize * cols;
            canvas.height = cellSize * rows;
            const ctx = canvas.getContext("2d")!;
            loadedImages.forEach((img, i) => {
              const col = i % cols;
              const row = Math.floor(i / cols);
              ctx.drawImage(img, col * cellSize, row * cellSize, cellSize, cellSize);
            });
            // Use toBlob for large canvases, upload directly to Cloudinary
            const collageBlob: Blob = await new Promise((resolve, reject) => {
              canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))), "image/jpeg", 0.85);
            });
            const fbForm = new FormData();
            fbForm.append("file", collageBlob, "collage.jpg");
            fbForm.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "");
            const fbUp = await fetch(
              `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
              { method: "POST", body: fbForm }
            );
            const fbUpJson = await fbUp.json();
            if (!fbUpJson.secure_url) throw new Error("Collage upload failed");
            const collageUrl = fbUpJson.secure_url;

            const r = await publishPost({
              platform: "facebook",
              surface: "feed",
              imageDataUrl: collageUrl,
              captionText: captionText(),
            });
            if (r.ok) {
              anyOk = true;
              firstUrl = firstUrl ?? r.url;
              msgs.push(`FB — collage posted (${urls.length} images)`);
              onCreatePost(buildPost("published", "facebook", "feed"));
            } else {
              msgs.push(`FB collage failed: ${r.message}`);
            }
          } catch (e) {
            msgs.push(`FB collage error: ${e instanceof Error ? e.message : "Unknown"}`);
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

  const primaryChars = caption.primaryText?.length || 0;
  const totalChars =
    (caption.headline ? caption.headline.length + 2 : 0) +
    primaryChars +
    (caption.hashtags ? caption.hashtags.length + 2 : 0) +
    (caption.cta ? caption.cta.length + 2 : 0);
  const tagMatches = caption.hashtags?.match(/#[a-zA-Z0-9_\u00C0-\u024F]+/g) || [];
  const tagCount = tagMatches.length;

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================ */}
        {/* LEFT COLUMN — Composer (7 cols)                             */}
        {/* ============================================================ */}
        <div className={cn(CARD, "p-5 lg:col-span-6 xl:col-span-6 space-y-5")}>
          {/* Section: AI Caption Generator Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-default)] flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div
                className="size-8 rounded-[2px] flex items-center justify-center text-white shadow-xs"
                style={GRADIENT_BRAND}
              >
                <Sparkles className="size-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-semibold text-[var(--heading)]">
                    AI Copywriter
                  </h2>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)] border border-[var(--brand)]/20 uppercase tracking-wider">
                    TallinnDoll Voice
                  </span>
                </div>
                <p className="text-[12px] text-[var(--body-subtle)] mt-0.5">
                  Placement-aware copy tailored for luxury fashion
                </p>
              </div>
            </div>

            {/* Language Toggle */}
            <div className="inline-flex rounded-[2px] p-0.5 bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)]">
              {(["Estonian", "English"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "px-2.5 py-1 text-[12px] font-medium rounded-[2px] transition-all flex items-center gap-1.5 cursor-pointer",
                    language === lang
                      ? "text-white shadow-xs font-semibold"
                      : "text-[var(--body-subtle)] hover:text-[var(--heading)]"
                  )}
                  style={language === lang ? GRADIENT_BRAND : undefined}
                >
                  <span className="text-[12px]">{lang === "Estonian" ? "🇪🇪" : "🇬🇧"}</span>
                  <span>{lang}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Collection" hint="Active seasonal collection">
              <input
                list="collection-list"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="Type or select…"
                className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none transition-colors focus:border-[var(--brand)]"
                style={INPUT_STYLE}
              />
              <datalist id="collection-list">
                {collections.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Post Type" hint="Campaign objective">
              <input
                list="posttype-list"
                value={postType}
                onChange={(e) => setPostType(e.target.value)}
                placeholder="Type or select…"
                className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none transition-colors focus:border-[var(--brand)]"
                style={INPUT_STYLE}
              />
              <datalist id="posttype-list">
                {postTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
          </div>

          {/* Detail / context */}
          <Field
            label="Creative Brief & Context (Optional)"
            hint="Describe materials, styling vibe, price point, or promotional offers"
          >
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={2}
              placeholder="e.g. Silk midi dress with contrast belt, golden hour outdoor shoot in Tallinn, 15% pre-order gift code..."
              className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none resize-none transition-colors focus:border-[var(--brand)]"
              style={INPUT_STYLE}
            />
          </Field>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white rounded-[2px] transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 shadow-xs cursor-pointer"
            style={GRADIENT_BRAND}
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wand2 className="size-4" />
            )}
            {generating
              ? "Crafting Brand Copy…"
              : `Generate ${surface === "story" ? "Story Copy" : "Caption"}`}
          </button>

          {genError && (
            <p className="text-[12px] text-[var(--danger)] bg-[var(--danger)]/10 px-3 py-2 rounded-[2px] border border-[var(--danger)]/20">
              {genError}
            </p>
          )}

          {/* ── Editable caption fields ── */}
          <div className="space-y-3.5 pt-3 border-t border-[var(--border-default)]">
            <Field
              label="Headline"
              rightAccessory={
                <span className="text-[11px] text-[var(--body-subtle)]">
                  {caption.headline?.length || 0} chars
                </span>
              }
            >
              <input
                value={caption.headline}
                onChange={(e) => setCaption({ ...caption, headline: e.target.value })}
                placeholder="Catchy headline for the post (e.g. New in: Linen Elegance)"
                className="w-full px-3 py-2 text-[13px] font-medium rounded-[2px] focus:outline-none transition-colors focus:border-[var(--brand)]"
                style={INPUT_STYLE}
              />
            </Field>

            <Field
              label="Caption Body"
              rightAccessory={
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      primaryChars > 2200
                        ? "text-[var(--danger)] font-bold"
                        : primaryChars > 2000
                          ? "text-amber-500 font-semibold"
                          : "text-[var(--body-subtle)]"
                    )}
                  >
                    {primaryChars.toLocaleString()} / 2,200 chars
                  </span>
                </div>
              }
            >
              <textarea
                value={caption.primaryText}
                onChange={(e) => setCaption({ ...caption, primaryText: e.target.value })}
                rows={4}
                placeholder="Main caption — emojis, styling advice, product highlights, and mentions..."
                className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none resize-none transition-colors focus:border-[var(--brand)] leading-relaxed"
                style={INPUT_STYLE}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Hashtags"
                rightAccessory={
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      tagCount > 30 ? "text-[var(--danger)] font-bold" : "text-[var(--body-subtle)]"
                    )}
                  >
                    {tagCount} / 30 tags
                  </span>
                }
              >
                <input
                  value={caption.hashtags}
                  onChange={(e) => setCaption({ ...caption, hashtags: e.target.value })}
                  placeholder="#tallindoll #nordicfashion #estoniandesign"
                  className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none transition-colors focus:border-[var(--brand)]"
                  style={{ ...INPUT_STYLE, color: "var(--brand)" }}
                />
              </Field>

              <Field label="Call to Action (CTA)">
                <input
                  value={caption.cta}
                  onChange={(e) => setCaption({ ...caption, cta: e.target.value })}
                  placeholder="Avasta e-poest →"
                  className="w-full px-3 py-2 text-[13px] rounded-[2px] focus:outline-none transition-colors focus:border-[var(--brand)]"
                  style={INPUT_STYLE}
                />
              </Field>
            </div>

            {/* Quick CTA suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-[var(--body-subtle)] tracking-wider mr-1">
                Suggestions:
              </span>
              {[
                "Avasta e-poest →",
                "Link biograafias 🔗",
                "Shop collection online →",
                "Saadaval Tallinna stuudios",
              ].map((ctaText) => (
                <button
                  key={ctaText}
                  type="button"
                  onClick={() => setCaption((c) => ({ ...c, cta: ctaText }))}
                  className="text-[11px] px-2 py-0.5 rounded-[2px] bg-[var(--neutral-secondary-medium)] hover:bg-[var(--brand-softer)] text-[var(--body)] hover:text-[var(--brand)] border border-[var(--border-default)] transition-colors cursor-pointer"
                >
                  {ctaText}
                </button>
              ))}
            </div>
          </div>

          {/* ── Publish-to targeting card (Meta Business Suite Standard) ── */}
          <div className="p-4 rounded-[2px] bg-[var(--neutral-secondary-medium)] border border-[var(--border-default)] space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="size-3.5 text-[var(--brand)]" />
                <span className="text-[12px] font-bold text-[var(--heading)] uppercase tracking-wider">
                  Publish Destinations
                </span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-[2px] bg-[var(--neutral-tertiary)] text-[var(--body)]">
                {targets.length} placement{targets.length !== 1 ? "s" : ""} selected
              </span>
            </div>

            {/* Platform Selection Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Instagram Card */}
              {(() => {
                const on = targetPlatforms.includes("instagram");
                return (
                  <button
                    type="button"
                    onClick={() => setTargetPlatforms((prev) => toggleIn(prev, "instagram"))}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-[2px] border text-left transition-all cursor-pointer",
                      on
                        ? "border-[var(--brand)] bg-[var(--brand-softer)] shadow-xs"
                        : "border-[var(--border-default)] bg-[var(--neutral-primary-soft)] hover:border-[var(--border-default-medium)]"
                    )}
                  >
                    <div className="size-6 rounded-[4px] bg-gradient-to-tr from-[#fd5949] via-[#d6249f] to-[#285AEB] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="none">
                        <rect width="20" height="20" x="2" y="2" rx="5" stroke="currentColor" strokeWidth="2" />
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[var(--heading)] leading-tight truncate">
                        Instagram
                      </p>
                      <p className="text-[10px] text-[var(--body-subtle)] truncate">
                        @tallinndolls
                      </p>
                    </div>
                    <div
                      className={cn(
                        "size-4 rounded-[2px] flex items-center justify-center text-white text-[10px]",
                        on ? "bg-[var(--brand)]" : "border border-[var(--border-default-strong)]"
                      )}
                    >
                      {on && <Check className="size-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })()}

              {/* Facebook Card */}
              {(() => {
                const on = targetPlatforms.includes("facebook");
                return (
                  <button
                    type="button"
                    onClick={() => setTargetPlatforms((prev) => toggleIn(prev, "facebook"))}
                    className={cn(
                      "flex items-center gap-2.5 p-2.5 rounded-[2px] border text-left transition-all cursor-pointer",
                      on
                        ? "border-[#1877F2] bg-[#1877F2]/10 shadow-xs"
                        : "border-[var(--border-default)] bg-[var(--neutral-primary-soft)] hover:border-[var(--border-default-medium)]"
                    )}
                  >
                    <div className="size-6 rounded-[4px] bg-[#1877F2] flex items-center justify-center text-white shrink-0 shadow-xs">
                      <svg viewBox="0 0 24 24" className="size-3.5" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-[var(--heading)] leading-tight truncate">
                        Facebook Page
                      </p>
                      <p className="text-[10px] text-[var(--body-subtle)] truncate">
                        TallinnDoll Official
                      </p>
                    </div>
                    <div
                      className={cn(
                        "size-4 rounded-[2px] flex items-center justify-center text-white text-[10px]",
                        on ? "bg-[#1877F2]" : "border border-[var(--border-default-strong)]"
                      )}
                    >
                      {on && <Check className="size-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })()}
            </div>

            {/* Placement Chips */}
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-default)]">
              <span className="text-[11px] font-semibold text-[var(--body-subtle)] uppercase tracking-wider w-20 shrink-0">
                Placements
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {(["feed", "story"] as const).map((s) => {
                  const on = effectivePlacements.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTargetPlacements((prev) => toggleIn(prev, s))}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-[2px] border transition-all cursor-pointer",
                        on
                          ? "text-white border-transparent shadow-xs"
                          : "text-[var(--body-subtle)] border-[var(--border-default)] hover:bg-[var(--neutral-primary-soft)] hover:text-[var(--heading)]"
                      )}
                      style={on ? GRADIENT_BRAND : undefined}
                    >
                      {s === "feed" ? <ImageIcon className="size-3" /> : <Film className="size-3" />}
                      <span>{s === "feed" ? "Feed Post" : isVideo ? "Reels (9:16)" : "Stories (9:16)"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleAddToQueue}
              disabled={!hasCaption}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold rounded-[2px] border border-[var(--border-default)] text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)] transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Plus className="size-4" />
              Save Draft
            </button>
            {onNext ? (
              <button
                onClick={() =>
                  onNext({
                    imageSrc: previewImage,
                    isVideo,
                    videoSrc: isVideo ? activeFile?.videoBlobUrl ?? null : null,
                    caption,
                    selectedPreviewLabel: selectedPreview.label,
                    surface: selectedPreview.surface,
                    targetPlatforms,
                    carouselSlides: multiSlide ? previewSlides : undefined,
                    carouselIdx: multiSlide ? activeSlideIdx : undefined,
                    mediaFilesCount: mediaFiles.length,
                  })
                }
                disabled={!hasMedia}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded-[2px] transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50 shadow-xs cursor-pointer"
                style={GRADIENT_BRAND}
              >
                <span>Review &amp; Publish</span>
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={hasActiveTasks || !hasCaption || !hasMedia}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-white rounded-[2px] transition-opacity hover:opacity-90 disabled:opacity-50 shadow-xs cursor-pointer"
                style={GRADIENT_BRAND}
                id="publish-trigger"
              >
                {hasActiveTasks ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {hasActiveTasks ? "Publishing…" : "Approve & Publish"}
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN — Live Preview (sticky, 6 cols)                  */}
        {/* ============================================================ */}
        <div className="lg:sticky lg:top-4 lg:col-span-6 xl:col-span-6">
          <div className={cn(CARD, "p-5")}>
            {/* ── Preview header & controls ── */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-3 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[12px] font-bold text-[var(--heading)] uppercase tracking-wider">
                    Live Mockup
                  </span>
                </div>
                {/* Custom dropdown */}
                <PreviewDropdown
                  options={previewOptions}
                  value={selectedPreviewId}
                  onChange={handlePreviewSwitch}
                />
              </div>

              {/* Device toggle (feed previews only) */}
              {showDeviceToggle && (
                <div className="inline-flex rounded-[2px] border border-[var(--border-default)] overflow-hidden bg-[var(--neutral-secondary-medium)] p-0.5">
                  <button
                    onClick={() => setDevice("desktop")}
                    title="Desktop browser view"
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-[2px] transition-colors cursor-pointer",
                      device === "desktop"
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "text-[var(--body-subtle)] hover:text-[var(--heading)]"
                    )}
                  >
                    <Monitor className="size-3.5" />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    title="Mobile app view (iOS titanium shell)"
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-[2px] transition-colors cursor-pointer",
                      device === "mobile"
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "text-[var(--body-subtle)] hover:text-[var(--heading)]"
                    )}
                  >
                    <Smartphone className="size-3.5" />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>
              )}
            </div>

            {/* ── Media info bar ── */}
            {hasMedia && (
              <div className="flex items-center justify-between gap-2 mb-3.5 px-3 py-2 rounded-[2px] bg-[var(--brand-softer)] text-[var(--brand)] text-[12px] font-medium border border-[var(--brand)]/15">
                <div className="flex items-center gap-2 min-w-0">
                  {multiSlide ? (
                    <>
                      <Layers className="size-3.5 shrink-0" />
                      <span className="truncate">
                        Carousel · {mediaFiles.length} slides (Viewing slide {activeSlideIdx + 1})
                      </span>
                    </>
                  ) : isVideo ? (
                    <>
                      <Film className="size-3.5 shrink-0" />
                      <span className="truncate">Video · {selectedPreview.label}</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {activeFile?.file.name} · {activeFile?.width}×{activeFile?.height}px
                      </span>
                    </>
                  )}
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-[var(--brand)]/10 shrink-0">
                  {surface === "story" ? "9:16 Full" : isVideo ? "1:1 Square" : "1:1 Square"}
                </span>
              </div>
            )}

            {/* ── Preview area — single large preview ── */}
            <div className="bg-[var(--neutral-secondary-medium)]/80 rounded-[2px] p-3 sm:p-5 flex items-start justify-center min-h-[480px] border border-[var(--border-default)]">
              <div
                key={fadeKey}
                className="w-full flex justify-center animate-fade-in"
              >
                {mediaLoading ? (
                  <PreviewSkeleton platform={platform} device={device} />
                ) : !hasMedia ? (
                  /* Empty state */
                  <div className="flex flex-col items-center gap-3 text-[var(--body-subtle)] py-16 text-center">
                    <div
                      className="size-14 rounded-full flex items-center justify-center shadow-md"
                      style={GRADIENT_BRAND}
                    >
                      <Eye className="size-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[var(--heading)]">
                        Live Social Post Mockup
                      </p>
                      <p className="text-[13px] text-[var(--body-subtle)] mt-1 max-w-[280px]">
                        Upload an image or video to see the live Meta Business Suite simulation
                      </p>
                    </div>
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
            <p className="text-[11px] text-[var(--body-subtle)] mt-3 text-center flex items-center justify-center gap-1.5">
              <Eye className="size-3 inline shrink-0" />
              <span>
                Real-time preview · Showing <strong className="text-[var(--heading)]">{selectedPreview.label}</strong>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Custom Preview Dropdown ──

function PreviewDropdown({
  options,
  value,
  onChange,
}: {
  options: PreviewOption[];
  value: string;
  onChange: (id: PreviewOptionId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 text-[12px] font-semibold rounded-[2px] text-white transition-opacity hover:opacity-90 shadow-xs cursor-pointer"
        style={GRADIENT_BRAND}
      >
        <span>{selected?.isVideo ? "🎬" : "📷"}</span>
        <span>{selected?.label || "Select Preview"}</span>
        <ChevronDown className="size-3.5 ml-0.5" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1.5 w-[250px] bg-[var(--neutral-primary)] border border-[var(--border-default-strong)] rounded-[2px] shadow-xl overflow-hidden animate-fade-in">
          <div className="p-1.5 space-y-0.5">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-2 text-[12px] font-medium transition-colors flex items-center justify-between rounded-[2px] cursor-pointer",
                  opt.id === value
                    ? "bg-[var(--brand-softer)] text-[var(--brand)] font-semibold"
                    : "text-[var(--heading)] hover:bg-[var(--neutral-secondary-medium)]"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px]">{opt.isVideo ? "🎬" : "📷"}</span>
                  <span>{opt.label}</span>
                </div>
                {opt.id === value && <Check className="size-3.5 stroke-[2.5]" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  rightAccessory,
  children,
}: {
  label: string;
  hint?: string;
  rightAccessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-[12px] font-semibold text-[var(--heading)]">
          {label}
        </label>
        {rightAccessory}
      </div>
      {children}
      {hint && (
        <p className="text-[11px] text-[var(--body-subtle)] mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
