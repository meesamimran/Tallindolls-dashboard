// =============================================================================
// Instagram publishing — Graph API 2-step flow (container -> publish).
// POST /api/publish/instagram  { imageUrl, caption?, isStory? }
// Feed: image + caption. Story: media_type=STORIES (plain media, no caption).
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

async function pollContainer(containerId: string): Promise<void> {
  // Image containers are usually ready instantly; poll briefly to be safe.
  for (let i = 0; i < 10; i++) {
    const res = await fetch(
      `${GRAPH}/${V}/${containerId}?fields=status_code&access_token=${TOKEN}`
    );
    const json = await res.json();
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
      throw new Error(`Container ${json.status_code}`);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  // fall through — attempt publish anyway (images often skip status)
}

export async function POST(request: Request) {
  if (!IG_USER_ID || !TOKEN) {
    return Response.json(
      { error: "Missing IG_USER_ID or META_USER_TOKEN in server env" },
      { status: 500 }
    );
  }

  try {
    const { imageUrl, caption, isStory } = await request.json();
    if (!imageUrl) {
      return Response.json({ error: "imageUrl is required" }, { status: 400 });
    }

    // 1) create container
    const containerParams: Record<string, string> = {
      image_url: imageUrl,
      access_token: TOKEN,
    };
    if (isStory) {
      containerParams.media_type = "STORIES";
    } else if (caption) {
      containerParams.caption = caption;
    }

    const container = await graphPost(`${IG_USER_ID}/media`, containerParams);

    // 2) wait until processed
    await pollContainer(container.id);

    // 3) publish
    const published = await graphPost(`${IG_USER_ID}/media_publish`, {
      creation_id: container.id,
      access_token: TOKEN,
    });

    return Response.json({
      id: published.id,
      permalink: `https://www.instagram.com/`,
      platform: "instagram",
      surface: isStory ? "story" : "feed",
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Publish failed" },
      { status: 500 }
    );
  }
}
