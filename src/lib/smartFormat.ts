// ============================================================
// Smart Format Engine — AI-guided image formatting.
//
// Tier 1 (<5% ratio diff):   smart crop (instant, model-safe).
// Tier 2 (5-15% diff):       blur-fill (instant, soft background).
// Tier 3 (>15% diff):        Cloudinary AI gen expand (FREE ~25 imgs/mo)
//                             → fallback: blur-fill if AI unavailable.
// Replicate premium:          auto-used if REPLICATE_API_TOKEN is set.
//
// Model 100% intact across all tiers — never cut.
// ============================================================

import { loadImage, cropToPreset, type FormatPreset } from "./imageFormats";

// ---- helpers ----

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ---- Cloudinary AI Generative Expand (FREE ~25/mo) ----

async function cloudinaryAiExpand(
  originalDataUrl: string,
  width: number,
  height: number
): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloud || !preset) throw new Error("No Cloudinary config");

  // 1) upload the original image (clean, no pre-processing)
  const form = new FormData();
  form.append("file", dataUrlToBlob(originalDataUrl));
  form.append("upload_preset", preset);
  const up = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    { method: "POST", body: form }
  );
  const upJson = await up.json();
  if (!upJson.public_id) throw new Error("Cloudinary upload failed");

  // 2) AI generative expand via URL transformation
  //    c_pad   = keep original inside, pad to fit target
  //    b_gen_fill = AI fills padded areas with natural background
  const expandUrl =
    `https://res.cloudinary.com/${cloud}/image/upload/` +
    `c_pad,w_${width},h_${height},b_gen_fill/` +
    `${upJson.public_id}.jpg`;

  // 3) fetch the expanded image
  const imgRes = await fetch(expandUrl);
  if (!imgRes.ok) throw new Error("Cloudinary expand failed");

  return blobToDataUrl(await imgRes.blob());
}

// ---- Replicate outpainting (premium, auto if token is set) ----

async function replicateOutpaint(
  imageDataUrl: string,
  prompt: string
): Promise<string> {
  const res = await fetch("/api/outpaint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl, prompt }),
  });
  const json = await res.json();
  if (json.available === false) throw new Error("REPLICATE_UNAVAILABLE");
  if (!json.imageDataUrl) throw new Error(json.error || "Replicate failed");
  return json.imageDataUrl;
}

// ---- main smart format ----

interface SmartResult {
  dataUrl: string;
  method: "contain-fit" | "smart-crop" | "outpainting";
}

export async function formatImageSmart(
  originalSrc: string,
  preset: FormatPreset,
  opts?: {
    onStage?: (stage: string) => void;
    description?: string;
  }
): Promise<SmartResult> {
  const img = await loadImage(originalSrc);

  const targetRatio = preset.width / preset.height;
  const srcRatio = img.width / img.height;
  const ratioDiff =
    Math.abs(targetRatio - srcRatio) / Math.max(targetRatio, srcRatio);

  // --- tier 1: close match → smart crop (model-safe, instant) ---
  if (ratioDiff < 0.05) {
    opts?.onStage?.("Smart crop (ratio matches)…");
    return { dataUrl: cropToPreset(img, preset), method: "smart-crop" };
  }

  // --- instant contain-fit (blur-fill, always safe baseline) ---
  const contain = cropToPreset(img, preset);

  // --- tier 2: moderate → blur-fill good enough ---
  if (ratioDiff < 0.15) {
    opts?.onStage?.("Soft background (model intact)…");
    return { dataUrl: contain, method: "contain-fit" };
  }

  // --- tier 3: large difference → AI expand ---

  // Try Replicate first (premium, better quality) if token is likely set
  try {
    opts?.onStage?.("AI expand (Replicate)…");
    const prompt = [
      opts?.description,
      "elegant fashion photo, studio background, seamless extension, keep model untouched",
    ]
      .filter(Boolean)
      .join(", ");
    const out = await replicateOutpaint(contain, prompt);
    opts?.onStage?.("");
    return { dataUrl: out, method: "outpainting" };
  } catch {
    // Replicate unavailable (no token or no credit) → try Cloudinary free tier
  }

  try {
    opts?.onStage?.("AI expand (Cloudinary free)…");
    const out = await cloudinaryAiExpand(
      originalSrc,
      preset.width,
      preset.height
    );
    opts?.onStage?.("");
    return { dataUrl: out, method: "outpainting" };
  } catch {
    // Cloudinary AI also unavailable → blur-fill fallback
  }

  opts?.onStage?.("");
  return { dataUrl: contain, method: "contain-fit" };
}

/** Quick sync check — does this preset need smart expand? */
export function needsSmartFormat(
  img: HTMLImageElement,
  preset: FormatPreset
): boolean {
  const targetRatio = preset.width / preset.height;
  const srcRatio = img.width / img.height;
  const diff =
    Math.abs(targetRatio - srcRatio) / Math.max(targetRatio, srcRatio);
  return diff > 0.1;
}
