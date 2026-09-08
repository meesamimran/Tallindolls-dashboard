// =============================================================================
// Cron endpoint — called by Vercel Cron Jobs every 1 minute.
// Checks for due scheduled posts and publishes them automatically.
//
// Storage: simple JSON file (.data/scheduled-posts.json).
// For production, use a proper database (Vercel KV, Supabase, etc.).
//
// Endpoints:
//   GET  — Vercel Cron: publish due tasks
//   POST — Content page: schedule a new task
//   PUT  — History page: query all task statuses (for client sync)
// =============================================================================

import { NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const STORAGE_PATH = join(process.cwd(), ".data", "scheduled-posts.json");
const GRAPH = "https://graph.facebook.com";
const V = process.env.META_GRAPH_VERSION || "v25.0";
const IG_USER_ID = process.env.IG_USER_ID;
const TOKEN = process.env.META_USER_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

// ── Types ──

interface ScheduledTask {
  id: string;
  imageUrl: string;
  caption?: string;
  platforms: ("instagram" | "facebook")[];
  surface: "feed" | "story" | "reel";
  scheduledAt: string; // "YYYY-MM-DDTHH:MM" local time
  status: "pending" | "processing" | "published" | "failed";
  error?: string;
  permalink?: string;
  createdAt: string; // ISO timestamp
}

// ── Validation ──

/** Validates scheduledAt format: must be "YYYY-MM-DDTHH:MM" with valid values. */
function isValidScheduleFormat(s: string): boolean {
  if (typeof s !== "string") return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return false;
  const [, y, mo, d, h, mi] = m.map(Number);
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > 31) return false;
  if (h > 23) return false; // 0-23 only
  if (mi > 59) return false;
  // Must not be NaN
  if (isNaN(y) || isNaN(mo) || isNaN(d) || isNaN(h) || isNaN(mi)) return false;
  // Construct a Date to check it's a real calendar day
  const dt = new Date(y, mo - 1, d, h, mi);
  if (isNaN(dt.getTime())) return false;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return false;
  return true;
}

// ── Persistence ──

async function loadTasks(): Promise<ScheduledTask[]> {
  try {
    const raw = await readFile(STORAGE_PATH, "utf-8");
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    // Filter out malformed entries
    return arr.filter(
      (t: any) =>
        t && typeof t.id === "string" && typeof t.scheduledAt === "string" && typeof t.status === "string"
    );
  } catch {
    return [];
  }
}

async function saveTasks(tasks: ScheduledTask[]): Promise<void> {
  await mkdir(join(process.cwd(), ".data"), { recursive: true });
  await writeFile(STORAGE_PATH, JSON.stringify(tasks, null, 2), "utf-8");
}

// ── Publishing helpers ──

async function ensurePublicUrl(maybeDataUrl: string): Promise<string> {
  if (!maybeDataUrl.startsWith("data:")) return maybeDataUrl;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw new Error("Cloudinary not configured for data URL upload");

  const [header, base64] = maybeDataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: mime }), "upload." + (mime === "image/png" ? "png" : "jpg"));
  form.append("upload_preset", preset);
  const up = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: "POST",
    body: form,
  });
  const upJson = await up.json();
  if (!upJson.secure_url) throw new Error("Cloudinary upload failed for data URL");
  return upJson.secure_url as string;
}

async function graphPost(path: string, params: Record<string, string>) {
  const res = await fetch(`${GRAPH}/${V}/${path}`, {
    method: "POST",
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Graph error ${res.status}`);
  }
  return json;
}

async function graphGet(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH}/${V}/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Graph error ${res.status}`);
  }
  return json;
}

async function pollContainer(containerId: string, isVideo: boolean): Promise<void> {
  const delays = isVideo
    ? [5000, 8000, 10000, 15000, 15000, 15000, 15000, 15000, 15000, 15000]
    : [1000, 1500, 1500, 2000, 2000, 2000, 2000, 2000, 2000, 2000];

  for (let i = 0; i < delays.length; i++) {
    await new Promise((r) => setTimeout(r, delays[i]));
    const json = await graphGet(`${containerId}`, {
      fields: "status_code",
      access_token: TOKEN!,
    });
    if (json.status_code === "FINISHED") return;
    if (json.status_code === "ERROR" || json.status_code === "EXPIRED") {
      throw new Error(`Container ${json.status_code}`);
    }
  }
}

/** Publish a single task to Instagram. Returns permalink on success. */
async function publishToInstagram(task: ScheduledTask): Promise<string> {
  if (!IG_USER_ID || !TOKEN) throw new Error("Meta IG config missing");

  const publicUrl = await ensurePublicUrl(task.imageUrl);
  const isVideo = task.surface === "reel";
  const isStory = task.surface === "story";

  const containerParams: Record<string, string> = { access_token: TOKEN };

  if (isVideo) {
    containerParams.media_type = "REELS";
    containerParams.video_url = publicUrl;
    if (task.caption) containerParams.caption = task.caption;
    containerParams.share_to_feed = "true";
  } else if (isStory) {
    containerParams.media_type = "STORIES";
    containerParams.image_url = publicUrl;
  } else {
    containerParams.image_url = publicUrl;
    if (task.caption) containerParams.caption = task.caption;
  }

  const container = await graphPost(`${IG_USER_ID}/media`, containerParams);
  await pollContainer(container.id, isVideo);
  await graphPost(`${IG_USER_ID}/media_publish`, {
    creation_id: container.id,
    access_token: TOKEN,
  });

  return `https://www.instagram.com/`;
}

/** Publish a single task to Facebook. Returns permalink on success. */
async function publishToFacebook(task: ScheduledTask): Promise<string> {
  if (!FB_PAGE_ID || !PAGE_TOKEN) throw new Error("Meta FB config missing");

  const publicUrl = await ensurePublicUrl(task.imageUrl);
  const isVideo = task.surface === "reel";
  const isStory = task.surface === "story";

  if (isVideo) {
    const formData = new FormData();
    formData.append("access_token", PAGE_TOKEN);
    formData.append("file_url", publicUrl);
    if (task.caption) formData.append("description", task.caption);

    const publishRes = await fetch(`${GRAPH}/${V}/${FB_PAGE_ID}/videos`, {
      method: "POST",
      body: formData,
    });
    const publishJson = await publishRes.json();
    if (!publishRes.ok) {
      throw new Error(publishJson?.error?.message || `FB video publish failed (${publishRes.status})`);
    }
    return `https://www.facebook.com/${FB_PAGE_ID}`;
  }

  if (isStory) {
    const photo = await graphPost(`${FB_PAGE_ID}/photos`, {
      url: publicUrl,
      published: "false",
      access_token: PAGE_TOKEN,
    });
    await graphPost(`${FB_PAGE_ID}/photo_stories`, {
      photo_id: photo.id,
      access_token: PAGE_TOKEN,
    });
    return `https://www.facebook.com/${FB_PAGE_ID}`;
  }

  // Feed image
  const params: Record<string, string> = { url: publicUrl, access_token: PAGE_TOKEN };
  if (task.caption) params.message = task.caption;
  const json = await graphPost(`${FB_PAGE_ID}/photos`, params);
  return `https://www.facebook.com/${FB_PAGE_ID}`;
}

// ── POST — schedule a new task ──

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl, caption, platforms, surface, scheduledAt } = body;

    // ── Validation ──
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl (string) is required" }, { status: 400 });
    }
    if (!scheduledAt || typeof scheduledAt !== "string") {
      return NextResponse.json({ error: "scheduledAt (string) is required" }, { status: 400 });
    }
    if (!isValidScheduleFormat(scheduledAt)) {
      return NextResponse.json({
        error: "Invalid scheduledAt format. Expected YYYY-MM-DDTHH:MM with valid hour (0-23) and minute (0-59).",
      }, { status: 400 });
    }

    // Warn if scheduling in the past, but still accept it (will be published on next cron tick)
    const nowLocal = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}T${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
    if (scheduledAt <= nowLocal) {
      console.warn(`⚠ Cron POST: task scheduled in the past/now (${scheduledAt}), will be published on next cron tick`);
    }

    const validPlatforms: ("instagram" | "facebook")[] = (platforms || ["instagram"]).filter(
      (p: string) => p === "instagram" || p === "facebook"
    );
    if (validPlatforms.length === 0) {
      return NextResponse.json({ error: "At least one valid platform required (instagram, facebook)" }, { status: 400 });
    }

    const validSurfaces: ("feed" | "story" | "reel")[] = ["feed", "story", "reel"];
    const safeSurface = validSurfaces.includes(surface) ? surface : "feed";

    const task: ScheduledTask = {
      id: `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      imageUrl,
      caption: caption || "",
      platforms: validPlatforms,
      surface: safeSurface,
      scheduledAt,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const tasks = await loadTasks();
    tasks.push(task);
    await saveTasks(tasks);

    console.log(`📅 Cron POST: scheduled task ${task.id.slice(-8)} for ${scheduledAt} on ${validPlatforms.join(", ")}`);
    return NextResponse.json({ ok: true, task });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}

// ── GET — Vercel Cron: publish due tasks ──

export async function GET() {
  if (!IG_USER_ID || !TOKEN) {
    console.error("📅 Cron GET: Meta IG config missing");
    return NextResponse.json({ error: "Meta IG config missing" }, { status: 500 });
  }

  const now = new Date();
  console.log(`📅 Cron GET: checking at ${now.toISOString()}`);

  const tasks = await loadTasks();
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const processingCount = tasks.filter((t) => t.status === "processing").length;

  console.log(`📅 Cron GET: ${tasks.length} total, ${pendingCount} pending, ${processingCount} processing`);

  // Build local time string for comparison
  const nowLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  // Find due tasks that are still pending (skip processing — another invocation has them)
  const due = tasks.filter((t) => {
    if (t.status !== "pending") return false;
    // Skip tasks with invalid scheduledAt (shouldn't exist after validation, but be safe)
    if (!isValidScheduleFormat(t.scheduledAt)) {
      console.warn(`📅 Cron GET: task ${t.id.slice(-8)} has invalid scheduledAt "${t.scheduledAt}", marking as failed`);
      t.status = "failed";
      t.error = `Invalid scheduledAt: ${t.scheduledAt}`;
      return false;
    }
    return t.scheduledAt <= nowLocal;
  });

  console.log(`📅 Cron GET: ${due.length} due for publish (nowLocal: ${nowLocal})`);

  if (due.length === 0) {
    // Persist any status changes (e.g. invalid tasks marked as failed)
    if (tasks.some((t) => t.status === "failed" && !t.error?.startsWith("Publish error:"))) {
      await saveTasks(tasks);
    }
    return NextResponse.json({
      ok: true,
      published: 0,
      total: tasks.length,
      pending: pendingCount,
      processing: processingCount,
    });
  }

  // ── Race-condition protection ──
  // Mark tasks as "processing" BEFORE publishing so overlapping cron
  // invocations don't double-publish. Save immediately.
  for (const task of due) {
    task.status = "processing";
  }
  await saveTasks(tasks);

  let published = 0;
  for (const task of due) {
    console.log(`📅 Cron GET: publishing task ${task.id.slice(-8)} (${task.surface}) to [${task.platforms.join(", ")}]`);
    let anyOk = false;
    const errors: string[] = [];

    try {
      if (task.platforms.includes("instagram")) {
        try {
          task.permalink = await publishToInstagram(task);
          anyOk = true;
          console.log(`📅 Cron GET: task ${task.id.slice(-8)} → Instagram OK`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown";
          errors.push(`IG: ${msg}`);
          console.error(`📅 Cron GET: task ${task.id.slice(-8)} → Instagram FAIL: ${msg}`);
        }
      }

      if (task.platforms.includes("facebook")) {
        if (!FB_PAGE_ID || !PAGE_TOKEN) {
          errors.push("FB: missing FB_PAGE_ID or FB_PAGE_ACCESS_TOKEN");
          console.error(`📅 Cron GET: task ${task.id.slice(-8)} → Facebook SKIP (missing config)`);
        } else {
          try {
            const fbPermalink = await publishToFacebook(task);
            task.permalink = task.permalink || fbPermalink;
            anyOk = true;
            console.log(`📅 Cron GET: task ${task.id.slice(-8)} → Facebook OK`);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown";
            errors.push(`FB: ${msg}`);
            console.error(`📅 Cron GET: task ${task.id.slice(-8)} → Facebook FAIL: ${msg}`);
          }
        }
      }

      if (anyOk) {
        task.status = "published";
        published++;
      } else {
        task.status = "failed";
        task.error = `Publish error: ${errors.join("; ")}`;
      }
    } catch (err) {
      task.status = "failed";
      task.error = `Publish error: ${err instanceof Error ? err.message : "Unknown"}`;
      console.error(`📅 Cron GET: task ${task.id.slice(-8)} → FAIL: ${task.error}`);
    }
  }

  await saveTasks(tasks);

  const remaining = tasks.filter((t) => t.status === "pending").length;
  console.log(`📅 Cron GET: done — ${published} published, ${remaining} remaining pending`);
  return NextResponse.json({ ok: true, published, remaining, total: tasks.length });
}

// ── PUT — History page sync: return all tasks (for client-side status reconciliation) ──

export async function PUT() {
  try {
    const tasks = await loadTasks();
    // Return a lightweight view with just the fields the History page needs
    const summary = tasks.map((t) => ({
      serverId: t.id,
      scheduledAt: t.scheduledAt,
      status: t.status,
      error: t.error,
      permalink: t.permalink,
      platforms: t.platforms,
      surface: t.surface,
    }));
    return NextResponse.json({ ok: true, tasks: summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
