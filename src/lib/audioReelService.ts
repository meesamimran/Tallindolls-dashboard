// =============================================================================
// Audio Reel Service — Deezer free audio + FFmpeg merge + Meta cross-posting.
//
// Flow: User inputs song name + uploads image →
//       1. Search Deezer for free 30s preview track
//       2. FFmpeg: merge image + audio into static H.264/AAC .mp4
//       3. Cross-post to Instagram Reels (with custom audio_name) & Facebook
//
// Requires: ffmpeg binary on server (`apt install ffmpeg`).
//           npm install fluent-ffmpeg
// =============================================================================

import { writeFile, unlink, mkdir, readFile, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function require(module: string): any;

// ── Types ──

export interface DeezerTrack {
  songTitle: string;
  artistName: string;
  audioUrl: string; // 30s high-quality MP3 preview from Deezer
}

export interface AudioReelConfig {
  /** Public URL of the image (Cloudinary or any HTTPS CDN) */
  imageUrl: string;
  /** Direct public audio URL (skip Deezer). Takes priority over songName. */
  audioUrl?: string;
  /** Song name to search on Deezer. Used when audioUrl is not provided. */
  songName?: string;
  /** Override the auto-detected audio title. Default: "${artistName} - ${songTitle}" */
  audioName?: string;
  /** Caption for the Reel */
  caption?: string;
  /** Instagram Business Account ID */
  igUserId: string;
  /** Instagram/Facebook User access token */
  userToken: string;
  /** Facebook Page ID */
  fbPageId: string;
  /** Facebook Page access token */
  fbPageToken: string;
}

export interface AudioReelResult {
  ok: boolean;
  instagram?: { id: string; permalink: string };
  facebook?: { id: string; permalink: string };
  videoUrl?: string;
  /** Resolved audio track info (from Deezer or manual) */
  track?: DeezerTrack;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════
// PHASE 1: Deezer Free Public Track Search (no auth required)
// ═══════════════════════════════════════════════════════════════

const DEEZER_API = "https://api.deezer.com";

/**
 * Search Deezer's public API for a free 30-second preview track.
 * No API key required — Deezer's search endpoint is open.
 *
 * @param songName — e.g. "Coldplay Yellow" or "Shape of You"
 * @returns { songTitle, artistName, audioUrl } or null if no match
 */
export async function fetchFreeAudioTrack(
  songName: string
): Promise<DeezerTrack | null> {
  try {
    const url = `${DEEZER_API}/search?q=${encodeURIComponent(songName)}&limit=1`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`Deezer search failed (${res.status})`);
      return null;
    }

    const json = await res.json();
    const tracks = json?.data as any[];

    if (!tracks || tracks.length === 0) {
      console.warn(`No Deezer results for: "${songName}"`);
      return null;
    }

    const track = tracks[0];
    const previewUrl = track.preview as string;

    if (!previewUrl) {
      console.warn(`No preview available for: "${track.title}" by ${track.artist?.name}`);
      return null;
    }

    return {
      songTitle: track.title as string,
      artistName: track.artist?.name as string || "Unknown Artist",
      audioUrl: previewUrl,
    };
  } catch (err) {
    console.error("Deezer search error:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: FFmpeg Static Video Creator (image + audio → .mp4)
// ═══════════════════════════════════════════════════════════════

// ── Constants ──

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v25.0";
const GRAPH = "https://graph.facebook.com";

// ── Step 1: FFmpeg — Merge image + audio into static .mp4 ──

async function createStaticVideo(
  imagePath: string,
  audioPath: string,
  outputPath: string
): Promise<void> {
  // Verify input files exist and have content
  for (const [label, p] of [["image", imagePath], ["audio", audioPath]] as const) {
    try {
      const s = await stat(p);
      console.log(`  ${label} file: ${p} (${(s.size / 1024).toFixed(1)} KB)`);
      if (s.size === 0) throw new Error(`${label} file is empty`);
    } catch (err) {
      throw new Error(
        `${label} file error: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  // Shell-based ffmpeg — uses cmd.exe on Windows for proper path handling
  // Quotes around all paths handle spaces/special characters
  const cmd =
    `ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" ` +
    `-c:v libx264 -pix_fmt yuv420p -c:a aac -shortest -y "${outputPath}"`;

  console.log("  ffmpeg cmd:", cmd);

  try {
    const { stderr } = await execAsync(cmd, { timeout: 120000 }); // 2 min timeout
    if (stderr) console.log("  ffmpeg:", stderr.slice(-200));
    console.log("  ffmpeg: success");
  } catch (err: any) {
    const stderr = err.stderr || "";
    const tail = stderr.slice(-500);
    console.error("  ffmpeg stderr:", tail);

    // If libx264 not available, try mpeg4 fallback
    if (tail.includes("libx264") || tail.includes("Invalid argument")) {
      console.log("  libx264 failed, trying mpeg4 fallback...");
      const fallbackCmd =
        `ffmpeg -loop 1 -i "${imagePath}" -i "${audioPath}" ` +
        `-c:v mpeg4 -q:v 2 -pix_fmt yuv420p -c:a aac -shortest -y "${outputPath}"`;

      try {
        const { stderr: fbStderr } = await execAsync(fallbackCmd, { timeout: 120000 });
        if (fbStderr) console.log("  ffmpeg mpeg4:", fbStderr.slice(-200));
        console.log("  ffmpeg mpeg4: success");
        return;
      } catch (fbErr: any) {
        throw new Error(
          `ffmpeg failed (both libx264 and mpeg4): ${(fbErr.stderr || fbErr.message).slice(-400)}`
        );
      }
    }

    throw new Error(`ffmpeg failed: ${tail}`);
  }
}

// ── Step 2: Download file from URL to temp disk ──

async function downloadToTemp(url: string, ext: string): Promise<string> {
  console.log(`  Downloading ${ext}: ${url.slice(0, 100)}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download ${ext} from ${url.slice(0, 80)} (status ${res.status})`
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());

  // Validate downloaded content
  if (buffer.length === 0) {
    throw new Error(`Downloaded ${ext} is empty (0 bytes) from ${url.slice(0, 80)}`);
  }

  console.log(`  Downloaded ${ext}: ${(buffer.length / 1024).toFixed(1)} KB`);

  const tempDir = join(tmpdir(), "audio-reel");
  await mkdir(tempDir, { recursive: true });

  const filePath = join(tempDir, `${randomUUID()}.${ext}`);
  await writeFile(filePath, buffer);

  console.log(`  Saved to: ${filePath}`);
  return filePath;
}

// ── Step 3: Upload result video to Cloudinary ──

async function uploadToCloudinary(filePath: string): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("Cloudinary not configured");

  const buffer = await readFile(filePath);
  const blob = new Blob([buffer], { type: "video/mp4" });
  const form = new FormData();
  form.append("file", blob, "audio-reel.mp4");
  form.append("upload_preset", preset);

  const up = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/video/upload`,
    { method: "POST", body: form }
  );
  const json = await up.json();
  if (!json.secure_url) throw new Error("Cloudinary video upload failed");
  return json.secure_url as string;
}

// ── Step 4a: Instagram Reel with audio_name ──

async function publishInstagramReel(params: {
  videoUrl: string;
  audioName: string;
  caption?: string;
  igUserId: string;
  token: string;
}): Promise<{ id: string; permalink: string }> {
  const { videoUrl, audioName, caption, igUserId, token } = params;

  // 1) Create container — CRITICAL: pass audio_name for custom audio title
  const containerRes = await fetch(
    `${GRAPH}/${GRAPH_VERSION}/${igUserId}/media`,
    {
      method: "POST",
      body: new URLSearchParams({
        media_type: "REELS",
        video_url: videoUrl,
        audio_name: audioName, // ← This displays the custom song name on the Reel
        caption: caption || "",
        share_to_feed: "true",
        access_token: token,
      }),
    }
  );
  const containerJson = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(
      `IG container failed: ${containerJson?.error?.message || containerRes.status}`
    );
  }
  const containerId = containerJson.id;

  // 2) Poll until video is processed (max ~2 min)
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 10000)); // 10s intervals
    const statusRes = await fetch(
      `${GRAPH}/${GRAPH_VERSION}/${containerId}?fields=status_code&access_token=${token}`
    );
    const statusJson = await statusRes.json();
    if (statusJson.status_code === "FINISHED") break;
    if (statusJson.status_code === "ERROR" || statusJson.status_code === "EXPIRED") {
      throw new Error(`IG container ${statusJson.status_code}`);
    }
  }

  // 3) Publish
  const publishRes = await fetch(
    `${GRAPH}/${GRAPH_VERSION}/${igUserId}/media_publish`,
    {
      method: "POST",
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: token,
      }),
    }
  );
  const publishJson = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(
      `IG publish failed: ${publishJson?.error?.message || publishRes.status}`
    );
  }

  return {
    id: publishJson.id,
    permalink: `https://www.instagram.com/`,
  };
}

// ── Step 4b: Facebook Reel (3-phase upload) ──

async function publishFacebookReel(params: {
  videoPath: string;
  caption?: string;
  fbPageId: string;
  pageToken: string;
}): Promise<{ id: string; permalink: string }> {
  const { videoPath, caption, fbPageId, pageToken } = params;

  // Phase 1: Start upload session
  const startRes = await fetch(
    `${GRAPH}/${GRAPH_VERSION}/${fbPageId}/video_reels`,
    {
      method: "POST",
      body: new URLSearchParams({
        access_token: pageToken,
        upload_phase: "start",
      }),
    }
  );
  const startJson = await startRes.json();
  if (!startRes.ok) {
    // video_reels may fail due to permissions → fallback to /videos
    if (startJson?.error?.code === 200 || startJson?.error?.type === "OAuthException") {
      return publishFacebookVideoFallback({ videoPath, caption, fbPageId, pageToken });
    }
    throw new Error(
      `FB reel start failed: ${startJson?.error?.message || startRes.status}`
    );
  }

  const { video_id, upload_url } = startJson;
  if (!video_id || !upload_url) {
    // No upload_url → use fallback
    return publishFacebookVideoFallback({ videoPath, caption, fbPageId, pageToken });
  }

  // Phase 2: Upload video binary
  const videoBuffer = await readFile(videoPath);

  const uploadRes = await fetch(upload_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(videoBuffer.byteLength),
    },
    body: videoBuffer,
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`FB reel upload failed: ${errText.slice(0, 200)}`);
  }

  // Phase 3: Finish and publish
  const params_ = new URLSearchParams({
    access_token: pageToken,
    video_id,
    upload_phase: "finish",
    video_state: "PUBLISHED",
  });
  if (caption) params_.append("description", caption);

  const finishRes = await fetch(
    `${GRAPH}/${GRAPH_VERSION}/${fbPageId}/video_reels`,
    { method: "POST", body: params_ }
  );
  const finishJson = await finishRes.json();
  if (!finishRes.ok) {
    throw new Error(
      `FB reel finish failed: ${finishJson?.error?.message || finishRes.status}`
    );
  }

  return {
    id: finishJson.id || finishJson.video_id || video_id,
    permalink: `https://www.facebook.com/${fbPageId}`,
  };
}

// ── Fallback: Facebook /videos endpoint (when video_reels not available) ──

async function publishFacebookVideoFallback(params: {
  videoPath: string;
  caption?: string;
  fbPageId: string;
  pageToken: string;
}): Promise<{ id: string; permalink: string }> {
  const { videoPath, caption, fbPageId, pageToken } = params;

  // Upload the video to Cloudinary first for public URL
  const videoUrl = await uploadToCloudinary(videoPath);

  const formData = new FormData();
  formData.append("access_token", pageToken);
  formData.append("file_url", videoUrl);
  if (caption) formData.append("description", caption);

  const res = await fetch(`${GRAPH}/${GRAPH_VERSION}/${fbPageId}/videos`, {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`FB video fallback failed: ${json?.error?.message || res.status}`);
  }

  return {
    id: json.id || json.video_id,
    permalink: `https://www.facebook.com/${fbPageId}`,
  };
}

// ── Step 5: Cleanup temp files ──

async function cleanup(...paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      await unlink(p);
    } catch {
      // File may not exist — ignore
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN — Cross-platform audio reel publishing
// ═══════════════════════════════════════════════════════════════

export async function publishAudioReel(
  config: AudioReelConfig
): Promise<AudioReelResult> {
  const errors: string[] = [];
  let imagePath = "";
  let audioPath = "";
  let videoPath = "";

  try {
    // ── Resolve audio source ──
    let audioUrl: string;
    let audioName: string;
    let track: DeezerTrack | null = null;

    if (config.audioUrl) {
      // Direct URL provided — use as-is
      audioUrl = config.audioUrl;
      audioName = config.audioName || "Custom Audio";
    } else if (config.songName) {
      // Search Deezer for free 30s preview track
      console.log(`🔍 Searching Deezer for: "${config.songName}"`);
      track = await fetchFreeAudioTrack(config.songName);

      if (!track || !track.audioUrl) {
        return {
          ok: false,
          errors: [
            `No free preview track found on Deezer for "${config.songName}". ` +
            `Try a different search or provide a direct audioUrl.`,
          ],
        };
      }

      audioUrl = track.audioUrl;
      audioName = config.audioName || `${track.artistName} - ${track.songTitle}`;
      console.log(`✅ Found: ${track.artistName} - ${track.songTitle}`);
      console.log(`   Preview: ${track.audioUrl.slice(0, 60)}...`);
    } else {
      return {
        ok: false,
        errors: ["Either audioUrl or songName must be provided."],
      };
    }

    // 1) Download image & audio to temp disk
    imagePath = await downloadToTemp(config.imageUrl, "jpg");
    audioPath = await downloadToTemp(audioUrl, "mp3");

    // 2) Merge into static MP4 via FFmpeg (image loops for audio duration)
    videoPath = join(tmpdir(), "audio-reel", `${randomUUID()}.mp4`);
    await createStaticVideo(imagePath, audioPath, videoPath);

    // 3) Upload merged video to Cloudinary for public URL
    const publicVideoUrl = await uploadToCloudinary(videoPath);

    // 4) Publish to both platforms in parallel
    const fbDescription = [config.caption, `🎵 ${audioName}`]
      .filter(Boolean)
      .join("\n\n");

    const [igResult, fbResult] = await Promise.allSettled([
      publishInstagramReel({
        videoUrl: publicVideoUrl,
        audioName, // ← Custom audio title from Deezer/input
        caption: config.caption,
        igUserId: config.igUserId,
        token: config.userToken,
      }),
      publishFacebookReel({
        videoPath,
        caption: fbDescription,
        fbPageId: config.fbPageId,
        pageToken: config.fbPageToken,
      }),
    ]);

    // 5) Cleanup temp files
    await cleanup(imagePath, audioPath, videoPath);

    // 6) Collect results
    const result: AudioReelResult = {
      ok: false,
      errors: [],
      track: track || undefined,
      videoUrl: publicVideoUrl,
    };

    if (igResult.status === "fulfilled") {
      result.instagram = igResult.value;
      result.ok = true;
    } else {
      errors.push(`Instagram: ${igResult.reason?.message || igResult.reason}`);
    }

    if (fbResult.status === "fulfilled") {
      result.facebook = fbResult.value;
      result.ok = true;
    } else {
      errors.push(`Facebook: ${fbResult.reason?.message || fbResult.reason}`);
    }

    result.videoUrl = publicVideoUrl;
    result.errors = errors;
    return result;
  } catch (err) {
    // Cleanup on failure
    await cleanup(imagePath, audioPath, videoPath);
    return {
      ok: false,
      errors: [err instanceof Error ? err.message : "Unknown error"],
    };
  }
}
