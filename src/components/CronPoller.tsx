"use client";

import { useEffect, useRef } from "react";

/**
 * Dev-only: polls the cron endpoint every 30s to publish scheduled posts.
 * On Vercel, real cron jobs handle this. This is for local development only.
 */
export default function CronPoller() {
  const ref = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== "development") return;

    const poll = async () => {
      try {
        const res = await fetch("/api/cron/publish-scheduled");
        const json = await res.json();
        if (json.published && json.published > 0) {
          console.log(`📅 CronPoller: published ${json.published} scheduled post(s), ${json.remaining ?? json.pending} remaining`);
        }
      } catch {
        // silent — cron endpoint may not be ready yet
      }
    };

    // Run once on mount, then every 30 seconds
    console.log("📅 CronPoller: started (dev mode, polling every 30s)");
    poll();
    ref.current = setInterval(poll, 30_000);

    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, []);

  return null;
}
