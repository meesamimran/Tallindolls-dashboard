// GET /api/deezer-search?q=Coldplay+Yellow
// Proxies Deezer public search API (no auth required).

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return Response.json({ error: "Missing query param 'q'" }, { status: 400 });
  }

  try {
    const limit = parseInt(searchParams.get("limit") || "5", 10);
    const res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(q.trim())}&limit=${Math.min(limit, 10)}`
    );

    if (!res.ok) {
      return Response.json(
        { error: `Deezer API returned ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();
    const tracks = (json?.data || []).filter((t: any) => t.preview);

    if (tracks.length === 0) {
      return Response.json({
        found: false,
        message: `No preview available for "${q.trim()}"`,
        results: [],
      });
    }

    const results = tracks.map((t: any) => ({
      songTitle: t.title,
      artistName: t.artist?.name || "Unknown Artist",
      audioUrl: t.preview,
    }));

    return Response.json({
      found: true,
      results,
      songTitle: results[0].songTitle,
      artistName: results[0].artistName,
      audioUrl: results[0].audioUrl,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Search failed" },
      { status: 500 }
    );
  }
}
