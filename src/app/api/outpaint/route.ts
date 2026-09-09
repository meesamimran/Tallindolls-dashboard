// =============================================================================
// AI Outpainting — expands image canvas & fills new areas naturally.
// POST /api/outpaint  { imageDataUrl, maskDataUrl, width, height, prompt }
//
// Uses Replicate stability-ai/stable-diffusion-inpainting.
// The client builds a padded canvas (original placed, padding black) as
// `imageDataUrl` and a black/white `maskDataUrl` (white = fill, black = keep).
// `width`/`height` must be a multiple of 64 and ≤1024 (enforced by the model).
// When the token is not set, returns { available: false } gracefully (HTTP 200).
// =============================================================================

const REPLICATE_KEY = process.env.REPLICATE_API_TOKEN;
const GRAPH = "https://api.replicate.com";

export async function POST(request: Request) {
  if (!REPLICATE_KEY) {
    return Response.json(
      { available: false, error: "REPLICATE_API_TOKEN not configured" },
      { status: 200 }
    );
  }

  try {
    const { imageDataUrl, maskDataUrl, width, height, prompt } =
      await request.json();
    if (!imageDataUrl) {
      return Response.json({ error: "imageDataUrl is required" }, { status: 400 });
    }
    if (!maskDataUrl) {
      return Response.json({ error: "maskDataUrl is required" }, { status: 400 });
    }

    const strip = (s: string) => s.replace(/^data:image\/\w+;base64,/, "");

    const body = {
      version:
        "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
      input: {
        image: `data:image/jpeg;base64,${strip(imageDataUrl)}`,
        mask: `data:image/png;base64,${strip(maskDataUrl)}`,
        prompt: `Extend the background seamlessly. ${prompt || "elegant fashion photo, studio background, natural lighting, seamless extension"}`,
        negative_prompt:
          "distorted, blurry, warped, cut person, stretched, text, watermark, bad quality",
        width: Math.max(64, Math.min(1024, width || 512)),
        height: Math.max(64, Math.min(1024, height || 512)),
        num_inference_steps: 50,
        guidance_scale: 7.5,
        num_outputs: 1,
      },
    };

    const res = await fetch(`${GRAPH}/v1/predictions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${REPLICATE_KEY}`,
        Prefer: "wait",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    if (!res.ok) {
      return Response.json(
        { available: true, error: `Replicate: ${json.detail || json.title || res.status}` },
        { status: 200 }
      );
    }

    const output = json.output?.[0] || json.output;
    if (!output || typeof output !== "string") {
      return Response.json(
        { available: true, error: "No output from outpainting" },
        { status: 200 }
      );
    }

    const imgRes = await fetch(output);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const dataUrl = `data:${imgRes.headers.get("content-type") || "image/jpeg"};base64,${buffer.toString("base64")}`;

    return Response.json({ imageDataUrl: dataUrl, available: true });
  } catch (err) {
    return Response.json(
      {
        available: true,
        error: err instanceof Error ? err.message : "Outpainting failed",
      },
      { status: 200 }
    );
  }
}
