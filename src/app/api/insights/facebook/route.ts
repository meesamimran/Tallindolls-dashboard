// =============================================================================
// Facebook Page Content Insights — published post performance.
// GET /api/insights/facebook
// Reads real post metrics from our FB test page: recent feed + per-post
// insights (impressions, reach, engaged users, clicks).
// =============================================================================

const V = process.env.META_GRAPH_VERSION || "v25.0";
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GRAPH = "https://graph.facebook.com";

interface FbFeedItem {
  id: string;
  message?: string;
  created_time?: string;
  permalink_url?: string;
  reactions?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
}

function extractMetric(
  data: { name: string; values?: { value?: number }[] }[] | undefined,
  name: string
): number {
  if (!data) return 0;
  const m = data.find((d) => d.name === name);
  return m?.values?.[0]?.value ?? 0;
}

async function fetchInsightsForPost(postId: string): Promise<{
  impressions: number;
  impressionsOrganic: number;
  reach: number;
  engagedUsers: number;
  clicks: number;
}> {
  try {
    const res = await fetch(
      `${GRAPH}/${V}/${postId}/insights?metric=post_impressions,post_impressions_organic,post_reach,post_engaged_users,post_clicks&period=lifetime&access_token=${TOKEN}`
    );
    const json = await res.json();
    const data = json.data;
    return {
      impressions: extractMetric(data, "post_impressions"),
      impressionsOrganic: extractMetric(data, "post_impressions_organic"),
      reach: extractMetric(data, "post_reach"),
      engagedUsers: extractMetric(data, "post_engaged_users"),
      clicks: extractMetric(data, "post_clicks"),
    };
  } catch {
    return { impressions: 0, impressionsOrganic: 0, reach: 0, engagedUsers: 0, clicks: 0 };
  }
}

export async function GET() {
  if (!FB_PAGE_ID || !TOKEN) {
    return Response.json(
      { error: "Missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN in server env" },
      { status: 500 }
    );
  }

  try {
    // 1) fetch latest posts from Page feed
    const feedRes = await fetch(
      `${GRAPH}/${V}/${FB_PAGE_ID}/feed?fields=id,message,created_time,permalink_url,reactions.summary(true),comments.summary(true),shares&access_token=${TOKEN}`
    );
    const feedJson = await feedRes.json();

    if (!feedRes.ok) {
      throw new Error(feedJson?.error?.message || `Graph error ${feedRes.status}`);
    }

    const feed: FbFeedItem[] = feedJson.data ?? [];

    // 2) enrich each post with insights in parallel
    const posts = await Promise.all(
      feed.map(async (item) => {
        const insights = await fetchInsightsForPost(item.id);
        return {
          id: item.id,
          platform: "facebook" as const,
          caption: item.message ?? "",
          mediaUrl: "",
          permalink: item.permalink_url ?? `https://www.facebook.com/${item.id}`,
          mediaType: "post",
          timestamp: item.created_time ?? "",
          metrics: {
            likes: item.reactions?.summary?.total_count ?? 0,
            comments: item.comments?.summary?.total_count ?? 0,
            shares: item.shares?.count ?? 0,
            reach: insights.reach,
            impressions: insights.impressions,
            saves: 0,
            engagement: insights.engagedUsers,
          },
        };
      })
    );

    return Response.json({ posts });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Facebook insights" },
      { status: 500 }
    );
  }
}
