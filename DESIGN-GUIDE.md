# TallinnDoll Dashboard — Design Guide

> **Complete visual design language, component specifications, and pattern library.**  
> Every token, component, and interaction pattern documented for design consistency.

---

## Table of Contents
1. [Brand Identity](#1-brand-identity)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Border Radius](#5-border-radius)
6. [Shadows & Elevation](#6-shadows--elevation)
7. [Borders](#7-borders)
8. [Theme System](#8-theme-system)
9. [Component Specifications](#9-component-specifications)
10. [Chart Design](#10-chart-design)
11. [Icon System](#11-icon-system)
12. [Animation & Motion](#12-animation--motion)
13. [Accessibility Standards](#13-accessibility-standards)
14. [Responsive Guidelines](#14-responsive-guidelines)

---

## 1. Brand Identity

### Brand Personality
TallinnDoll is a **premium Estonian fashion brand** — elegant, understated, Nordic minimalism. The design language reflects this through precise geometry, restrained color, generous whitespace, and an agentic AI-first aesthetic.

### Design Principles
| Principle | Expression |
|---|---|
| **Precision** | 2px radius everywhere, 8px grid, no arbitrary values |
| **Depth** | Layered atmospheric backgrounds, magenta-to-purple gradients |
| **Intelligence** | AI agent status indicators, proactive insight panels, sparkle accents |
| **Restraint** | Minimal visible controls — the interface reveals complexity on demand |
| **Authority** | Bold sans-serif typography, confident accent color, measured spacing |

### Visual References
- Inspired by modern SaaS platforms (Zixflow, Linear, Vercel)
- Dark-first with light mode as a deliberate alternative
- Agentic UI patterns: conversation cards, outcome summaries, status indicators

---

## 2. Color System

### 2.1 Brand Colors

| Token | Hex | HSL | Usage |
|---|---|---|---|
| `brand-strong` | `#C8399C` | `318° 56% 50%` | Primary buttons, active links |
| `brand` | `#D94FB0` | `318° 65% 58%` | Icons, focus rings, indicators |
| `brand-soft` | `#5C1A46` | `320° 56% 23%` | Hover backgrounds (dark) |
| `brand-softer` | `#2D0E22` | `321° 53% 12%` | AI insight cards, agent panels |

### 2.2 Brand Gradient
```css
background: linear-gradient(135deg, #C8399C 0%, #7C3AED 100%);
```
- Used for: Primary CTA buttons, active tab indicators, hero accents
- Hover state: Same gradient at 90% opacity or shifted darker
- Never used as text color — only backgrounds and decorative elements

### 2.3 Neutral Palette (Dark Mode Default)

| Token | Value | Usage |
|---|---|---|
| `neutral-primary` | `#0a0a0a` | Page background |
| `neutral-primary-soft` | `rgba(255,255,255,0.05)` | Card backgrounds |
| `neutral-secondary-medium` | `rgba(255,255,255,0.1)` | Input backgrounds, hover states |
| `neutral-secondary-strong` | `rgba(255,255,255,0.2)` | Active sidebar items |
| `neutral-tertiary-medium` | `rgba(255,255,255,0.2)` | Elevated surfaces |
| `neutral-quaternary` | `rgba(255,255,255,0.2)` | Toggle tracks (off state) |

### 2.4 Neutral Palette (Light Mode)

| Token | Value | Usage |
|---|---|---|
| `neutral-primary` | `#FFFFFF` | Page background |
| `neutral-primary-soft` | `#FFFFFF` | Card backgrounds |
| `neutral-secondary-soft` | `#F9FAFB` | Alternating section backgrounds |
| `neutral-tertiary-soft` | `#F3F4F6` | Input backgrounds (light) |
| `neutral-quaternary` | `#E5E7EB` | Toggle tracks, muted elements |

### 2.5 Semantic Colors

| Token | Dark | Light | Usage |
|---|---|---|---|
| `success` | `#009966` | `#007A55` | Positive trends, completed states |
| `success-soft` | `#002C22` | `#ECFDF5` | Success backgrounds |
| `warning` | `#F97316` | `#F97316` | Caution, pending states |
| `warning-soft` | `#7C2D12` | `#FFF7ED` | Warning backgrounds |
| `danger` | `#C70036` | `#C70036` | Errors, destructive actions |
| `danger-soft` | `#4D0218` | `#FEF0F2` | Error backgrounds |

### 2.6 Text Colors

| Token | Dark | Light | Usage |
|---|---|---|---|
| `heading` | `#FFFFFF` | `#111827` | All headings, bold text |
| `body` | `#a1a1aa` | `#4B5563` | Paragraphs, descriptions |
| `body-subtle` | `#6B7280` | `#6B7280` | Labels, metadata, timestamps |
| `fg-brand` | `#E876C0` | `#C8399C` | Brand-colored text, links |
| `fg-brand-strong` | `#F0C4DE` | `#A52D80` | Strong brand emphasis |

### 2.7 Border Colors

| Token | Dark | Light | Usage |
|---|---|---|---|
| `border-default` | `rgba(255,255,255,0.1)` | `#E5E7EB` | Card borders, table borders |
| `border-default-medium` | `rgba(255,255,255,0.2)` | `#E5E7EB` | Input borders |
| `border-brand` | `#E876C0` | `#C8399C` | Focus rings, active borders |
| `border-brand-subtle` | `#5C1A46` | `#F0C4DE` | AI card borders |
| `border-success` | `#065F46` | `#047857` | Success borders |
| `border-danger` | `#BE123C` | `#BE123C` | Error borders |

### 2.8 Chart Palette

| Index | Color | Hex | Use Case |
|---|---|---|---|
| 1 | Magenta | `#D94FB0` | Primary metric, revenue |
| 2 | Purple | `#8B5CF6` | Secondary metric, orders |
| 3 | Sky | `#38BDF8` | Tertiary, sessions |
| 4 | Teal | `#14B8A6` | ROAS, conversions |
| 5 | Orange | `#FB923C` | Marketing spend |
| 6 | Cyan | `#22D3EE` | Additional series |
| 7 | Fuchsia | `#D946EF` | Additional series |
| 8 | Indigo | `#6366F1` | Additional series |

### 2.9 Color Usage Rules
- **Never use raw hex values** in component code — always reference CSS custom properties
- **Primary CTA gets brand gradient** — strongest visual weight on the page
- **Brand text color only for links and emphasis** — never for long-form paragraphs
- **Status colors always paired with icons** — never rely on color alone
- **Backgrounds use neutral tokens only** — brand backgrounds reserved for AI/insight cards

---

## 3. Typography

### 3.1 Font Families

| Role | Font | Weights | Usage |
|---|---|---|---|
| **Primary (UI)** | Lato | 400, 700, 900 | All interface text, headings, labels |
| **Monospace** | Geist Mono / JetBrains Mono | 400, 500, 600, 700 | Data tables, numeric displays, code |

### 3.2 Type Scale

| Level | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **h1** | 60px | 700 (Bold) | 1.0 | Hero pages (rarely used in dashboard) |
| **h2** | 44px | 700 (Bold) | 1.15 | Major section headers |
| **h3** | 36px | 600 (Semibold) | 1.2 | Page titles (marketing pages) |
| **h4** | 30px | 600 (Semibold) | 1.25 | Dashboard page titles (28px actual) |
| **h5** | 24px | 600 (Semibold) | 1.5 | Section headers |
| **h6** | 20px | 600 (Semibold) | 1.25 | Card titles |
| **Body** | 16px | 400 (Regular) | 1.7 | Paragraphs |
| **Body Small** | 14px | 400 (Regular) | 1.6 | UI text, descriptions |
| **Caption** | 12px | 500 (Medium) | 1.5 | Labels, metadata |
| **Micro** | 10px | 700 (Bold) | 1.2 | KPI labels, badge text, overlines |

### 3.3 Heading Rules
- **Page titles use 28px semibold** — not the full h4 scale. Dashboard headings are constrained for density.
- **Card titles use 16px semibold** — never compete with the page title.
- **Footer/sidebar labels use 14px** — structural navigation, not content headings.
- **Stat/metric numerals are NOT headings** — use `<p>` with display sizing, not `<h2>`/`<h3>`.

### 3.4 Body Text Rules
- **Paragraphs:** 16px, 1.7 line-height, max-width ~65 characters
- **Leading paragraph:** 20px, body color, max-width ~70 characters
- **UI text:** 14px, body color
- **Links:** fg-brand color, underline in body text only (never in navigation)

### 3.5 Text Formatting
- **ALL CAPS:** Only for short labels ≤ 2 words. Always add `tracking-widest` (0.4px+).
- **Bold:** Use `font-semibold` (600) for headings, `font-bold` (700) for emphasis.
- **Italic:** Reserved for quotes, generated content previews, foreign terms.
- **Underline:** Reserved exclusively for inline body-text links. Never on buttons, navigation, or headings.

---

## 4. Spacing & Layout

### 4.1 Grid System
- **Base Unit:** 8px — all spacing values must be multiples of 8
- **Allowed Values:** 4, 8, 12, 16, 20, 24, 32, 48, 64, 96px

### 4.2 Spacing Scale

| Token | Value | Usage |
|---|---|---|
| **Micro** | 4–8px | Icon-to-label, badge padding, dot indicators |
| **Tight** | 8–12px | Within-component gaps, label-to-field |
| **Default** | 16px | Sibling components, flex row gaps |
| **Medium** | 24px | Card grid gaps, section internal spacing |
| **Loose** | 32–48px | Between major content blocks |
| **Section** | 64–96px | Page section vertical padding |

### 4.3 Layout Container
| Type | Max Width | Horizontal Padding |
|---|---|---|
| **Dashboard Pages** | 1200px | 24px |
| **Reading/Form Columns** | 768px | 24px |
| **Full-Width Sections** | 100% | 24px |

### 4.4 Section Rhythm
- **Section vertical padding:** 96px top and bottom
- **Section header → content:** 48–64px margin
- **Heading → paragraph:** 16px margin-bottom (heading owns the space)
- **Paragraph → paragraph:** ~16px (≈ 1em)

### 4.5 Proximity Rules
- **Inner spacing < Outer spacing** — elements within a group must be closer than the space around the group
- **Label-to-field (8px) < Field-to-next-label (16–24px)** — the proximity hierarchy creates visual groups
- **At least 3 spacing tiers** in every layout — tight, default, and loose must be visibly distinct

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `base` | **2px** | Cards, buttons, inputs, modals, sections, dropdowns, tooltips |
| `sm` | 2px | Checkboxes, tiny elements |
| `full` | 9999px | Pills, avatars, toggles, dot indicators, notification badges |

### Radius Rules
- **2px is the universal default** — the entire product uses one consistent radius
- **Never use arbitrary values** — no 4px, 6px, 8px, 12px, 16px rounding
- **Nested radius formula:** `innerRadius = outerRadius − padding` — when a rounded parent contains a child with padding
- **Component families must match** — all buttons use 2px, all cards use 2px, all inputs use 2px

---

## 6. Shadows & Elevation

### 6.1 Shadow Tokens

| Token | CSS Value | Elevation |
|---|---|---|
| `shadow-2xs` | `0 1px rgb(0 0 0 / 0.04)` | Subtle texture |
| `shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Cards, buttons, inputs |
| `shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)` | Interactive cards |
| `shadow-md` | `0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.04)` | Dropdowns, popovers |
| `shadow-lg` | `0 12px 20px -4px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.03)` | Sticky headers |
| `shadow-xl` | `0 20px 28px -6px rgb(0 0 0 / 0.1), 0 8px 12px -6px rgb(0 0 0 / 0.04)` | Modals |
| `shadow-2xl` | `0 28px 56px -16px rgb(0 0 0 / 0.2)` | Hero overlays (sparingly) |

### 6.2 Elevation Mapping

| Component | Shadow | Z-Index Layer |
|---|---|---|
| Static cards | `shadow-xs` | Surface (0) |
| Interactive cards (hover) | `shadow-sm` | Surface + 1 |
| Buttons, inputs | `shadow-xs` | Surface (0) |
| Dropdown menus | `shadow-md` | Overlay (10) |
| Sticky headers | `shadow-lg` | Sticky (20) |
| Modals | `shadow-xl` | Modal (40) |
| Tooltips | `shadow-xs` | Tooltip (50) |

### 6.3 Shadow Rules
- **Single light source** — all shadows cast downward (light from above)
- **Hover states** — step up by one elevation level
- **Never stack shadows** — one token per element
- **Never use shadow-xl/2xl for dense content** — reserved for overlays

---

## 7. Borders

### 7.1 Border Widths

| Context | Width |
|---|---|
| Default (inputs, buttons, cards) | 1px |
| Emphasis / Focus | 2px |
| Active tab indicator | 2px |

### 7.2 Border Rules
- **Solid borders by default** — dashed only for file dropzones
- **Components in the same family share border width** — never mix 1px and 2px within a component
- **Prefer spacing over borders** — use proximity to group before adding dividers
- **Card borders:** 1px, `border-default` color

---

## 8. Theme System

### 8.1 Architecture
The dashboard uses **CSS custom properties** with a `data-theme` attribute for mode switching:

```css
:root {
  /* Dark mode defaults */
  --neutral-primary: #0a0a0a;
  --heading: #FFFFFF;
  /* ... 150+ tokens ... */
}

[data-theme="light"] {
  /* Light mode overrides */
  --neutral-primary: #FFFFFF;
  --heading: #111827;
  /* ... 150+ tokens ... */
}
```

### 8.2 Toggle Mechanism
- User clicks Sun/Moon icon in header
- `ThemeProvider` context toggles `data-theme` attribute on `<html>`
- Preference persisted to `localStorage` (`agentic-theme`)
- All 150+ tokens swap instantly — no FOUC (Flash of Unstyled Content)

### 8.3 Mode Guidelines
- **Dark is default** — the product is designed dark-first
- **Light mode maintains the same hierarchy** — only color tokens change, never sizes or weights
- **Test every component in both modes** — contrast ratios must pass in both

---

## 9. Component Specifications

### 9.1 Buttons

#### Brand (Primary)
```css
background: linear-gradient(135deg, #C8399C 0%, #7C3AED 100%);
border: 1px solid transparent;
border-radius: 2px;
box-shadow: var(--shadow-xs);
color: #FFFFFF;
font-size: 14px;
font-weight: 600;
padding: 10px 16px;
transition: opacity 200ms;
```
- **Hover:** Opacity 0.9 or slightly darker gradient
- **Focus:** 2px brand ring (`#D94FB0`), 2px offset
- **Disabled:** 60% opacity, `cursor: not-allowed`

#### Secondary
```css
background: var(--neutral-secondary-medium);
border: 1px solid var(--border-default-medium);
border-radius: 2px;
color: var(--body);
font-size: 14px;
font-weight: 500;
padding: 10px 16px;
```
- **Hover:** `neutral-tertiary-medium` background, `heading` text color

#### Ghost
```css
background: transparent;
border: 1px solid transparent;
border-radius: 2px;
color: var(--heading);
font-size: 14px;
font-weight: 500;
padding: 10px 16px;
```
- **Hover:** `neutral-secondary-medium` background
- **No shadow**

#### Button Sizes

| Size | Font | H-Padding | V-Padding |
|---|---|---|---|
| XS | 12px | 12px | 6px |
| SM | 14px | 12px | 8px |
| **Base** | **14px** | **16px** | **10px** |
| LG | 16px | 20px | 12px |
| XL | 16px | 24px | 14px |

#### Button Rules
- **Labels never wrap** — `white-space: nowrap`
- **Adjacent buttons share the same size** — height and padding must match
- **Only primary action gets brand gradient** — secondary and tertiary are subdued
- **Icons in buttons:** 16×16px, 8px gap from label

---

### 9.2 Cards

```css
background: var(--neutral-primary-soft);      /* rgba(255,255,255,0.05) dark / #FFFFFF light */
border: 1px solid var(--border-default);       /* rgba(255,255,255,0.1) dark / #E5E7EB light */
border-radius: 2px;
box-shadow: var(--shadow-xs);                  /* 0 1px 2px 0 rgb(0 0 0 / 0.04) */
```

#### Card Types
| Type | Background | Border | Shadow | Hover |
|---|---|---|---|---|
| **Static** | `neutral-primary-soft` | `border-default` | `shadow-xs` | None |
| **Interactive** | Same | Same | `shadow-xs` | `neutral-secondary-medium` bg |
| **AI/Insight** | `brand-softer` | `border-brand-subtle` | None | None |

#### Card Anatomy
- **Heading:** 16–20px, semibold, `heading` color
- **Padding:** 16–20px (4–5 × 4px units)
- **Footer actions:** Separated by top border, right-aligned buttons

---

### 9.3 Inputs & Form Controls

```css
background: var(--neutral-secondary-medium);  /* rgba(255,255,255,0.1) dark / #F9FAFB light */
border: 1px solid var(--border-default-medium);
border-radius: 2px;
color: var(--heading);
font-size: 14px;
padding: 10px 12px;
transition: all 200ms;
```

#### Input States
| State | Border | Ring | Background |
|---|---|---|---|
| **Default** | `border-default-medium` | None | `neutral-secondary-medium` |
| **Hover** | `border-default-strong` | None | Same |
| **Focus** | `border-brand` | 1px `brand` | Same |
| **Error** | `border-danger` | 1px `danger` | Same |
| **Disabled** | `border-default` | None | `disabled` token, `fg-disabled` text |

#### Input with Icons
- Icon: 16×16px, `body` color
- Start icon: 12px left position → input gets 36px left padding
- End icon: 12px right position → input gets 36px right padding

#### Select Dropdowns
- Strip native arrow: `appearance: none`
- Custom chevron: 16×16px SVG, positioned 12px from right edge
- Dark mode: `color-scheme: dark` for option list

---

### 9.4 Tables

```css
/* Wrapper */
background: var(--neutral-primary-soft);
border: 1px solid var(--border-default);
border-radius: 2px;
box-shadow: var(--shadow-xs);
overflow-x: auto;

/* Header */
background: var(--neutral-secondary-soft);
border-bottom: 1px solid var(--border-default);
font-size: 14px;
font-weight: 500;
color: var(--body);
padding: 12px 24px;

/* Body Cell */
padding: 16px 24px;
font-size: 14px;
color: var(--body);
border-bottom: 1px solid var(--border-default);  /* omit on last row */

/* Row Hover */
background: var(--neutral-secondary-soft);
```

#### Table Rules
- **Left-align text, right-align numbers** — never center table content
- **Last row:** Omit bottom border to avoid doubling with wrapper
- **Row headers:** Always use `scope="row"` for accessibility
- **Responsive:** Wrapper must have `overflow-x: auto` for horizontal scroll

---

### 9.5 Tabs

#### Underline Variant (Default)
```
Wrapper: bottom border border-default
Tab Item: 16px h-padding, 16px v-padding, 2px bottom border (transparent default)
Active: fg-brand text + brand bottom border
Inactive: body text, hover → heading text + border-default-strong
Disabled: fg-disabled text, not-allowed cursor
```

#### Pill Variant
```
Tab Item: 16px h-padding, 10px v-padding, 2px radius, medium weight
Active: brand gradient background, white text, shadow-sm
Inactive: body text, hover → neutral-secondary-soft background
```

---

### 9.6 Badges

| Variant | Background | Border | Text |
|---|---|---|---|
| **Brand** | `brand-softer` | `border-brand-subtle` | `fg-brand-strong` |
| **Success** | `success-soft` | `border-success-subtle` | `fg-success-strong` |
| **Warning** | `warning-soft` | `border-warning-subtle` | `fg-warning` |
| **Danger** | `danger-soft` | `border-danger-subtle` | `fg-danger-strong` |
| **Neutral** | `neutral-primary-medium` | `border-default` | `heading` |

- **Size:** 12px font, 6px h-padding, 2px v-padding
- **Radius:** 2px (default) or 9999px (pill)
- **Rules:** Badges are inline, content-sized — never full-width

---

### 9.7 Toggle Switches

```css
/* Track */
width: 40px; height: 20px; border-radius: 9999px;
background: var(--neutral-quaternary);           /* Off */
background: var(--brand);                        /* On */

/* Thumb */
width: 16px; height: 16px; border-radius: 9999px;
background: #FFFFFF;
box-shadow: 0 1px 2px rgba(0,0,0,0.1);
transform: translateX(2px);                      /* Off */
transform: translateX(22px);                     /* On */
transition: transform 150ms, background 150ms;
```

---

### 9.8 Sidebar

```css
background: var(--neutral-primary-soft);
border-right: 1px solid var(--border-default);
width: 256px;                                     /* Expanded */
width: 68px;                                      /* Collapsed */
transition: width 300ms ease-in-out;
```

#### Sidebar Anatomy
- **Brand Section:** Logo + magenta dot indicator, 56px height, bottom border
- **Nav Items:** 8px v-padding, 8px h-padding, 2px radius, heading text
- **Active Item:** `neutral-secondary-strong` background, `fg-brand-strong` text
- **Icons:** 20×20px, `body` color default, `heading` color on hover
- **Separator:** Top border, 16px top padding + margin
- **User Footer:** Avatar 32px, top border, name + role

---

### 9.9 Header

```css
height: 56px;                                      /* 7 × 8px */
border-bottom: 1px solid var(--border-default);
background: var(--neutral-primary);
```

#### Header Anatomy
- **Left:** Mobile menu (hidden on desktop) + page title (16px semibold)
- **Center (implied):** Flexible spacer
- **Right:** Search (200px, hidden mobile) → Bell (with badge) → Theme toggle → User → Date
- **Search:** 2px radius, `neutral-secondary-medium` bg, `border-default-medium`, 14px font

---

### 9.10 KPI Card

```css
background: var(--neutral-primary-soft);
border: 1px solid var(--border-default);
border-radius: 2px;
box-shadow: var(--shadow-xs);
padding: 16px;                                     /* Default */
padding: 12px;                                     /* Compact */
```

#### KPI Card Anatomy
- **Label:** 10px, bold, uppercase, tracking-widest, `body-subtle` color, wraps naturally
- **Value:** 26px (default) / 20px (compact), bold, `heading` color, tracking-tight, truncates if needed
- **Trend:** 11px, semibold, success green (↑) or danger red (↓) with icon

---

### 9.11 Modals

```css
/* Overlay */
position: fixed; inset: 0; z-index: 40;
background: rgba(0,0,0,0.5);
backdrop-filter: blur(4px);

/* Content */
background: var(--neutral-primary);
border-radius: 2px;
box-shadow: var(--shadow-xl);
padding: 20px;
```

#### Modal Rules
- **Role:** `role="dialog"` with focus trap
- **Close:** X button (ghost), Escape key, backdrop click
- **Header/Footer:** Separated by `border-default` borders

---

## 10. Chart Design

### 10.1 Chart Canvas
```css
background: transparent;                           /* Charts inherit card background */
font-family: Lato, system-ui, sans-serif;
```

### 10.2 Chart Elements

| Element | Style |
|---|---|
| **Grid Lines** | `border-default` at 30% opacity, dashed optional |
| **Axis Labels** | 12px, `body-subtle` color, Lato |
| **Axis Lines** | `border-default`, 1px |
| **Tooltip Background** | `rgba(255,255,255,0.1)`, 2px radius, `shadow-xs` |
| **Tooltip Text** | 14px, `heading` color for values, `body` for labels |
| **Legend** | 14px, `body` color, positioned below chart |

### 10.3 Chart Colors by Series
First series always uses magenta (`#D94FB0`), second uses purple (`#8B5CF6`), continuing through the 8-color palette. This ensures consistent visual hierarchy across all charts.

### 10.4 Chart States
- **Loading:** Skeleton shimmer matching chart dimensions
- **Empty:** "No data available" centered, `body-subtle` color
- **Error:** Retry button with error message

### 10.5 Gradient Fills
All area-based charts use SVG `<linearGradient>` definitions:
- **Top:** Brand color at 20% opacity
- **Bottom:** Brand color at 2% opacity
- Creates a subtle, atmospheric fill without obscuring the grid

---

## 11. Icon System

### 11.1 Icon Library
**Lucide React v1.21** — consistently stroked, pixel-perfect icons.

### 11.2 Icon Sizes

| Size | Dimensions | Usage |
|---|---|---|
| XS | 12×12px | Inline indicators, badge icons |
| SM | 14×14px | Compact UI, tooltip triggers |
| **Default** | **16×16px** | Buttons, inputs, navigation |
| MD | 20×20px | Sidebar navigation |
| LG | 24×24px | Feature icons, empty states |
| XL | 48×48px | Hero illustrations |

### 11.3 Icon Colors
- **Default:** `body` color (`#a1a1aa` dark / `#4B5563` light)
- **Interactive:** `body-subtle` default → `heading` on hover
- **Active:** `fg-brand-strong` or `brand`
- **Semantic:** Success green, warning orange, danger red per context

### 11.4 Icon Rules
- **One icon family** — never mix Lucide with other libraries
- **Consistent stroke width** — Lucide's default 2px stroke
- **Accessible labels** — `aria-label` on icon-only buttons, decorative icons use `aria-hidden="true"`
- **No emoji as icons** — use proper SVG icons for all UI elements

---

## 12. Animation & Motion

### 12.1 Timing Tokens

| Context | Duration | Easing |
|---|---|---|
| Page entrance (fade in) | 350ms | `ease-out` |
| Hover transitions | 150ms | `ease-out` |
| Active/press | 100ms | `ease-out` |
| Modal open | 200ms | `ease-out` |
| Sidebar expand/collapse | 300ms | `ease-in-out` |
| Loading shimmer | 1500ms | `linear` (infinite) |
| Value gauge | 600ms | `cubic-bezier(0.4, 0, 0.2, 1)` |

### 12.2 Animation Catalog

| Animation | Trigger | Behavior |
|---|---|---|
| **fadeIn** | Element mount | `opacity 0→1`, `translateY(8px→0)` |
| **fadeInUp** | Section mount | `opacity 0→1`, `translateY(16px→0)` |
| **shimmer** | Loading state | Gradient sweep left→right, infinite |
| **pulse-soft** | Running status | `opacity 1→0.6→1`, 2s cycle |
| **stagger-children** | Parent mount | Each child delayed by 0.05s increments |

### 12.3 Motion Rules
- **Respect `prefers-reduced-motion`** — disable all animations, use instant transitions
- **No animation on body copy** — text must be readable at rest
- **One orchestrated entrance per page** — use stagger-children for lists
- **State transitions only** — motion must serve feedback, navigation, or hierarchy
- **No infinite animations except loaders** — and loaders must not flash >3 times/sec

---

## 13. Accessibility Standards

### 13.1 Target Level
**WCAG 2.2 Level AA** — all components and pages must meet this baseline.

### 13.2 Contrast Requirements

| Element | Minimum Ratio |
|---|---|
| Body text (< 18pt) | **4.5:1** against background |
| Large text (≥ 18pt / 24px) | **3:1** against background |
| UI components & icons | **3:1** against adjacent colors |
| Focus indicators | **3:1** against both component and page background |

### 13.3 Focus Management
- **`:focus-visible`** used everywhere — mouse clicks don't show rings, keyboard navigation does
- **Focus ring:** 2px solid, `brand` color, 2px offset
- **Never `outline: none`** without a custom replacement
- **Tab order matches visual order** — no `tabindex` values > 0

### 13.4 Keyboard Support
- **All interactive elements reachable via Tab**
- **Buttons:** Space and Enter to activate
- **Links:** Enter to activate
- **Modals:** Focus trapped inside, Escape to close
- **Dropdowns:** Arrow keys to navigate, Enter to select, Escape to close

### 13.5 Screen Reader Support
- **Semantic HTML:** `<nav>`, `<main>`, `<header>`, `<button>`, `<a>` used correctly
- **Heading hierarchy:** One `<h1>` per page, no skipped levels
- **Labels:** Every input has associated `<label>` with matching `htmlFor`
- **ARIA:** Used only when semantic HTML is insufficient — `aria-label`, `aria-pressed`, `aria-expanded`, `aria-busy`, `aria-live`

### 13.6 Color & Perception
- **Never rely on color alone** — pair with icons, text, shapes, or patterns
- **Test with color blindness simulators** (protanopia, deuteranopia, tritanopia)
- **Focus indicators visible** on all backgrounds including hover/active states

### 13.7 Motion Safety
- **`prefers-reduced-motion: reduce`** respected everywhere
- **No flashing content** — zero elements flash >3 times per second
- **Static end-state** for every animation — content usable without motion

---

## 14. Responsive Guidelines

### 14.1 Breakpoints

| Name | Width | Design Adaptation |
|---|---|---|
| **Mobile** | < 640px | Single column, sidebar hidden, simplified header |
| **Small** | ≥ 640px | 2-column grids, some header elements visible |
| **Medium** | ≥ 768px | Sidebar visible, expanded navigation |
| **Large** | ≥ 1024px | 3–4 column grids, full header with date |
| **XL** | ≥ 1280px | 5-column KPI grid, maximum content width (1200px) |

### 14.2 Mobile-First Principles
- **Design for 360px first** — the most constrained viewport
- **Content decides breakpoints** — not device lists
- **Components respond to container, not viewport** — use container queries where appropriate

### 14.3 Responsive Patterns

| Element | Mobile | Tablet | Desktop |
|---|---|---|---|
| **KPI Grid** | 1 col | 2 cols | 4–5 cols |
| **Card Grid** | 1 col | 2 cols | 3 cols |
| **Sidebar** | Hidden (overlay) | Visible (256px) | Visible (256px) |
| **Header Search** | Hidden | Visible (180px) | Visible (200px) |
| **Tables** | Horizontal scroll | Horizontal scroll | Full width |
| **Page Padding** | 16px | 24px | 24px |
| **Section Gaps** | 16px | 24px | 24–32px |

### 14.4 Touch Targets
- **Minimum:** 44×44px per WCAG 2.5.8 (AA)
- **Recommended:** 48×48px for primary actions
- **Spacing:** ≥ 8px between adjacent interactive targets
- **Mobile inputs:** Font size ≥ 16px to prevent auto-zoom

---

## Appendix A: CSS Variable Reference

### Quick Reference — Most Used Tokens

```css
/* Backgrounds */
var(--neutral-primary)           /* Page background */
var(--neutral-primary-soft)      /* Card background */
var(--neutral-secondary-medium)  /* Input background, hover */

/* Text */
var(--heading)                   /* All headings, bold text */
var(--body)                      /* Paragraphs, descriptions */
var(--body-subtle)               /* Labels, metadata */

/* Brand */
var(--brand)                     /* Icons, focus rings */
var(--brand-softer)              /* AI card backgrounds */
var(--fg-brand-strong)           /* Active nav items */

/* Semantic */
var(--success) / var(--danger) / var(--warning)

/* Borders */
var(--border-default)            /* Card borders */
var(--border-default-medium)     /* Input borders */
var(--border-brand-subtle)       /* AI card borders */

/* Shadows */
var(--shadow-xs)                 /* Cards, buttons */
var(--shadow-sm)                 /* Interactive cards */
var(--shadow-md)                 /* Dropdowns */
var(--shadow-xl)                 /* Modals */

/* Layout */
var(--container-max)             /* 1200px */
var(--container-padding-x)       /* 24px */
```

---

## Appendix B: Design Decision Log

| Decision | Rationale |
|---|---|
| 2px universal radius | Creates precise, sharp aesthetic — avoids "soft" SaaS look |
| Dark mode default | Agentic AI aesthetic, reduces eye strain for data-heavy dashboards |
| Lato over Inter | Higher x-height, more distinctive character, better at 14px UI sizes |
| CSS variables over Tailwind colors | Enables single-source theme switching without recompilation |
| No rounded-xl anywhere | Intentional departure from rounded-card trends — precision over softness |
| Brand gradient for primary CTAs only | Reserves strongest visual signal for the most important action |
| 8px base grid | Compatibility with 4-point and 8-point systems, industry standard |

---

*TallinnDoll Design Guide — Version 1.0*
