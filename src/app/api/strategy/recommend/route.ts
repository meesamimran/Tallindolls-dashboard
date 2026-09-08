// =============================================================================
// Strategy AI Recommendations — content performance analysis.
// POST /api/strategy/recommend  { posts: PostInsight[], question?: string }
// Sends structured post-performance data to the LLM for strategic analysis.
// Falls back to rule-based logic if all LLM calls fail.
// =============================================================================

import type { PostInsight } from "@/types/index";

const BRAND_STRATEGIST_PROMPT = `You are a senior content strategist for TallinnDoll, an Estonian fashion brand. Brand voice: poetic, warm, playful, feminine and confidence-empowering — selling the feeling, never the product spec. Target audience: style-conscious women 25–45.

Your role is to analyze the performance of published social media posts (Instagram and Facebook) and give actionable recommendations. Focus on:
1. Which types of content perform best (formats, themes, captions).
2. What patterns you see in the data (do images vs carousels do better? short vs long captions?).
3. What the brand should post MORE of, LESS of, or CHANGE.
4. Best posting time/cadence observations.
5. Any specific advice tailored to a premium fashion audience.

Rules:
- Be specific and data-driven. Reference actual metrics when possible.
- Keep Estonian context in mind: address the customer as "Sina"/"Sa" (never "Teie"), first-person "Meie", and no discount words like "odav" or "allahindlus" (use a promo code + "% off" for sales instead).
- Structure your answer as 3–6 bullet-point recommendations, each 1–2 sentences.
- End with a 1-sentence overall summary.
- Use plain text, no markdown formatting.`;

function buildPostsSummary(posts: PostInsight[]): string {
  if (posts.length === 0) return "No published posts to analyze.";

  const totalLike = posts.reduce((s, p) => s + p.metrics.likes, 0);
  const totalComment = posts.reduce((s, p) => s + p.metrics.comments, 0);
  const totalReach = posts.reduce((s, p) => s + p.metrics.reach, 0);
  const totalEng = posts.reduce((s, p) => s + p.metrics.engagement, 0);
  const ig = posts.filter((p) => p.platform === "instagram");
  const fb = posts.filter((p) => p.platform === "facebook");

  const top3 = [...posts]
    .sort((a, b) => b.metrics.engagement - a.metrics.engagement)
    .slice(0, 3);

  return `Content performance summary:
- Total posts: ${posts.length} (IG: ${ig.length}, FB: ${fb.length})
- Combined reach: ${totalReach.toLocaleString()}, total likes: ${totalLike.toLocaleString()}, comments: ${totalComment.toLocaleString()}, engagements: ${totalEng.toLocaleString()}
- Top 3 posts by engagement:
${top3
  .map(
    (p, i) =>
      `  ${i + 1}. [${p.platform}] "${(p.caption || "").slice(0, 80)}" — ${p.metrics.engagement} eng, ${p.metrics.reach} reach, ${p.metrics.likes} likes`
  )
  .join("\n")}
- Avg engagement per post: ${posts.length ? Math.round(totalEng / posts.length) : 0}
- Avg reach per post: ${posts.length ? Math.round(totalReach / posts.length) : 0}`;
}

function fallbackRecommendation(posts: PostInsight[]): {
  recommendations: string[];
  summary: string;
} {
  if (posts.length === 0) {
    return {
      recommendations: [
        "No published posts found yet. Start by posting consistently — aim for 3–5 posts per week across Instagram and Facebook.",
        "Use TallinnDoll's M1 composer to generate Estonian brand-voice captions and format assets for every surface.",
        "For premium fashion, carousel posts and Reels typically drive higher engagement than single images — test both.",
      ],
      summary: "Start publishing consistently. We'll provide data-driven recommendations once you have a post history.",
    };
  }

  const avgEng = Math.round(
    posts.reduce((s, p) => s + p.metrics.engagement, 0) / posts.length
  );
  const igAvg = posts.filter((p) => p.platform === "instagram").length
    ? Math.round(
        posts
          .filter((p) => p.platform === "instagram")
          .reduce((s, p) => s + p.metrics.engagement, 0) /
          posts.filter((p) => p.platform === "instagram").length
      )
    : 0;
  const fbAvg = posts.filter((p) => p.platform === "facebook").length
    ? Math.round(
        posts
          .filter((p) => p.platform === "facebook")
          .reduce((s, p) => s + p.metrics.engagement, 0) /
          posts.filter((p) => p.platform === "facebook").length
      )
    : 0;

  const topPlatform = igAvg >= fbAvg ? "Instagram" : "Facebook";
  const platformAdvice =
    igAvg >= fbAvg
      ? `Instagram is currently outperforming Facebook (${igAvg} vs ${fbAvg} avg engagement). Double down on IG feed+story content.`
      : `Facebook is currently outperforming Instagram (${fbAvg} vs ${igAvg} avg engagement). Continue investing in FB while testing IG content.`;

  return {
    recommendations: [
      `${platformAdvice}`,
      `Your top-performing posts average ${avgEng} engagements. Aim to replicate the caption style and format of your best posts.`,
      "For premium Estonian fashion: behind-the-scenes, craftsmanship details, and collection storytelling tend to resonate most with your audience.",
      "Test posting at different times and compare engagement — use this data to find your audience's peak activity window.",
      "Review and refresh underperforming posts with new visuals or captions instead of starting from scratch.",
    ],
    summary: `Based on ${posts.length} published posts: ${topPlatform} is your stronger platform. Focus on high-engagement formats (carousels, Reels) and consistent emotion-first captions in the Estonian "Sina/Sa" voice.`,
  };
}

export async function POST(request: Request) {
  try {
    const { posts, question } = (await request.json()) as {
      posts?: PostInsight[];
      question?: string;
    };

    const postList = posts ?? [];
    const postsSummary = buildPostsSummary(postList);

    const userPrompt = question
      ? `${postsSummary}\n\nUser question: ${question}`
      : `${postsSummary}\n\nAnalyze this data and give me content strategy recommendations for TallinnDoll.`;

    // Try OpenAI first, then DeepSeek, then fallback
    let result: string | null = null;

    // 1) OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const openAiRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.OPENAI_MODEL || "gpt-4o-mini",
              messages: [
                { role: "system", content: BRAND_STRATEGIST_PROMPT },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
              max_tokens: 600,
            }),
          }
        );
        if (openAiRes.ok) {
          const json = await openAiRes.json();
          result = json.choices?.[0]?.message?.content?.trim() || null;
        }
      } catch {
        // continue to fallback
      }
    }

    // 2) DeepSeek fallback
    if (!result && process.env.DEEPSEEK_API_KEY) {
      try {
        const dsRes = await fetch(
          "https://api.deepseek.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: [
                { role: "system", content: BRAND_STRATEGIST_PROMPT },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
              max_tokens: 600,
            }),
          }
        );
        if (dsRes.ok) {
          const json = await dsRes.json();
          result = json.choices?.[0]?.message?.content?.trim() || null;
        }
      } catch {
        // continue to fallback
      }
    }

    // 3) Parse LLM result or use fallback
    if (result) {
      const lines = result
        .split("\n")
        .map((l) => l.replace(/^[•\-\*\d]+[.)]\s*/, "").trim())
        .filter((l) => l.length > 10);

      const summaryLine =
        lines.length > 0 ? lines[lines.length - 1] : result.slice(0, 150);
      const recs = lines.slice(0, -1).length > 0 ? lines.slice(0, -1) : lines;

      return Response.json({
        recommendations: recs.length > 0 ? recs : [result],
        summary: summaryLine,
      });
    }

    // No LLM available — use rule-based fallback
    const fallback = fallbackRecommendation(postList);
    return Response.json(fallback);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Strategy analysis failed" },
      { status: 500 }
    );
  }
}
