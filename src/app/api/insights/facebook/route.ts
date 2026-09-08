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
  clicks: number;
}> {
  try {
    // `post_impressions`, `post_reach` and `post_engaged_users` are no longer
    // valid metrics on the v25.0 page-post insights endpoint — only click and
    // reaction metrics remain. Reach/impressions are therefore reported as 0.
    const res = await fetch(
      `${GRAPH}/${V}/${postId}/insights?metric=post_clicks&period=lifetime&access_token=${TOKEN}`
    );
    const json = await res.json();
    return {
      clicks: extractMetric(json.data, "post_clicks"),
    };
  } catch {
    return { clicks: 0 };
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
        const likes = item.reactions?.summary?.total_count ?? 0;
        const comments = item.comments?.summary?.total_count ?? 0;
        const shares = item.shares?.count ?? 0;
        return {
          id: item.id,
          platform: "facebook" as const,
          caption: item.message ?? "",
          mediaUrl: "",
          permalink: item.permalink_url ?? `https://www.facebook.com/${item.id}`,
          mediaType: "post",
          timestamp: item.created_time ?? "",
          metrics: {
            likes,
            comments,
            shares,
            reach: 0, // deprecated on v25.0 post insights
            impressions: 0, // deprecated on v25.0 post insights
            saves: 0,
            engagement: likes + comments + shares,
            clicks: insights.clicks,
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
