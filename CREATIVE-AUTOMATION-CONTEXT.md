# Creative Automation — Project Context & Handoff

> Ye file poore feature ka context rakhti hai. Nayi chat shuru karo to bas ye file reference kar dena — sab pick up ho jayega.
> Last updated: 2026-07-11

---

## 1. Project kya hai

**TallinnDoll** ek premium Estonian fashion brand hai. Iski dashboard app: `D:\Job_Projects\tallindoll_dashboard\agentic-dashboard` (Next.js 16.2.9 + Turbopack, React 19, Tailwind v4, TypeScript).

**Creative Automation feature** (Milestone 1) — 3 pillars:
1. **Smart Asset Formatting** — raw image ko auto-resize (1:1, 4:5, 9:16, ad 1.91:1). NOTE: ab **crop nahi, resize/contain-fit** (poori image, koi hissa nahi kata; bachi jagah white background).
2. **Estonian AI Copywriter** — OpenAI vision se image dekh kar caption (headline/body/hashtags/CTA). Formal "Teie" tone, forbidden words: odav, allahindlus, soodukas.
3. **Human-in-the-loop Approval + Meta Publishing** — Draft → Ready for Review → Approved → Published. Bina manual approve ke kuch auto-post NAHI hota.

Feature "social tab" = **Content & Posts** page (`/content`).

---

## 2. Kahan tak ho chuka hai (DONE)

- ✅ Meta app setup + FB/IG publishing **end-to-end tested** (real posts + stories gaye).
- ✅ Asset Studio: upload → auto-resize sab sizes → download (per-size + all).
- ✅ Caption generator: OpenAI vision (`gpt-4o-mini`), detail/context field, surface-aware (feed/story/ad).
- ✅ Realistic previews: Facebook + Instagram alag chrome, Desktop (browser frame) vs Mobile (phone shell) toggle, alag Story preview.
- ✅ Publishing LIVE: IG feed+story, FB feed+story. Cloudinary pe host → Meta Graph API.
- ✅ Dynamic **Approval Workflow** queue (static mock hata di).
- ✅ **"Publish to" multi-select** (Platform: IG/FB × Placement: Feed/Story) — code likha, tsc pass. Build verify pending (user ne interrupt kiya tha).

---

## 3. Files (kya kahan hai)

**Libs (`src/lib/`):**
- `imageFormats.ts` — presets + `cropToPreset` (ab contain-fit/resize, no crop) + `getImageInfo` + download.
- `captionParse.ts` — `parseGeneratedCopy`, `BRAND_SYSTEM_PROMPT`, `buildUserPrompt` (surface-aware).
- `uploadMedia.ts` — Cloudinary unsigned upload → public URL.
- `publishPost.ts` — shared publish helper (composer + queue dono use karte hain).

**Components (`src/components/social/`):**
- `PostComposer.tsx` — main orchestrator (image + caption + previews + Publish-to targeting).
- `ImageStudio.tsx` — upload/dropzone, format tabs, align sliders, download.
- `SocialPreviews.tsx` — FeedPreview (FB/IG, desktop/mobile), StoryPreview, AdPreview.
- `ApprovalQueue.tsx` — Draft→Ready→Approved→Published workflow, publish-from-queue.

**API routes (`src/app/api/`):**
- `openai/route.ts` — vision caption gen.
- `deepseek/route.ts` — (purana, translation ke liye tha, ab mostly unused).
- `publish/instagram/route.ts` — 2-step container→publish (feed + STORIES).
- `publish/facebook/route.ts` — feed (/photos) + story (unpublished photo → photo_stories).

**Page:** `src/app/(dashboard)/content/page.tsx` — pipeline steps bar + PostComposer + ApprovalQueue.
**Type:** `src/types/index.ts` — `ScheduledPost` (status: scheduled|draft|ready|approved|published; + `imageDataUrl`, `surface`).

---

## 4. Env (`.env.local`) — sab set hain

| Key | Value / status |
|---|---|
| OPENAI_API_KEY | ✅ set |
| OPENAI_MODEL | gpt-4o-mini |
| META_GRAPH_VERSION | v25.0 |
| IG_USER_ID | 17841415990446396 |
| FB_PAGE_ID | 1210454472148886 |
| META_USER_TOKEN | ✅ 60-day token |
| FB_PAGE_ACCESS_TOKEN | ✅ set (user token se derive kiya) |
| NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME | x6h4eygt |
| NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET | a6tbqd8q |

Test accounts: FB Page "Tallindoll Test page" + linked IG Business. **Go-live pe client ke real accounts se swap karna hai.**

---

## 5. Flow (kaise chalta hai)

```
Upload image → auto-resize (all sizes) → [OpenAI] caption generate
   → live preview (FB/IG, desktop/mobile, feed/story/ad)
   → "Publish to" chips se destinations chuno (IG/FB × Feed/Story)
   → "Save Draft"        = queue mein Draft
   → "Approve & Publish"  = Cloudinary upload → Meta API → live
Queue: Draft → Mark Ready → Approve → Publish (manual, human-in-loop)
```

Publishing sirf button click se hoti hai — koi cron/auto nahi.

---

## 6. Constraints / important notes

- Meta direct upload nahi leta → image Cloudinary (public HTTPS) pe host hoti hai, phir publish.
- Stories = **plain image/video only** (polls/links/stickers API se nahi — Meta limit, IG+FB dono).
- No native scheduling → agar chahiye to hum khud banayenge (abhi instant-only).
- IG publish cap ~25 posts/24h.
- 60-day token expire hone se pehle refresh karna hoga (abhi manual; auto-refresh job pending).

---

## 7. Pending / next steps

- [ ] "Publish to" multi-select ka `npm run build` verify (tsc pass ho chuka).
- [ ] Scheduling (agar client confirm kare).
- [ ] Ads = sirf formatting ya paid campaigns? (client se confirm pending — Marketing API alag/bada kaam).
- [ ] Token auto-refresh job.
- [ ] Go-live: client accounts + credentials swap.
- [ ] Client scope confirmations: Stories plain-media OK?, scheduling M1 mein?, ads meaning?

---

## 8. Build/run commands

```bash
cd D:/Job_Projects/tallindoll_dashboard/agentic-dashboard
npm run dev          # dev server (localhost:3000)
npx tsc --noEmit     # typecheck
npm run build        # production build
```

AGENTS.md note: ye customized Next.js hai — framework code likhne se pehle `node_modules/next/dist/docs/` dekho.
