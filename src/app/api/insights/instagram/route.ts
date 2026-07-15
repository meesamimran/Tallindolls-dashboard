// =============================================================================
// Instagram Content Insights — published media performance.
// GET /api/insights/instagram
// Reads real post metrics from our IG test account: latest media + per-post
// insights (reach, impressions, saves, engagement).
// =============================================================================

const V = process.env.META_GRAPH_VERSION || "v25.0";
const IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.META_USER_TOKEN;
const GRAPH = "https://graph.facebook.com";

interface IgMediaItem {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

function extractMetric(data: { name: string; values?: { value?: number }[] }[] | undefined, name: string): number {
  if (!data) return 0;
  const m = data.find((d) => d.name === name);
  return m?.values?.[0]?.value ?? 0;
}

async function fetchInsightsForMedia(mediaId: string): Promise<{
  reach: number;
  impressions: number;
  saves: number;
  engagement: number;
}> {
  try {
    const res = await fetch(
      `${GRAPH}/${V}/${mediaId}/insights?metric=reach,impressions,saves,total_interactions&period=lifetime&access_token=${TOKEN}`
    );
    const json = await res.json();
    const data = json.data;
    return {
      reach: extractMetric(data, "reach"),
      impressions: extractMetric(data, "impressions"),
      saves: extractMetric(data, "saves"),
      engagement: extractMetric(data, "total_interactions"),
    };
  } catch {
    return { reach: 0, impressions: 0, saves: 0, engagement: 0 };
  }
}

export async function GET() {
  if (!IG_USER_ID || !TOKEN) {
    return Response.json(
      { error: "Missing IG_USER_ID or META_USER_TOKEN in server env" },
      { status: 500 }
    );
  }

  try {
    // 1) fetch latest media
    const mediaRes = await fetch(
      `${GRAPH}/${V}/${IG_USER_ID}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&access_token=${TOKEN}`
    );
    const mediaJson = await mediaRes.json();

    if (!mediaRes.ok) {
      throw new Error(mediaJson?.error?.message || `Graph error ${mediaRes.status}`);
    }

    const mediaList: IgMediaItem[] = mediaJson.data ?? [];

    // 2) enrich each post with insights in parallel
    const posts = await Promise.all(
      mediaList.map(async (m) => {
        const insights = await fetchInsightsForMedia(m.id);
        return {
          id: m.id,
          platform: "instagram" as const,
          caption: m.caption ?? "",
          mediaUrl: m.media_url ?? "",
          permalink: m.permalink ?? "",
          mediaType: m.media_type ?? "",
          timestamp: m.timestamp ?? "",
          metrics: {
            likes: m.like_count ?? 0,
            comments: m.comments_count ?? 0,
            reach: insights.reach,
            impressions: insights.impressions,
            saves: insights.saves,
            engagement: insights.engagement,
          },
        };
      })
    );

    return Response.json({ posts });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Instagram insights" },
      { status: 500 }
    );
  }
}
