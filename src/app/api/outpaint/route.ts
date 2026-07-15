// =============================================================================
// AI Outpainting — expands image canvas & fills new areas naturally.
// POST /api/outpaint  { imageDataUrl, targetWidth, targetHeight, prompt }
//
// Uses Replicate stable-diffusion-inpainting (pay-per-use, free tier available).
// When token is not set, returns { available: false } gracefully (HTTP 200).
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
    const { imageDataUrl, targetWidth, targetHeight, prompt } =
      await request.json();
    if (!imageDataUrl) {
      return Response.json({ error: "imageDataUrl is required" }, { status: 400 });
    }

    const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, "");

    const body = {
      version:
        "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
      input: {
        image: `data:image/jpeg;base64,${base64}`,
        prompt: `Extend the background seamlessly. ${prompt || "elegant fashion photo, studio background, natural lighting, seamless extension"}`,
        negative_prompt:
          "distorted, blurry, warped, cut person, stretched, text, watermark, bad quality",
        width: targetWidth,
        height: targetHeight,
        strength: 0.8,
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
