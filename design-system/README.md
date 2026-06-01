# Future Health Twin — Design System

Monash University × Start Hack · `CPD9/Healthcare-Digital-Twin`

---

## What's in this folder

| Path | What |
|---|---|
| `README.md` | This file — orientation, usage, index. |
| `colors_and_type.css` | All color tokens, type scale, semantic classes, spacing, radii, shadows, motion. Drop this once into any HTML/JSX surface. |
| `preview/index.html` | Design-system specimens — palette, type scale, components, motion, voice guide. Open in a browser. |
| `ui_kits/twin-app/index.html` | Hi-fi standalone demo: questionnaire → twin → chat. No build step. Open in a browser. |

---

## Quick start

**Standalone HTML** — copy `colors_and_type.css` into your project and link it:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;600&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="path/to/colors_and_type.css" />
```

**Next.js / Tailwind v4** (twin-frontend) — `globals.css` already imports these tokens. The font is loaded via `next/font/google` in `layout.tsx`.

---

## Brand primitives

| Name | Hex | Role |
|---|---|---|
| **Forest** | `#3c4f3d` | Primary ink · button fill · brand mark |
| **Sage** | `#e9eeea` | App canvas background |
| **Ember** | `#de8246` | Accent — links, single CTA, live data point |
| **Paper** | `#ffffff` | Card / surface |

Forest is used at six opacity tiers (`/10`, `/20`, `/40`, `/60`, `/70`, `/100`) via CSS custom properties — the design relies on **one ink color, six weights** rather than discrete neutrals.

---

## Typography

- **Geist Sans** for all copy. Weights: 300 (display), 400 (body), 500 (buttons/headings), 600 (card titles).
- **Geist Mono** for gene symbols, IDs, code, FHIR identifiers.
- **No serifs. No italics.** Weight and color carry emphasis.
- **Sentence case** everywhere except UPPERCASE eyebrow labels.

---

## Layout rules

- Container: `max-width ~1100px`, centered, `px-6` gutter.
- Header: fixed/sticky, paper bg, `forest/10` bottom border.
- Cards: `rounded-xl` (14px), `shadow-sm`, **no border** — depth from shadow on sage canvas.
- Inner sub-cards: `forest/10` border on `sage/40` fill — the inverse pattern.

---

## Icons

**Lucide React** (`lucide-react` package or `https://unpkg.com/lucide@latest` CDN). 2px stroke, `currentColor`, no fill. Sizes: `h-4 w-4` (inline), `h-5 w-5` (standalone), `h-10 w-10` (empty state). No emoji.

---

## Voice

- Second person ("your twin", "your future"). No "we" or corporate plurals.
- Future-tense, conditional: "If you keep sleeping six hours, your twin in 2036 will…"
- Numbers over adjectives: "+3 years of healthy life expectancy" not "amazing improvements".
- No emoji, no hype punctuation, no "AI-powered / revolutionary / next-generation".

---

## Known gaps

- **No real logo.** The wordmark is plain "TWIN" in Geist Medium. Supply an SVG mark when ready.
- **No hero imagery.** The UI kit uses an SVG placeholder avatar. A proper illustrated twin glyph is the most valuable next asset.
- **Dark mode** — tokens defined in `colors_and_type.css` and `globals.css` but not active in the live UI. Light is canonical.
- **Geist Sans** is loaded from Google Fonts CDN. For self-hosted `.woff2`, vendor the files into `fonts/`.
