// =============================================================================
// Facebook Page publishing.
// POST /api/publish/facebook  { imageUrl, message?, isStory?, thumb? }
// Feed  -> /{page}/photos (single step).
// Story -> upload unpublished photo, then /{page}/photo_stories.
// For videos, include a `thumb` URL to set a custom thumbnail.
// Requires a PAGE access token (not a user token).
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

export async function POST(request: Request) {
  if (!FB_PAGE_ID || !PAGE_TOKEN) {
    return Response.json(
      { error: "Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in server env" },
      { status: 500 }
    );
  }

  try {
    const { imageUrl, message, isStory, thumb } = await request.json();
    if (!imageUrl) {
      return Response.json({ error: "imageUrl is required" }, { status: 400 });
    }

    if (isStory) {
      // 1) upload the photo as UNPUBLISHED to get a photo id
      const photoParams: Record<string, string> = {
        url: imageUrl,
        published: "false",
        access_token: PAGE_TOKEN,
      };
      const photo = await graphPost(`${FB_PAGE_ID}/photos`, photoParams);

      // 2) publish it as a Page Story
      const storyParams: Record<string, string> = {
        photo_id: photo.id,
        access_token: PAGE_TOKEN,
      };
      const story = await graphPost(`${FB_PAGE_ID}/photo_stories`, storyParams);
      const storyId = story.post_id || story.id || photo.id;

      // 3) If a custom thumbnail was provided, try to update the video thumbnail
      if (thumb && storyId) {
        try {
          await graphPost(`${storyId}`, {
            thumb,
            access_token: PAGE_TOKEN,
          });
        } catch {
          // Thumbnail update is best-effort — log but don't fail
          console.warn("Failed to set custom video thumbnail, continuing…");
        }
      }

      return Response.json({
        id: storyId,
        permalink: `https://www.facebook.com/${FB_PAGE_ID}`,
        platform: "facebook",
        surface: "story",
      });
    }

    // Feed post
    const params: Record<string, string> = {
      url: imageUrl,
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
