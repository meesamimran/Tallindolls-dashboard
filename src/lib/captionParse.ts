// ============================================================
// Caption parsing + prompt building for the AI copywriter.
// Shared by the social composer. Keeps DeepSeek text output
// resilient to formatting drift.
// ============================================================

export interface ParsedCaption {
  headline: string;
  primaryText: string;
  hashtags: string;
  cta: string;
}

export type Surface = "feed" | "story" | "ad";

/** Best-effort parse of the AI response into structured fields. */
export function parseGeneratedCopy(raw: string): ParsedCaption {
  const text = raw
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .trim();

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let headline = "";
  let primaryText = "";
  let hashtags = "";
  let cta = "";

  for (const l of lines) {
    if (/^(1[.)]\s*|headline:?\s*|pealkiri:?\s*)/i.test(l)) {
      headline = l.replace(/^(1[.)]\s*|headline:?\s*|pealkiri:?\s*)/i, "").trim();
      continue;
    }
    if (/^(2[.)]\s*|primary\s*text:?\s*|põhitekst:?\s*|body:?\s*|copy:?\s*)/i.test(l)) {
      primaryText = l.replace(/^(2[.)]\s*|primary\s*text:?\s*|põhitekst:?\s*|body:?\s*|copy:?\s*)/i, "").trim();
      continue;
    }
    if (/^(3[.)]\s*|hashtags:?\s*|sildid:?\s*|tags:?\s*)/i.test(l)) {
      hashtags = l.replace(/^(3[.)]\s*|hashtags:?\s*|sildid:?\s*|tags:?\s*)/i, "").trim();
      continue;
    }
    if (/^(4[.)]\s*|call.to.action:?\s*|cta:?\s*|üleskutse:?\s*)/i.test(l)) {
      cta = l.replace(/^(4[.)]\s*|call.to.action:?\s*|cta:?\s*|üleskutse:?\s*)/i, "").trim();
      continue;
    }
    if (/^#/.test(l) && l.split(/\s+/).every((w) => w.startsWith("#"))) {
      hashtags = hashtags ? `${hashtags} ${l}` : l;
      continue;
    }
    if (!headline && l.length <= 60 && !/#/.test(l)) {
      headline = l;
      continue;
    }
    if (
      /\b(shop|visit|discover|explore|buy|get|osta|avasta|tutvu|külasta|vaata|telli)\b/i.test(l) &&
      l.length <= 100
    ) {
      cta = l;
      continue;
    }
    primaryText = primaryText ? `${primaryText}\n${l}` : l;
  }

  if (hashtags && !hashtags.startsWith("#")) {
    hashtags = hashtags
      .split(/[\s,]+/)
      .map((t) => (t.startsWith("#") ? t : `#${t}`))
      .join(" ");
  }

  if (!headline && !primaryText && !hashtags && !cta) {
    const cleanLines = text.split("\n").filter((l) => l.trim());
    if (cleanLines.length === 1) {
      primaryText = cleanLines[0].trim();
    } else if (cleanLines.length >= 2) {
      headline = cleanLines[0].trim().slice(0, 60);
      primaryText = cleanLines.slice(1).join("\n").trim();
    }
  }

  return { headline, primaryText, hashtags, cta };
}

// ------------------------------------------------------------
// Prompt building — brand voice + surface/image-aware context
// ------------------------------------------------------------

export const BRAND_SYSTEM_PROMPT = `You are a professional social media copywriter for TallinnDoll, a premium Estonian fashion brand. Brand voice: elegant, understated, Nordic minimalism. Rules: 1) Write in Estonian using the formal 'Teie' form (never casual 'Sina'). 2) NEVER use the words 'odav', 'allahindlus', 'soodukas'. 3) Use premium fashion vocabulary: elegants, ajatu, kvaliteet, naturaalne, luksuslik. 4) Keep it concise and scannable. 5) Return clean plain text, no markdown.`;

export interface PromptContext {
  collection: string;
  postType: string;
  surface: Surface;
  platform: "facebook" | "instagram";
  language: "Estonian" | "English";
  detail?: string;
  image?: {
    orientation: string;
    brightness: string;
    dominantColor: string;
  };
}

export function buildUserPrompt(ctx: PromptContext): string {
  const langLine =
    ctx.language === "Estonian"
      ? "Write ALL copy in Estonian."
      : "Write in English.";

  const imageLine = ctx.image
    ? `\n- Attached visual: a ${ctx.image.brightness}, ${ctx.image.orientation} image with a dominant tone of ${ctx.image.dominantColor}. Reference the mood/colours of this visual naturally in the copy.`
    : "";

  const detailLine = ctx.detail?.trim()
    ? `\n- Extra details from the user (must incorporate): ${ctx.detail.trim()}`
    : "";

  const base = `Create ${surfaceLabel(ctx.surface)} copy for TallinnDoll:
- Product / Collection: ${ctx.collection}
- Post type: ${ctx.postType}
- Platform: ${ctx.platform === "facebook" ? "Facebook" : "Instagram"}${imageLine}${detailLine}

${langLine}`;

  if (ctx.surface === "ad") {
    return `${base}

This is a PAID AD. Make it conversion-focused. Provide:
1) Headline (max 40 chars, strong hook)
2) Primary text (1–2 punchy sentences that drive action)
3) 3–5 relevant Estonian hashtags
4) Call-to-action button label (2–3 words, e.g. "Osta kohe", "Avasta kollektsioon")`;
  }

  if (ctx.surface === "story") {
    return `${base}

This is a STORY (full-screen 9:16, plain media — no interactive stickers). Provide:
1) Headline: a short 3–5 word overlay text for the image
2) Primary text: a one-line supporting caption
3) 3–5 relevant Estonian hashtags
4) Call-to-action (2–3 words)`;
  }

  return `${base}

Provide:
1) Headline (max 40 chars)
2) Primary text (${ctx.platform === "instagram" ? "under 125" : "under 150"} characters)
3) 3–5 relevant Estonian hashtags
4) Call-to-action`;
}

function surfaceLabel(s: Surface): string {
  return s === "ad" ? "advertising" : s === "story" ? "story" : "social media";
}
