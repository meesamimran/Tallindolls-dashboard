// ============================================================
// Image Formatting — aspect-ratio presets + client-side
// resize (contain-fit, no crop) + download helpers.
// Pure browser APIs (canvas), no dependencies. Client-only.
// ============================================================

export type FormatGroup = "feed" | "story" | "ad";

export interface FormatPreset {
  key: string;
  label: string;
  ratioLabel: string;
  /** width / height */
  ratio: number;
  /** export width in px */
  width: number;
  /** export height in px */
  height: number;
  group: FormatGroup;
  /** where this size is used, for the UI hint */
  usage: string;
  /** which apps & placements this targets */
  platforms: { app: string; placement: string; icon?: string }[];
}

// Meta-recommended publishing sizes (1080px base).
// "Download only" — posting auto-picks the right format based
// on your selected Publish-to targets (Platform × Placement).
export const FORMAT_PRESETS: FormatPreset[] = [
  {
    key: "square",
    label: "Square",
    ratioLabel: "1:1",
    ratio: 1,
    width: 1080,
    height: 1080,
    group: "feed",
    usage: "Facebook & Instagram feed posts",
    platforms: [
      { app: "Instagram", placement: "Feed" },
      { app: "Facebook", placement: "Feed" },
    ],
  },
  {
    key: "portrait",
    label: "Portrait",
    ratioLabel: "4:5",
    ratio: 4 / 5,
    width: 1080,
    height: 1350,
    group: "feed",
    usage: "Instagram feed (max height), Facebook feed",
    platforms: [
      { app: "Instagram", placement: "Feed (tall)" },
      { app: "Facebook", placement: "Feed" },
    ],
  },
  {
    key: "story",
    label: "Story / Reel",
    ratioLabel: "9:16",
    ratio: 9 / 16,
    width: 1080,
    height: 1920,
    group: "story",
    usage: "Stories & Reels (full-screen vertical)",
    platforms: [
      { app: "Instagram", placement: "Story · Reel" },
      { app: "Facebook", placement: "Story · Reel" },
    ],
  },
  {
    key: "ad_landscape",
    label: "Ad — Landscape",
    ratioLabel: "1.91:1",
    ratio: 1200 / 628,
    width: 1200,
    height: 628,
    group: "ad",
    usage: "Facebook & Instagram link/feed ads",
    platforms: [
      { app: "Facebook", placement: "Feed Ad" },
      { app: "Instagram", placement: "Feed Ad" },
    ],
  },
];

export function presetByKey(key: string): FormatPreset {
  return FORMAT_PRESETS.find((p) => p.key === key) ?? FORMAT_PRESETS[0];
}

export function presetsByGroup(group: FormatGroup): FormatPreset[] {
  return FORMAT_PRESETS.filter((p) => p.group === group);
}

// ------------------------------------------------------------
// Image loading
// ------------------------------------------------------------

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ------------------------------------------------------------
// Resize (contain-fit) to a target preset — NOT a crop.
// The whole source image is scaled DOWN to fit inside the target
// box so nothing is cut off. Leftover space is filled with a
// BLURRED copy of the image itself (no white bars, no AI needed).
// focusX/focusY position the image within the padded area.
// ------------------------------------------------------------

export interface CropOptions {
  /** horizontal focus 0 (left) .. 1 (right), default 0.5 */
  focusX?: number;
  /** vertical focus 0 (top) .. 1 (bottom), default 0.5 */
  focusY?: number;
  /** output mime type, default image/jpeg */
  mime?: "image/jpeg" | "image/png";
  /** jpeg quality 0..1, default 0.92 */
  quality?: number;
  /** optional background for contain-fit padded areas */
  background?: string;
  /** contain = model-safe (default). cover = fill-frame (video/Reels). */
  fit?: "contain" | "cover";
}

export function cropToPreset(
  img: HTMLImageElement,
  preset: FormatPreset,
  opts: CropOptions = {}
): string {
  const {
    focusX = 0.5,
    focusY = 0.5,
    mime = "image/jpeg",
    quality = 0.92,
    fit = "contain",
  } = opts;

  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  // ── Cover-fit (video/Reels) — zoom to fill, no padding ──
  if (fit === "cover") {
    const targetRatio = canvas.width / canvas.height;
    const srcRatio = img.width / img.height;
    let sw: number, sh: number;
    if (srcRatio > targetRatio) { sh = img.height; sw = sh * targetRatio; }
    else { sw = img.width; sh = sw / targetRatio; }
    const sx = ((img.width - sw) * focusX);
    const sy = ((img.height - sh) * focusY);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(mime, quality);
  }

  // ── Contain-fit (default) — model-safe, blur background ──
  // 1) Blur-fill background: draw the image tiny, scale it up —
  //    creates a natural Gaussian-blur look. No white bars, no API.
  const BLUR_FACTOR = 10; // 1/10th size ≈ strong blur
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = canvas.width / BLUR_FACTOR;
  blurCanvas.height = canvas.height / BLUR_FACTOR;
  const blurCtx = blurCanvas.getContext("2d");
  if (blurCtx) {
    // cover-fit the image into the tiny blur canvas
    const tgt = canvas.width / canvas.height;
    const src = img.width / img.height;
    let bw: number, bh: number;
    if (src > tgt) {
      bh = blurCanvas.height;
      bw = bh * src;
    } else {
      bw = blurCanvas.width;
      bh = bw / src;
    }
    blurCtx.drawImage(
      img,
      (blurCanvas.width - bw) / 2,
      (blurCanvas.height - bh) / 2,
      bw,
      bh
    );
  }
  // Scale tiny→big for a soft bokeh blur. Slightly dim + saturate
  // so the foreground image pops naturally.
  ctx.filter = "brightness(0.80) saturate(1.1)";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(blurCanvas, 0, 0, canvas.width, canvas.height);
  ctx.filter = "none";

  // 2) Smart contain-fit: the whole source image, centered, on top
  const targetRatio = preset.width / preset.height;
  const srcRatio = img.width / img.height;

  let drawW: number;
  let drawH: number;
  if (srcRatio > targetRatio) {
    drawW = canvas.width;
    drawH = canvas.width / srcRatio;
  } else {
    drawH = canvas.height;
    drawW = canvas.height * srcRatio;
  }

  const dx = clamp((canvas.width - drawW) * focusX, 0, canvas.width - drawW);
  const dy = clamp((canvas.height - drawH) * focusY, 0, canvas.height - drawH);

  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, dx, dy, drawW, drawH);

  return canvas.toDataURL(mime, quality);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ------------------------------------------------------------
// Lightweight image info for image-aware caption context
// (dimensions, orientation, dominant color) — sampled cheaply.
// ------------------------------------------------------------

export interface ImageInfo {
  width: number;
  height: number;
  orientation: "portrait" | "landscape" | "square";
  dominantColor: string;
  brightness: "light" | "dark" | "medium";
}

export function getImageInfo(img: HTMLImageElement): ImageInfo {
  const orientation =
    img.width === img.height
      ? "square"
      : img.width > img.height
      ? "landscape"
      : "portrait";

  // downscale to a tiny canvas and average pixels
  const s = 24;
  const canvas = document.createElement("canvas");
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext("2d");
  let dominantColor = "#888888";
  let brightness: ImageInfo["brightness"] = "medium";

  if (ctx) {
    ctx.drawImage(img, 0, 0, s, s);
    try {
      const { data } = ctx.getImageData(0, 0, s, s);
      let r = 0;
      let g = 0;
      let b = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }
      r = Math.round(r / n);
      g = Math.round(g / n);
      b = Math.round(b / n);
      dominantColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      brightness = lum > 0.65 ? "light" : lum < 0.35 ? "dark" : "medium";
    } catch {
      // getImageData can throw on tainted canvases — ignore, keep defaults
    }
  }

  return { width: img.width, height: img.height, orientation, dominantColor, brightness };
}

function toHex(v: number): string {
  return v.toString(16).padStart(2, "0");
}

// ------------------------------------------------------------
// Download helper
// ------------------------------------------------------------

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ------------------------------------------------------------
// Video helpers
// ------------------------------------------------------------

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

/** Extract the first frame of a video file as a data URL. */
export function extractVideoThumb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadeddata = () => {
      // seek to ~10% for a representative frame
      video.currentTime = Math.min(0.5, video.duration * 0.1 || 0.1);
    };

    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(video, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    // timeout fallback
    setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Video thumbnail timeout"));
    }, 10000);
  });
}

/** Quick video metadata: duration, width, height. */
export async function getVideoMeta(
  file: File
): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const url = URL.createObjectURL(file);
    video.src = url;
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video meta failed"));
    };
  });
}

/** Extract multiple frames from a video at evenly-spaced timestamps.
 *  Returns an array of data URLs (image/jpeg). */
export function extractVideoFrames(
  file: File,
  count: number = 5
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const frames: string[] = [];
    let currentIdx = 0;

    const captureFrame = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
      }
      frames.push(canvas.toDataURL("image/jpeg", 0.85));

      currentIdx++;
      if (currentIdx < count && video.duration > 0) {
        // Seek to next evenly-spaced timestamp
        const nextTime = (video.duration / (count + 1)) * (currentIdx + 1);
        video.currentTime = nextTime;
      } else {
        URL.revokeObjectURL(url);
        resolve(frames);
      }
    };

    video.onloadeddata = () => {
      // Start at 10%
      video.currentTime = Math.min(0.5, video.duration * 0.1 || 0.1);
    };

    video.onseeked = () => {
      captureFrame();
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to extract video frames"));
    };

    // Timeout safety
    setTimeout(() => {
      if (frames.length === 0) {
        URL.revokeObjectURL(url);
        reject(new Error("Frame extraction timeout"));
      }
    }, 30000);
  });
}

/** Extract a thumbnail from a custom file (uploaded image) as data URL. */
export function fileToThumbnailDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Not an image file"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}
