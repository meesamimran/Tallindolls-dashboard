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

async function fetchInsightsForMedia(mediaId: string, isVideo: boolean): Promise<{
  reach: number;
  impressions: number;
  saves: number;
  shares: number;
  views: number;
  engagement: number;
}> {
  try {
    // `reach`, `saved`, `shares` and `total_interactions` are valid for all IG media.
    // `views` is only available for videos/reels.
    // `impressions` was deprecated for IG media from v22.0 onwards.
    const metrics = isVideo
      ? "reach,saved,shares,total_interactions,views"
      : "reach,saved,shares,total_interactions";
    const res = await fetch(
      `${GRAPH}/${V}/${mediaId}/insights?metric=${metrics}&period=lifetime&access_token=${TOKEN}`
    );
    const json = await res.json();
    const data = json.data;
    return {
      reach: extractMetric(data, "reach"),
      impressions: 0, // deprecated for IG media
      saves: extractMetric(data, "saved"),
      shares: extractMetric(data, "shares"),
      views: extractMetric(data, "views"),
      engagement: extractMetric(data, "total_interactions"),
    };
  } catch {
    return { reach: 0, impressions: 0, saves: 0, shares: 0, views: 0, engagement: 0 };
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
        const isVideo = m.media_type === "VIDEO" || m.media_type === "REELS";
        const insights = await fetchInsightsForMedia(m.id, isVideo);
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
            shares: insights.shares,
            reach: insights.reach,
            impressions: insights.impressions,
            saves: insights.saves,
            engagement: insights.engagement,
            views: insights.views,
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
