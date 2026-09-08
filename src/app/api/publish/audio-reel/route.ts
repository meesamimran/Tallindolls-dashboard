// =============================================================================
// Audio Reel Publishing — image + song → Instagram & Facebook Reels.
//
// POST /api/publish/audio-reel
//
// Option A (direct audio URL):
//   { imageUrl, audioUrl, audioName?, caption? }
//
// Option B (Deezer free search — interim workflow):
//   { imageUrl, songName, audioName?, caption? }
//   Searches Deezer for a free 30s preview, merges with image via FFmpeg,
//   cross-posts to both platforms with custom audio label.
//
// Prerequisites:
//   - ffmpeg binary installed on server
//   - npm install fluent-ffmpeg
//   - .env: IG_USER_ID, META_USER_TOKEN, FB_PAGE_ID, FB_PAGE_ACCESS_TOKEN
// =============================================================================

import { NextResponse } from "next/server";
import { publishAudioReel } from "@/lib/audioReelService";

export async function POST(request: Request) {
  const IG_USER_ID = process.env.IG_USER_ID;
  const META_USER_TOKEN = process.env.META_USER_TOKEN;
  const FB_PAGE_ID = process.env.FB_PAGE_ID;
  const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

  const missing: string[] = [];
  if (!IG_USER_ID) missing.push("IG_USER_ID");
  if (!META_USER_TOKEN) missing.push("META_USER_TOKEN");
  if (!FB_PAGE_ID) missing.push("FB_PAGE_ID");
  if (!FB_PAGE_ACCESS_TOKEN) missing.push("FB_PAGE_ACCESS_TOKEN");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  let body: {
    imageUrl?: string;
    audioUrl?: string;
    songName?: string;
    audioName?: string;
    caption?: string;
    targetPlatforms?: ("instagram" | "facebook")[];
    mediaType?: "reel" | "story";
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { imageUrl, audioUrl, songName, audioName, caption } = body;

  // imageUrl is always required
  if (!imageUrl || !imageUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "imageUrl must be a public HTTPS URL" },
      { status: 400 }
    );
  }

  // Either audioUrl OR songName required
  if (!audioUrl && !songName) {
    return NextResponse.json(
      {
        error: "Either audioUrl or songName is required",
        usage: {
          direct: { imageUrl: "https://...", audioUrl: "https://...", audioName: "Artist - Song" },
          deezer: { imageUrl: "https://...", songName: "Coldplay Yellow" },
        },
      },
      { status: 400 }
    );
  }

  console.log("🎵 Audio Reel publish started");
  console.log("  imageUrl:", imageUrl.slice(0, 80));
  if (songName) console.log("  songName:", songName);
  if (audioUrl) console.log("  audioUrl:", audioUrl.slice(0, 80));

  const result = await publishAudioReel({
    imageUrl,
    audioUrl: audioUrl || undefined,
    songName: songName || undefined,
    audioName: audioName || undefined,
    caption: caption || undefined,
    igUserId: IG_USER_ID as string,
    userToken: META_USER_TOKEN as string,
    fbPageId: FB_PAGE_ID as string,
    fbPageToken: FB_PAGE_ACCESS_TOKEN as string,
    targetPlatforms: body.targetPlatforms || undefined,
    mediaType: body.mediaType || "reel",
  });

  const anyOk = result.instagram || result.facebook;
  if (result.errors.length > 0) {
    console.warn("⚠️ Audio Reel partial errors:", result.errors);
  }
  if (!anyOk) {
    console.error("❌ Audio Reel publish failed:", result.errors);
    return NextResponse.json(
      { ok: false, errors: result.errors, videoUrl: result.videoUrl, track: result.track },
      { status: 500 }
    );
  }

  console.log("✅ Audio Reel published — IG:", !!result.instagram, "FB:", !!result.facebook);
  return NextResponse.json({
    ok: true,
    instagram: result.instagram,
    facebook: result.facebook,
    videoUrl: result.videoUrl,
    track: result.track,
    errors: result.errors,
  });
}
