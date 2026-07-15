// =============================================================================
// Instagram Carousel publishing — single post with swipeable slides.
// POST /api/publish/carousel  { imageUrls: string[], caption?, platform }
// Flow: create children → wait → create CAROUSEL parent → publish
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
    throw new Error(json?.error?.message || `Graph error ${res.status}`);
  }
  return json;
}

async function waitForFinish(containerId: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(
      `${GRAPH}/${V}/${containerId}?fields=status_code&access_token=${TOKEN}`
    );
    const json = await res.json();
    if (json.status_code === "FINISHED") return "FINISHED";
    if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
      throw new Error(`Container ${json.status_code}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for container");
}

export async function POST(request: Request) {
  if (!IG_USER_ID || !TOKEN) {
    return Response.json(
      { error: "Missing IG_USER_ID or META_USER_TOKEN" },
      { status: 500 }
    );
  }

  try {
    const { imageUrls, caption } = await request.json();
    if (!imageUrls || imageUrls.length < 2) {
      return Response.json(
        { error: "At least 2 imageUrls required for carousel" },
        { status: 400 }
      );
    }

    // 1) create child containers (all must be square — same aspect ratio)
    const childIds: string[] = [];
    for (const url of imageUrls) {
      const child = await graphPost(`${IG_USER_ID}/media`, {
        image_url: url,
        is_carousel_item: "true",
        access_token: TOKEN,
      });
      await waitForFinish(child.id);
      childIds.push(child.id);
    }

    // 2) create the CAROUSEL parent container
    const carousel = await graphPost(`${IG_USER_ID}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: caption || "",
      access_token: TOKEN,
    });
    await waitForFinish(carousel.id);

    // 3) publish
    const published = await graphPost(`${IG_USER_ID}/media_publish`, {
      creation_id: carousel.id,
      access_token: TOKEN,
    });

    return Response.json({
      id: published.id,
      permalink: "https://www.instagram.com/",
      platform: "instagram",
      surface: "carousel",
      slideCount: imageUrls.length,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Carousel publish failed" },
      { status: 500 }
    );
  }
}
