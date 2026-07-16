// =============================================================================
// Facebook Page publishing (+ Reels support).
// POST /api/publish/facebook  { imageUrl, message?, isStory?, isVideo?, thumb? }
// Feed     → /{page}/photos
// Story    → unpublished photo → /{page}/photo_stories
// Reel     → /{page}/video_reels (start → upload → thumb → finish)
// Requires a PAGE access token.
// =============================================================================

const V = process.env.META_GRAPH_VERSION || "v25.0";
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GRAPH = "https://graph.facebook.com";

async function graphPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${V}/${path}`, {
    method: "POST",
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Graph error ${res.status}`);
  }
  return json;
}

// Convert data: URLs to public Cloudinary URLs if needed
async function ensurePublicUrl(maybeDataUrl: string): Promise<string> {
  if (!maybeDataUrl.startsWith("data:")) return maybeDataUrl;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("Cloudinary not configured");

  const [header, base64] = maybeDataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), "upload." + (mime === "image/png" ? "png" : "jpg"));
  form.append("upload_preset", preset);
  const up = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  const upJson = await up.json();
  if (!upJson.secure_url) throw new Error("Cloudinary upload failed");
  return upJson.secure_url as string;
}

export async function POST(request: Request) {
  if (!FB_PAGE_ID || !PAGE_TOKEN) {
    return Response.json(
      { error: "Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in server env" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { imageUrl, message, isStory, isVideo, thumb } = body;

    console.log("=== Facebook Publish Debug ===");
    console.log("isVideo:", isVideo, "isStory:", isStory);
    console.log("imageUrl (first 100 chars):", typeof imageUrl === "string" ? imageUrl.slice(0, 100) : imageUrl);
    console.log("thumb (first 100 chars):", typeof thumb === "string" ? thumb.slice(0, 100) : thumb);

    if (!imageUrl) {
      return Response.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const publicImageUrl = await ensurePublicUrl(imageUrl);
    const publicThumb = thumb ? await ensurePublicUrl(thumb) : undefined;

    console.log("publicImageUrl (first 100 chars):", publicImageUrl.slice(0, 100));
    console.log("publicThumb (first 100 chars):", publicThumb?.slice(0, 100));
    console.log("===============================");

    // ── Facebook Video (story = reel, feed = feed video) ──
    if (isVideo) {
      // Both reel (story) and feed video use the /videos endpoint.
      // isStory controls whether description is included.
      const formData = new FormData();
      formData.append("access_token", PAGE_TOKEN);
      formData.append("file_url", publicImageUrl);
      if (message && !isStory) formData.append("description", message);

      console.log("Publishing video to Facebook /videos (isStory:", isStory, ")");
      const publishRes = await fetch(`${GRAPH}/${V}/${FB_PAGE_ID}/videos`, {
        method: "POST",
        body: formData,
      });
      const publishJson = await publishRes.json();
      console.log("Facebook /videos response:", publishRes.status, JSON.stringify(publishJson).slice(0, 200));

      if (!publishRes.ok) {
        throw new Error(publishJson?.error?.message || `FB video publish failed (${publishRes.status})`);
      }

      return Response.json({
        id: publishJson.id || publishJson.video_id,
        permalink: `https://www.facebook.com/${FB_PAGE_ID}`,
        platform: "facebook",
        surface: isStory ? "reel" : "feed",
      });
    }

    // ── Story (image) ──
    if (isStory) {
      const photo = await graphPost(`${FB_PAGE_ID}/photos`, {
        url: publicImageUrl,
        published: "false",
        access_token: PAGE_TOKEN,
      });
      const story = await graphPost(`${FB_PAGE_ID}/photo_stories`, {
        photo_id: photo.id,
        access_token: PAGE_TOKEN,
      });
      return Response.json({
        id: story.post_id || story.id || photo.id,
        permalink: `https://www.facebook.com/${FB_PAGE_ID}`,
        platform: "facebook",
        surface: "story",
      });
    }

    // ── Feed post (image) ──
    const params: Record<string, string> = {
      url: publicImageUrl,
      access_token: PAGE_TOKEN,
    };
    if (message) params.message = message;
    const json = await graphPost(`${FB_PAGE_ID}/photos`, params);

    return Response.json({
      id: json.post_id || json.id,
      permalink: `https://www.facebook.com/${FB_PAGE_ID}`,
      platform: "facebook",
      surface: "feed",
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
