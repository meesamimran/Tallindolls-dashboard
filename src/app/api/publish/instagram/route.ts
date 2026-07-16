// =============================================================================
// Instagram publishing — Graph API (+ Reels support).
// POST /api/publish/instagram  { imageUrl, caption?, isStory?, isVideo?, coverUrl? }
// Feed: image + caption (media_type omitted).
// Story: media_type=STORIES (plain media).
// Reel:  media_type=REELS, video_url + cover_url, poll 30s intervals.
// =============================================================================

const V = process.env.META_GRAPH_VERSION || "v25.0";
const IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.META_USER_TOKEN;
const GRAPH = "https://graph.facebook.com";

async function graphPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${V}/${path}`, {
    method: "POST",
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `Graph error ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}/${V}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Graph error ${res.status}`);
  }
  return json;
}

async function pollContainer(containerId: string, isVideo: boolean): Promise<void> {
  // Start fast, then gradually increase delay.
  // Images usually ready in <5s. Videos take longer but Meta
  // processes them progressively — quick first check catches fast paths.
  const delays = isVideo
    ? [5000, 8000, 10000, 15000, 15000, 15000, 15000, 15000, 15000, 15000]
    : [1000, 1500, 1500, 2000, 2000, 2000, 2000, 2000, 2000, 2000];

  for (let i = 0; i < delays.length; i++) {
    await new Promise((r) => setTimeout(r, delays[i]));
    const json = await graphGet(`${containerId}`, {
      fields: "status_code",
      access_token: TOKEN!,
    });
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
      throw new Error(`Container ${json.status_code}`);
    }
  }
  // fall through — attempt publish anyway
}

// Ensure URL is a public HTTPS URL. Meta API rejects data: URLs.
async function ensurePublicUrl(maybeDataUrl: string): Promise<string> {
  if (!maybeDataUrl.startsWith("data:")) return maybeDataUrl;
  // Upload data URL to Cloudinary
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("Cloudinary not configured for data URL upload");

  const [header, base64] = maybeDataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });

  const form = new FormData();
  form.append("file", blob, "upload." + (mime === "image/png" ? "png" : "jpg"));
  form.append("upload_preset", preset);
  const up = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const upJson = await up.json();
  if (!upJson.secure_url) throw new Error("Cloudinary upload failed for data URL");
  return upJson.secure_url as string;
}

export async function POST(request: Request) {
  if (!IG_USER_ID || !TOKEN) {
    return Response.json(
      { error: "Missing IG_USER_ID or META_USER_TOKEN in server env" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { imageUrl, caption, isStory, isVideo, coverUrl } = body;

    console.log("=== Instagram Publish Debug ===");
    console.log("isVideo:", isVideo, "isStory:", isStory);
    console.log("imageUrl (first 100 chars):", typeof imageUrl === "string" ? imageUrl.slice(0, 100) : imageUrl);
    console.log("coverUrl (first 100 chars):", typeof coverUrl === "string" ? coverUrl.slice(0, 100) : coverUrl);

    if (!imageUrl) {
      return Response.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // Ensure all URLs are public HTTPS (not data: URLs)
    const publicImageUrl = await ensurePublicUrl(imageUrl);
    const publicCoverUrl = coverUrl ? await ensurePublicUrl(coverUrl) : undefined;

    console.log("publicImageUrl (first 100):", publicImageUrl.slice(0, 100));
    console.log("publicCoverUrl (first 100):", publicCoverUrl?.slice(0, 100));
    console.log("===============================");

    // 1) Create container
    const containerParams: Record<string, string> = {
      access_token: TOKEN,
    };

    if (isVideo) {
      // ── Reels: video_url + cover_url ──
      containerParams.media_type = "REELS";
      containerParams.video_url = publicImageUrl;
      if (publicCoverUrl) containerParams.cover_url = publicCoverUrl;
      if (caption) containerParams.caption = caption;
      containerParams.share_to_feed = "true";
    } else if (isStory) {
      // ── Story: image ──
      containerParams.media_type = "STORIES";
      containerParams.image_url = publicImageUrl;
    } else {
      // ── Feed: image ──
      containerParams.image_url = publicImageUrl;
      if (caption) containerParams.caption = caption;
    }

    const container = await graphPost(`${IG_USER_ID}/media`, containerParams);

    // 2) Wait until processed
    await pollContainer(container.id, Boolean(isVideo));

    // 3) Publish
    const published = await graphPost(`${IG_USER_ID}/media_publish`, {
      creation_id: container.id,
      access_token: TOKEN,
    });

    return Response.json({
      id: published.id,
      permalink: `https://www.instagram.com/`,
      platform: "instagram",
      surface: isVideo ? "reel" : isStory ? "story" : "feed",
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
