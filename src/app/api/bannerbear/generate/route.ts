// =============================================================================
// Bannerbear Image Generation API
// POST /api/bannerbear/generate
// Body: { template, modifications }
// Returns: { ok, imageUrl, uid }
// =============================================================================

const BANNERBEAR_API_KEY = process.env.BANNERBEAR_API_KEY;
const BASE_URL = "https://sync.api.bannerbear.com/v2";

interface Modification {
  name: string;
  text?: string;
  image_url?: string;
  color?: string;
  background?: string;
  font_family?: string;
}

export async function POST(request: Request) {
  if (!BANNERBEAR_API_KEY) {
    return Response.json(
      { error: "BANNERBEAR_API_KEY not set in .env.local" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { template, modifications } = body as {
      template?: string;
      modifications?: Modification[];
    };

    const templateId = template || process.env.BANNERBEAR_TEMPLATE_ID;

    if (!templateId) {
      return Response.json(
        { error: "template is required (or set BANNERBEAR_TEMPLATE_ID in .env)" },
        { status: 400 }
      );
    }

    if (!modifications || !Array.isArray(modifications) || modifications.length === 0) {
      return Response.json(
        { error: "modifications array is required" },
        { status: 400 }
      );
    }

    console.log("🎨 Bannerbear: generating with template", templateId.slice(0, 12) + "...");
    console.log("🎨 Bannerbear: modifications:", JSON.stringify(modifications).slice(0, 200));

    const res = await fetch(`${BASE_URL}/images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BANNERBEAR_API_KEY}`,
      },
      body: JSON.stringify({
        template: templateId,
        modifications,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      console.error("🎨 Bannerbear error:", json);
      return Response.json(
        { error: json?.message || `Bannerbear error ${res.status}` },
        { status: res.status }
      );
    }

    console.log("🎨 Bannerbear: generated →", json.image_url || json.uid);

    return Response.json({
      ok: true,
      imageUrl: json.image_url,
      imageUrlJpg: json.image_url_jpg,
      imageUrlPng: json.image_url_png,
      uid: json.uid,
      template: templateId,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Bannerbear generation failed" },
      { status: 500 }
    );
  }
}
