// =============================================================================
// OpenAI proxy — caption generation with optional image vision.
// POST /api/openai  { systemPrompt, userPrompt, imageDataUrl? }
// Keeps the API key server-side. Falls back to text-only when no image.
// =============================================================================

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY not configured on server" },
      { status: 500 }
    );
  }

  try {
    const { systemPrompt, userPrompt, imageDataUrl } = await request.json();

    // Build the user message. When an image is provided, use the multimodal
    // content array so the model actually "looks at" the picture.
    const userContent = imageDataUrl
      ? [
          { type: "text", text: userPrompt },
          { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
        ]
      : userPrompt;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return Response.json(
        { error: `OpenAI API error: ${res.status} ${errText.slice(0, 200)}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim() || "";
    return Response.json({ result: text });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
