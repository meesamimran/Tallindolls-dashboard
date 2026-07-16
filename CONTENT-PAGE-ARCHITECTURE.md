# `/content` Page — Architecture Overview

## Tech Stack & Why

| Technology | Purpose |
|---|---|
| **Next.js 16 (App Router)** | Framework — server-side API routes, client-side pages, proxy-based routing |
| **React 19** | Component-based UI with hooks for all state management |
| **Tailwind CSS v4** | Utility-first styling — no CSS files beyond design tokens |
| **CSS Custom Properties** | Design system — colors, shadows, spacing all in `globals.css`, supports dark/light |
| **Canvas API** | All image processing done client-side — cropping, resizing, blur-fill, frame extraction. Zero server round-trips for image work |
| **OpenAI GPT-4o-mini** | AI caption generation — supports image vision (model sees the uploaded photo) |
| **Cloudinary** | Media hosting + AI generative expand (fills gaps when image doesn't fit a format) |
| **Replicate** | Premium AI outpainting — higher quality than Cloudinary, used when API token is configured |
| **Meta Graph API v25.0** | Publishing to Facebook Pages & Instagram Business accounts |
| **Lucide React** | Icon library — consistent, tree-shakeable |
| **date-fns** | Date formatting in header |

---

## Component Architecture

```
ContentPage
│   Manages: mode (single/carousel), posts array
│
├── PostComposer ←── Main orchestrator (where everything connects)
│   │   Owns: mediaFiles, caption, selectedPreview, publishing state
│   │
│   ├── ImageStudio ←── Media upload & thumbnail management
│   │   Responsibility: Drop files → show compact thumbnails (180px cards)
│   │   Features per thumbnail: filename, dimensions, Edit crop, Remove, hover actions
│   │   Video thumbnails: play icon overlay + duration badge
│   │   Format tabs: Square (1:1), Portrait (4:5), Story (9:16), Ad (1.91:1)
│   │   Focal point: Horizontal + Vertical sliders for image positioning
│   │   Inline editor: Original vs Preview comparison, contain/cover fit toggle
│   │
│   ├── Video Thumbnail Selector ←── Appears only when video uploaded
│   │   Responsibility: Choose how video appears before playback
│   │   5 auto-generated frames extracted from video at even timestamps
│   │   Horizontal gallery with selection highlight
│   │   Custom upload option for external thumbnail image
│   │
│   ├── Left Column: Caption Editor
│   │   Collection & Post Type selectors → context for AI
│   │   Language toggle (Estonian / English with flags)
│   │   Detail input → user gives idea/context to AI
│   │   Generate button → calls OpenAI, parses response into editable fields
│   │   Editable fields: Headline, Body, Hashtags, CTA
│   │   Publish-to chips: select platforms (FB/IG) + placement (Feed/Story)
│   │   Action buttons: Save Draft, Approve & Publish
│   │
│   └── Right Column: Live Preview (sticky on scroll)
│       │   Preview type dropdown — auto-switches options based on media type
│       │   Device toggle — Desktop (browser chrome) / Mobile (phone frame)
│       │   Single preview card — never two side-by-side
│       │   Fade transition on preview switch
│       │
│       └── SocialPreviews ←── Pure presentational renderers
│           ├── FacebookFeedPost — FB header, verified badge, reactions, action bar, comment box
│           ├── InstagramFeedPost — IG gradient avatar, action row (♥/💬/✈/🔖), caption, timestamp
│           ├── FacebookReelPost — Phone frame, vertical video, gradients, Follow, Like/Comment/Share
│           ├── InstagramReelPost — Phone frame, right-side actions, audio name, bottom nav
│           ├── CarouselWrapper — Prev/Next arrows, pagination dots, swipe animation
│           └── PreviewSkeleton — Shimmer loading placeholder for image/video load
│
├── CarouselBuilder ←── Separate mode for multi-image editing
│   │   Drag-to-reorder thumbnails, per-slide editing, same preview components
│
└── ApprovalQueue ←── Post workflow: Draft → Ready → Approved → Published
    │   Card-based grid, status badges, action buttons per stage
```

---

## Image Processing Pipeline

**Problem**: User uploads any photo. Instagram needs 1:1 or 4:5. Stories need 9:16. Ads need 1.91:1. Image might not fit — what to do?

**Solution**: 3-tier system, all Canvas API client-side, no server calls.

| Tier | Ratio Gap | Method | Speed | What Happens |
|---|---|---|---|---|
| 1 | <5% | Smart Crop | Instant | Image nearly fits — just center it, nothing meaningful gets cut |
| 2 | 5-15% | Blur-Fill | Instant | Create blurred copy of image as background → place original on top → no white bars |
| 3 | >15% | AI Expand | ~3-5s | Try Replicate outpainting → try Cloudinary Gen Fill → fallback to blur-fill |

**Result**: Model never gets cut. No white backgrounds. Every format gets a usable image.

**Focal Point**: User adjusts Horizontal/Vertical sliders → Canvas `drawImage` repositions the image within the frame.

---

## Preview System

**Problem**: User needs to see exactly how the post will look before publishing. Different platforms, different surfaces.

**Solution**: Pure presentational components driven by props.

| Component | What It Renders |
|---|---|
| `FacebookFeedPost` | Real FB card — profile avatar, page name + verified checkmark, timestamp + globe icon, caption text, image/video, reaction bar (👍❤️😆), Like/Comment/Share buttons, comment input |
| `InstagramFeedPost` | Real IG card — gradient-ring avatar, username, ••• menu, square media, ♥/💬/✈/🔖 action row (with toggle animation), likes count, caption with username prefix, "View all comments", timestamp |
| `FacebookReelPost` | Phone-frame — full-height video, top/bottom gradients, progress bar, profile + Follow button, right-side Like/Comment/Share buttons, mute toggle, caption overlay |
| `InstagramReelPost` | Phone-frame — full-height video, right-side action buttons with counts (♥/💬/✈/🔖), username + verified, audio name bar, bottom nav (Home/Search/Add/Reels/Profile) |

**Platform Detection**: Automatic. Video → video-specific dropdown. Image → feed-only dropdown. Options never show irrelevant choices.

**Device Toggle**: Desktop = browser chrome + website background. Mobile = phone frame with notch + edge-to-edge layout.

**Real-time**: Caption text is React state → passed as props → preview re-renders on every keystroke. No debounce, no refresh.

**Carousel**: Facebook style = horizontal slide with peek. Instagram style = overlay arrows. Both with pagination dots + swipe support.

---

## AI Caption Generator

**How it works**:

1. **Context Assembly** — Collection name, post type, surface (feed/story/ad), language, user detail, image colors/mood → combined into prompt
2. **Brand Voice** — System prompt enforces: Estonian formal "Teie", premium vocabulary, no discount words ("odav", "allahindlus"), elegant Nordic tone
3. **API Call** — `/api/openai` → GPT-4o-mini with image vision (model sees the uploaded photo to reference colors/mood)
4. **Response Parsing** — `parseGeneratedCopy()` splits AI response into Headline, Body, Hashtags, CTA fields
5. **Editable** — All fields are input/textarea, user can modify before publishing

**Why server-side API route**: Keeps OpenAI key secure — never exposed to browser.

---

## Publishing Flow

```
User clicks "Approve & Publish"
    │
    ├── Image Post
    │   ├── Canvas crop for target format → data URL
    │   ├── Cloudinary upload (unsigned) → public HTTPS URL
    │   └── Platform API route
    │       ├── Instagram: Container create → poll status → media_publish
    │       └── Facebook: Page/photos endpoint → live
    │
    └── Video Post
        ├── Cloudinary video upload → public URL
        ├── (Optional) Selected thumbnail → Cloudinary → thumb URL
        └── Platform API route with isStory + thumb params
```

**Why Cloudinary**: Meta Graph API requires publicly accessible HTTPS URLs. Can't send raw files directly. Cloudinary provides unsigned upload + CDN delivery.

---

## Data Flow (State Management)

No Redux, no Zustand. Pure React state. Why? Single page, single user — complexity isn't needed.

```
mediaFiles state ────────→ ImageStudio renders thumbnails
    │                      SocialPreviews renders preview
    │                      Download uses format crops
    │
caption state ───────────→ Preview (real-time text display)
    │                      Publish (caption text → API)
    │
selectedPreviewId ───────→ Preview type dropdown value
    │                      Controls which SocialPreviews component renders
    │                      Auto-switches on video/image detection
    │
publishing state ────────→ Loading spinner on button
                           Success/error banners
```

---

## Proxy Lock (Demo Mode)

`src/proxy.ts` — intercepts all routes, redirects to `/content`. Only exception: `/api/*` (needed for functionality) and static assets.

Delete this file → full dashboard restored.

---

## Key Design Decisions

1. **Canvas over server-side** — Image processing is instant, works offline, no server costs. Blur-fill is a pure Canvas operation.
2. **Presentational preview components** — SocialPreviews has zero state, zero side effects. Given same props → always same output. Easy to test, easy to extend.
3. **Tiered AI degradation** — AI outpainting can fail (API down, no credits). System always falls back to blur-fill. User never stuck.
4. **Compact thumbnails over large preview** — Composer stays clean. Large image only in the preview panel (right side). Matches Meta Business Suite layout.
5. **Single preview at a time** — Cleaner than side-by-side. Dropdown makes switching easy. Fade animation keeps it polished.
