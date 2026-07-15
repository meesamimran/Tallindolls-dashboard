# TallinnDoll — Agentic Marketing & Inventory Analytics Dashboard

> **A fully AI-powered, autonomous analytics dashboard for a premium Estonian fashion e-commerce brand.**  
> Built with Next.js 16, TypeScript, Tailwind CSS v4, Recharts, and DeepSeek AI.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Design System](#4-design-system)
5. [Pages & Features](#5-pages--features)
6. [AI & Agentic Layer](#6-ai--agentic-layer)
7. [Data Layer](#7-data-layer)
8. [Chart System](#8-chart-system)
9. [Navigation & Shell](#9-navigation--shell)
10. [State Management](#10-state-management)
11. [API Routes](#11-api-routes)
12. [Accessibility & Responsiveness](#12-accessibility--responsiveness)
13. [Deployment](#13-deployment)

---

## 1. Project Overview

TallinnDoll Dashboard is a comprehensive business intelligence platform designed for a premium fashion brand operating in the Estonian market. The dashboard consolidates marketing performance, inventory intelligence, revenue analytics, and AI-powered strategy recommendations into a single unified interface.

### Core Capabilities

| Capability | Description |
|---|---|
| **Marketing Analytics** | Facebook Ads, Klaviyo Email, and Google Analytics performance tracking |
| **Inventory Management** | 200+ product SKU tracking with demand forecasting and classification |
| **Revenue Intelligence** | Time-series revenue analysis with multi-channel attribution |
| **AI Strategy Agent** | DeepSeek-powered budget optimization and campaign analysis |
| **AI Content Generator** | Automated Estonian social media copy generation |
| **Campaign Management** | Ad draft creation, budget planning, and creative library |
| **Trend Analysis** | Multi-metric trend detection with linear regression |
| **Agent Activity** | AI agent monitoring and autonomous workflow tracking |

### Target Audience
- Marketing managers at TallinnDoll
- E-commerce operations teams
- Executive leadership for strategic decision-making

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 16.2.9 (App Router) | Server-rendered React with file-based routing |
| **Language** | TypeScript 5 (Strict Mode) | Type-safe development across the entire codebase |
| **Styling** | Tailwind CSS v4 + CSS Custom Properties | Design-system-driven dark/light theme |
| **UI Components** | Radix UI Primitives (shadcn/ui) | Accessible, composable interface primitives |
| **Charts** | Recharts v3.9 | Composable React charting library |
| **Tables** | Custom Semantic HTML | Tables built to design-system specifications |
| **Icons** | Lucide React v1.21 | Consistent 16px/20px icon system |
| **Dates** | date-fns v4.4 | Lightweight date formatting and manipulation |
| **AI/LLM** | DeepSeek API (deepseek-chat) | Real-time AI analysis, content generation, translation |
| **Fonts** | Lato (Primary) + Geist Mono (Data) | Brand typography + monospace numerals |
| **Build** | Turbopack | Next-generation bundler for rapid development |

---

## 3. Architecture

```
src/
├── app/                          # Next.js App Router (12 routes)
│   ├── layout.tsx                # Root layout (fonts, metadata)
│   ├── globals.css               # Design tokens + theme system
│   ├── api/deepseek/route.ts     # DeepSeek API proxy (server-side)
│   └── (dashboard)/              # Route group — dashboard shell
│       ├── layout.tsx            # Sidebar + Header + main content
│       ├── page.tsx              # ← Overview / Home
│       ├── revenue/page.tsx      # ← Revenue Analytics
│       ├── marketing/page.tsx    # ← Marketing Performance
│       ├── inventory/page.tsx    # ← Inventory Intelligence
│       ├── forecast/page.tsx     # ← Forecast & Planning
│       ├── trends/page.tsx       # ← Trends & Insights
│       ├── agents/page.tsx       # ← Agent Activity
│       ├── content/page.tsx      # ← Content & Posts
│       ├── campaigns/page.tsx    # ← Campaigns & Ads
│       ├── strategy/page.tsx     # ← AI Strategy Agent
│       ├── reports/page.tsx      # ← Monthly Reports
│       └── settings/page.tsx     # ← Settings
├── components/
│   ├── dashboard/                # Dashboard shell components
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── Header.tsx            # Top header bar
│   │   ├── KPICard.tsx           # KPI metric card
│   │   ├── FilterBar.tsx         # Global filter controls
│   │   └── LoadingSkeleton.tsx   # Skeleton loading states
│   ├── charts/                   # 6 chart components
│   │   ├── TimeSeriesChart.tsx   # Multi-metric area chart
│   │   ├── TrendChart.tsx        # Trend line + regression
│   │   ├── ChannelBarChart.tsx   # Horizontal bar chart
│   │   ├── DonutChart.tsx        # Donut/pie chart
│   │   ├── Sparkline.tsx         # Inline SVG sparkline
│   │   └── MetricGauge.tsx       # Semi-circle progress gauge
│   └── ThemeProvider.tsx         # Dark/Light theme context
├── services/                     # Data service layer
│   ├── dashboardService.ts       # KPIs, time series, channels
│   ├── facebookService.ts        # Facebook Ads campaigns
│   ├── klaviyoService.ts         # Email marketing metrics
│   ├── analyticsService.ts       # Google Analytics data
│   ├── inventoryService.ts       # 200+ products, forecasts
│   ├── currencyService.ts        # Exchange rate data
│   └── agentService.ts           # Agent actions & metrics
├── types/
│   └── index.ts                  # TypeScript type definitions
├── lib/
│   └── utils.ts                  # Formatting, cn(), utilities
└── hooks/
    ├── useDebounce.ts            # Debounced value hook
    └── useLocalStorage.ts        # Persistent state hook
```

---

## 4. Design System

The dashboard implements a **custom Agentic design system** — a dark-first, magenta-to-purple themed interface inspired by modern AI-first SaaS platforms.

### Color Tokens

| Category | Token | Dark Value | Light Value | Usage |
|---|---|---|---|---|
| **Brand Primary** | `--brand` | `#D94FB0` | `#C8399C` | Primary actions, active states |
| **Brand Gradient** | — | `#C8399C → #7C3AED` | `#C8399C → #7C3AED` | CTA buttons, hero accents |
| **Brand Background** | `--brand-softer` | `#2D0E22` | `#FDF2F9` | AI cards, insight panels |
| **Surface** | `--neutral-primary-soft` | `rgba(255,255,255,0.05)` | `#FFFFFF` | Card backgrounds |
| **Page Background** | `--neutral-primary` | `#0a0a0a` | `#FFFFFF` | Main background |
| **Text Heading** | `--heading` | `#FFFFFF` | `#111827` | All headings |
| **Text Body** | `--body` | `#a1a1aa` | `#4B5563` | Paragraphs, descriptions |
| **Success** | `--success` | `#009966` | `#007A55` | Positive trends |
| **Warning** | `--warning` | `#F97316` | `#F97316` | Caution states |
| **Danger** | `--danger` | `#C70036` | `#C70036` | Errors, destructive actions |

### Typography
- **Primary Font:** Lato (400 Regular, 700 Bold, 900 Black)
- **Data/Monospace:** Geist Mono / JetBrains Mono (tabular numerals for tables)
- **Heading Scale:** 28px (page titles) → 24px → 20px → 16px → 14px → 12px (labels)
- **Body Text:** 16px for paragraphs, 14px for UI, 1.7 line-height

### Spacing
- **Base Unit:** 8px grid system
- **Section Padding:** 96px vertical
- **Card Gaps:** 24px (grid), 16px (compact)
- **Container:** 1200px max-width, 24px horizontal padding

### Borders & Shadows
- **Border Radius:** 2px universally — creates a sharp, precise aesthetic
- **Shadow Scale:** `shadow-xs` through `shadow-2xl` with consistent light-source
- **Border Colors:** `rgba(255,255,255,0.1)` dark / `#E5E7EB` light

### Theme System
- Dark mode is the default experience
- Light mode toggle available in the header (persisted to localStorage)
- All 150+ CSS custom properties swap automatically via `[data-theme="light"]` selector
- Zero manual dark/light swapping — single-source tokens handle both modes

---

## 5. Pages & Features

### 5.1 Overview (`/`)
**The executive command center of the dashboard.**

- **10 KPI Metric Cards** — Two-tier layout: 5 primary featured KPIs (Revenue, Orders, Spend, ROAS, Sessions) followed by 5 secondary compact KPIs (Conversion Rate, Avg Order Value, Customer LTV, Inventory Value, Return Rate). Each card displays the metric value with trend indicator, percentage change, and color-coded status.
- **30-Day Performance Summary** — Aggregated totals for Revenue, Orders, ROAS, and Marketing Spend displayed in a clean grid with trend percentages.
- **Channel Performance** — Top 4 marketing channels shown with animated progress bars using the brand gradient, alongside revenue and ROAS figures. Channels include Instagram, Facebook, Google, and Email.
- **Notifications Panel** — Real-time notification feed with severity-based icons (Critical, Warning, Success, Info), timestamps with relative time display, unread indicators with brand-colored left border, and 6 most recent notifications visible at a glance.
- **AI Insights Banner** — One-click access to DeepSeek-powered analysis of current dashboard metrics.

### 5.2 Revenue Analytics (`/revenue`)
**Deep dive into revenue performance and channel attribution.**

- **Timeframe Selector** — 7-day, 30-day, 90-day, and 12-month views with instant data refresh.
- **Revenue & Orders Trend Chart** — Combined area chart with gradient fills showing revenue (magenta) and orders (purple) over time. Features interactive tooltips, compact axis formatting, and legend.
- **Channel Breakdown Table** — All 6 marketing channels (Instagram, Facebook, Google, Email, TikTok, Direct) with Revenue, Spend, ROAS, and Orders in a sortable data table following design-system table specifications.
- **4 Stat Summary Cards** — Total Revenue, Total Orders, Average ROAS, and Marketing Spend with trend indicators and period-over-period comparisons.

### 5.3 Marketing Performance (`/marketing`)
**Cross-channel marketing analytics across three platforms.**

- **Facebook Ads Tab:**
  - 4 metric summary cards: Total Spend, Impressions, CTR, Blended ROAS
  - Campaign performance table with 7 columns: Campaign Name, Status (color-coded badges), Spend, Impressions, Clicks, CTR, ROAS
  - Status badges with semantic colors: Active (brand/magenta), Paused (warning/orange), Completed (neutral/gray)

- **Klaviyo Email Tab:**
  - 4 metric cards: Email Revenue, Average Open Rate, Average Click Rate, Total Subscribers
  - 12-month historical data table: Month, Revenue, Open Rate, Click Rate, Sends, Subscribers

- **Google Analytics Tab:**
  - 4 metric cards: Sessions, Users, Bounce Rate, Conversion Rate
  - Top landing pages table with session counts, conversions, and conversion rates

- **Currency Converter** — Real-time USD to EUR conversion display at current exchange rates
- **AI Campaign Intelligence** — AI-generated cross-channel analysis with actionable recommendations

### 5.4 Inventory Intelligence (`/inventory`)
**Complete product lifecycle management for 200+ SKUs.**

- **4 Summary Cards** — Total Products count, Total Stock Value (EUR), Low Stock Items (warning), Out of Stock count (danger)
- **Advanced Filtering** — Search by SKU or product name, filter by collection (10 fashion collections), filter by status (In Stock, Low Stock, Out of Stock, Critical)
- **Sortable Data Table** — 8 columns: SKU, Product Name, Collection, Current Stock, Daily Sales Velocity, Days Remaining (with color-coded progress: red <7, orange <14, green ≥14), Status (badge), Unit Price. Click column headers to sort ascending/descending.
- **Pagination** — 20 items per page with Previous/Next navigation, page number display
- **Product Classification** — Three-column grid: Fast Moving, Normal, Slow Moving — each showing top 5 products with velocity metrics

### 5.5 Forecast & Production Planning (`/forecast`)
**Demand forecasting and production recommendations.**

- **5 Forecast Summary Cards** — Total Units Needed, Expected Demand, Recommended Production Quantity, Safety Stock Levels, Items Requiring Reorder
- **Forecast Data Table** — 10 sortable columns including SKU, Product, Collection, Current Stock, Incoming Stock, Units Needed, Expected Demand, Recommended Production, Priority Level (Critical/High/Medium/Low badges), Forecast Date
- **Priority Distribution** — Horizontal stacked bar showing percentage breakdown of priority levels with color-coded segments

### 5.6 Trends & Insights (`/trends`)
**Long-term metric trend analysis.**

- **Timeframe Selector** — 30-day, 90-day, and 12-month views
- **3 Trend Charts** — Revenue (magenta), Marketing Spend (purple), ROAS (teal). Each chart overlays a dashed linear regression trend line over the actual data area, providing predictive direction.
- **4 Key Metric Cards** — Latest values for Revenue, Orders, Sessions, and Conversion Rate
- **AI Trend Analysis Panel** — Machine-generated insights identifying revenue momentum, spend efficiency patterns, and growth opportunities

### 5.7 Agent Activity (`/agents`)
**AI agent monitoring and workflow tracking.**

- **4 Agent Metric Cards** — Total Actions executed, Ads Created, Posts Scheduled, Budget Saved (EUR)
- **Activity Feed** — Chronological timeline of agent actions with:
  - Agent type icons in colored containers (Bot/magenta for ads, Zap/purple for optimizers, PenSquare/pink for content, Package/teal for inventory)
  - Status indicators: Completed (green check), Running (orange pulsing dot), Pending (gray clock), Failed (red X)
  - Relative timestamps (e.g., "2 hours ago")
  - Metric chips showing action results
- **Filter Tabs** — All, Ad Agent, Optimizer, Post Agent, Inventory Agent
- **Run Agent Button** — Trigger new agent analyses on demand

### 5.8 Content & Posts (`/content`)
**AI-powered social media content management.**

- **AI Content Generator** — Structured input form with:
  - Product/Collection selector (10 collections)
  - Platform selector (Facebook Feed, Instagram Feed, Facebook Story, Instagram Story)
  - Post Type selector (New Collection Launch, Sale Announcement, Behind the Scenes, Styling Tips, Customer Spotlight, Seasonal Promotion)
  - Language toggle (Estonian / English)
  - DeepSeek-powered copy generation producing structured output: Headline, Body Copy, Hashtags, Call-to-Action
- **Generated Output Display** — Formatted view with labeled sections, Copy to Clipboard, and Create Post actions
- **Posts Grid** — Card-based layout with platform badges, status indicators, language flags (🇪🇪/🇬🇧), content preview, scheduled dates, and action buttons (Edit, Delete)
- **Estonian Translation** — One-click "Tõlgi eesti keelde" button on English posts, with inline translation display and Replace with Translation option
- **Filter Tabs** — All, Scheduled, Drafts, Published with count badges

### 5.9 Campaigns & Ads (`/campaigns`)
**Ad campaign creation and budget management.**

- **Ad Drafts Tab:**
  - Create New Ad Draft form with campaign name, platform, collection, headline (40-char limit), primary text, language, and daily budget
  - AI Copy Generation with collection-specific Estonian templates
  - 4 pre-populated draft cards with status badges (Draft, Ready for Review, Approved)
  - Action buttons: Edit, Preview, Delete (with confirmation), Submit for Review

- **Budget Planner Tab:**
  - 4 stat cards: Total Budget, Active Campaigns, Average ROAS, Projected Revenue
  - Horizontal stacked bar showing budget allocation across all campaigns
  - ROAS vs Spend Efficiency Table — campaigns ranked by efficiency score, top 3 highlighted
  - Budget Simulator — "What if" calculator for shifting budget between campaigns with projected ROAS and revenue impact

- **Creative Library Tab:**
  - Visual asset gallery with placeholder creative cards
  - Upload interface for new creative assets

### 5.10 AI Strategy Agent (`/strategy`)
**Autonomous marketing strategy analysis.**

- **4 Data Snapshot Cards** — Auto-loaded: Total Ad Spend, Blended ROAS, Top Performing Campaign, Worst Performing Campaign
- **Campaign Performance Table** — All campaigns with AI-generated verdicts:
  - **Scale ↑** (green) for campaigns exceeding 5× ROAS
  - **Optimize →** (yellow) for campaigns between 3–5× ROAS
  - **Pause ↓** (red) for campaigns below 3× ROAS
- **Ask AI Strategy Agent** — Free-text input where users can ask strategic questions (e.g., "Where should I reallocate my budget?"). DeepSeek analyzes all campaign data and returns specific EUR-amount recommendations.
- **Quick Actions** — Export Strategy Report, Apply Recommendations, Schedule Weekly Analysis

### 5.11 Monthly Reports (`/reports`)
**Automated executive reporting.**

- **Report Header** — Month/year display with "Generated by AI Report Agent" badge
- **Export Options** — Download CSV, Export to Excel, Google Sheets
- **6-Section Report Grid:**
  1. Revenue Overview — Total revenue with growth percentage
  2. Marketing Summary — Spend, ROAS, top-performing channel
  3. Top Products — 5 best-selling products with revenue
  4. Channel Breakdown — Revenue distribution with colored percentage bars
  5. Top Collection — Best-performing fashion collection
  6. Key Highlights — AI-generated executive summary bullet points

### 5.12 Settings (`/settings`)
**Account and system configuration.**

- **Profile Section** — User avatar (44px), name, email, role badge (Administrator)
- **Notifications** — 5 toggle switches for Email Alerts, Push Notifications, Agent Activity Alerts, Inventory Warnings, Marketing Alerts. Toggles follow the design-system specification with smooth transitions and brand-colored active state.
- **Data Sources** — Connected integrations with green check indicators: Facebook Ads, Klaviyo, Google Analytics, Shopify
- **Regional Settings** — Currency (EUR), Timezone (Europe/Tallinn UTC+3), Language (English)
- **Security** — Password last changed, Two-factor authentication status (Enabled), Session timeout (24 hours)

---

## 6. AI & Agentic Layer

The dashboard is architected around an **agentic AI framework** where multiple specialized agents perform autonomous analysis and content generation.

### AI-Powered Features

| Feature | Page | AI Model | Function |
|---|---|---|---|
| **Dashboard Insights** | Overview | DeepSeek | Analyze KPIs, channels, and trends → 3 actionable recommendations |
| **Campaign Intelligence** | Marketing | DeepSeek | Cross-channel ROAS analysis, budget reallocation suggestions |
| **Content Generator** | Content | DeepSeek | Estonian social media copy (headline + body + hashtags + CTA) |
| **Estonian Translator** | Content | DeepSeek | English → Estonian transcreation with brand voice preservation |
| **Strategy Agent** | Strategy | DeepSeek | Campaign-level budget optimization with specific EUR recommendations |
| **Trend Analysis** | Trends | Rule-based + AI | Linear regression trend lines + AI-generated pattern insights |

### DeepSeek Integration Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  /api/deepseek   │────▶│  DeepSeek API     │
│  (Client)    │     │  (Next.js Route) │     │  deepseek-chat    │
│              │◀────│  Server-side     │◀────│  temp=0.5, 500tk  │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

- API key stored server-side in environment variables — never exposed to the client
- All AI requests proxied through `/api/deepseek` route for security
- System prompts enforce brand voice rules (formal Estonian "Teie" form, premium vocabulary, forbidden words)
- Fallback behavior: If the API is unavailable, rule-based analysis provides sensible defaults

### Brand Voice Agent Configuration

The Estonian Brand Voice agent operates with these constraints:
- **Tone:** Elegant, understated, Nordic minimalism
- **Formality:** Formal "Teie" (never casual "Sina")
- **Premium Vocabulary:** `elegants`, `ajatu`, `kvaliteet`, `naturaalne`, `luksuslik`
- **Forbidden Words:** `odav` (cheap), `allahindlus` (discount), `soodukas` (bargain)
- **Format Awareness:** Facebook posts ≤150 chars, Instagram ≤125 chars, Stories provide 3–5 word overlay
- **Hashtags:** Relevant Estonian hashtags with brand relevance

---

## 7. Data Layer

The dashboard operates on a **service-oriented data architecture** with a clear separation between data fetching and UI rendering.

### Service Architecture

| Service | Entities | Key Functions |
|---|---|---|
| `dashboardService` | KPIs, Time Series, Channels, Notifications, Reports | `getKPIs()`, `getTimeSeriesData()`, `getChannelData()`, `getNotifications()`, `getMonthlyReport()` |
| `facebookService` | Facebook Campaigns, Ad Metrics | `getFacebookCampaigns()`, `getFacebookMetrics()`, `getFacebookCampaignById()` |
| `klaviyoService` | Email Marketing | `getKlaviyoMetrics()`, `getKlaviyoMonthlyData()` |
| `analyticsService` | Google Analytics | `getGoogleAnalyticsMetrics()`, `getTopLandingPages()`, `getTrafficOverview()` |
| `inventoryService` | Products, Forecasts, Classification | `getInventory()`, `getForecasts()`, `getProductClassification()` |
| `currencyService` | Exchange Rates | `getCurrentExchangeRate()`, `getExchangeRateHistory()`, `convertUsdToEur()` |
| `agentService` | Agent Actions, Metrics, Posts | `getAgentActions()`, `getAgentMetrics()`, `getScheduledPosts()` |

### Data Characteristics
- **Realistic fashion e-commerce data** spanning 10 collections: Summer Breeze, Linen Luxe, Evening Bloom, Urban Edge, Boho Spirit, Classic Core, Coastal Charm, Minimal Muse, Bold Statement, Eco Essence
- **200+ inventory items** with unique SKUs, realistic Baltic suppliers, proper stock levels, and sales velocities
- **365-day time series data** with daily granularity for revenue, orders, marketing spend, ROAS, sessions, and conversion rates
- **Multi-currency support** with USD/EUR exchange rate history
- **ISO 8601 timestamps** throughout for consistent date handling

---

## 8. Chart System

Six specialized chart components built on Recharts, all following the dark-first design system.

### Chart Components

| Component | Type | Features |
|---|---|---|
| **TimeSeriesChart** | Multi-metric area chart | Per-metric SVG gradient fills, interactive tooltip with formatted values, compact axis formatting, legend |
| **TrendChart** | Area + trend line | Linear regression overlay (dashed), combined actual + predicted visualization |
| **ChannelBarChart** | Horizontal bars | Individually colored bars, value labels at bar ends, channel name axis |
| **DonutChart** | Donut/pie | 60% inner radius, center total label, percentage legend, per-segment tooltip |
| **Sparkline** | Pure SVG polyline | Zero-dependency inline chart, 120×32 viewBox, normalized data, gradient fill |
| **MetricGauge** | Circular progress arc | SVG stroke-dashoffset animation, center value + unit display, smooth CSS transitions |

### Chart Design Principles
- All charts use the **brand color palette**: magenta, purple, sky blue, teal, orange, pink across series
- **Custom dark tooltips** with `rgba(255,255,255,0.1)` backgrounds and semantic color indicators
- **Grid lines** at 30% opacity for subtle reference without visual noise
- **Axis labels** in `--body-subtle` (#6B7280) at 12px for readability without dominance
- Every chart handles **loading** (skeleton shimmer), **empty** ("No data available"), and **error** states

---

## 9. Navigation & Shell

### Sidebar
- **Width:** 256px expanded, 68px collapsed (smooth 300ms CSS transition)
- **Brand Section:** TallinnDoll logo text with magenta indicator dot
- **Navigation Structure:**
  - **Primary (7 items):** Overview, Revenue Analytics, Marketing, Inventory, Forecast, Trends, Agent Activity (with notification badge)
  - **Secondary (5 items):** Campaigns & Ads, Content & Posts, Strategy Agent, Reports, Settings
- **Active State:** `rgba(255,255,255,0.2)` background with brand-colored text, 2px border radius
- **Collapse Toggle:** PanelLeftClose/PanelLeft icon in the header area
- **User Footer:** Avatar (32px), name, role with top border separator

### Header
- **Height:** 56px (7 × 8px grid units)
- **Left:** Mobile menu toggle + page title (16px semibold)
- **Right:** Search input → Notification bell (with danger badge) → Theme toggle (Sun/Moon) → User avatar → Date
- **Notification Badge:** Red pill with count (capped at "9+"), absolute positioned
- **Theme Toggle:** Persisted to localStorage, instant CSS variable swap via `data-theme` attribute

---

## 10. State Management

The dashboard uses **localized React state management** — no external state library needed for this architecture.

### Pattern
- `useState` + `useEffect` for data fetching per page
- `useCallback` for memoized data fetching functions
- `useMemo` for derived/computed data (filtering, sorting, pagination)
- `useRef` for animation frame references (count-up animations)
- Custom hooks: `useDebounce` (input debouncing), `useTheme` (dark/light mode context)

### Data Flow
```
Service Layer (async)
    ↓
useEffect → setState
    ↓
Derived State (useMemo)
    ↓
Component Render
```

Each page is self-contained — data is fetched when the component mounts and when filters/timeframes change. No cross-page state dependency.

---

## 11. API Routes

### `POST /api/deepseek`
**Secure server-side proxy for the DeepSeek chat API.**

- **Input:** `{ systemPrompt: string, userPrompt: string }`
- **Processing:** Forwards to `https://api.deepseek.com/v1/chat/completions` with the `deepseek-chat` model
- **Parameters:** Temperature 0.5, max 500 tokens — optimized for concise, actionable responses
- **Response:** `{ result: string }` — the AI-generated text
- **Error Handling:** Returns 500 if API key is missing, forwards DeepSeek error codes otherwise
- **Security:** API key stored in `DEEPSEEK_API_KEY` environment variable — never exposed to client

---

## 12. Accessibility & Responsiveness

### Accessibility (WCAG 2.2 AA Baseline)
- **Semantic HTML:** Proper heading hierarchy (`h1` → `h6`), `<nav>`, `<main>`, `<button>` for actions
- **Keyboard Navigation:** All interactive elements reachable via Tab, focus indicators via `:focus-visible`
- **Color Contrast:** `--heading` text meets 4.5:1 ratio against `--neutral-primary-soft` backgrounds in both themes
- **Color Independence:** Status communicated through icons + text + color (never color alone)
- **Motion:** `prefers-reduced-motion` respected — all animations disabled, instant transitions
- **Touch Targets:** Minimum 44×44px touch targets per WCAG 2.5.8 (AA)

### Responsive Breakpoints
| Breakpoint | Width | Layout Adaptation |
|---|---|---|
| Mobile (default) | < 640px | Single column, sidebar hidden (overlay on toggle) |
| Small | ≥ 640px | 2-column grids |
| Medium | ≥ 768px | Sidebar visible, expanded header |
| Large | ≥ 1024px | 3–4 column grids, full header with date |
| Extra Large | ≥ 1280px | 5-column KPI grid, maximum content width |

### Mobile Features
- Sidebar hidden by default, triggered via hamburger menu
- Backdrop overlay with blur when sidebar is open
- Touch-optimized filter controls and button sizes
- Content reflows to single column without horizontal scroll

---

## 13. Deployment

### Production Build
```bash
npm run build   # Next.js production build with Turbopack
npm start       # Start production server on port 3000
```

### Environment Variables
| Variable | Required | Description |
|---|---|---|
| `DEEPSEEK_API_KEY` | Yes (for AI features) | DeepSeek API key from platform.deepseek.com |

### Platform Support
- **Vercel:** Zero-config deployment. Set `DEEPSEEK_API_KEY` in Environment Variables.
- **Any Node.js Host:** Standard Next.js build + start workflow.
- **Docker:** Standard Next.js Dockerfile with `node:20-alpine` base image.

---

## Project Statistics

| Metric | Count |
|---|---|
| **Total Pages/Routes** | 12 + API route |
| **Components** | 20+ (6 charts, 6 dashboard shell, 8+ page-level) |
| **Data Services** | 7 (dashboard, facebook, klaviyo, analytics, inventory, currency, agent) |
| **TypeScript Types** | 35+ interfaces and type aliases |
| **CSS Custom Properties** | 150+ design tokens |
| **Chart Types** | 6 (area, trend, bar, donut, sparkline, gauge) |
| **AI Integration Points** | 5 (insights, campaign intelligence, content generation, translation, strategy) |
| **Supported Languages** | Estonian (primary), English |
| **Theme Modes** | Dark (default) + Light |

---

*TallinnDoll Agentic Dashboard — Built for the modern fashion e-commerce brand.*
