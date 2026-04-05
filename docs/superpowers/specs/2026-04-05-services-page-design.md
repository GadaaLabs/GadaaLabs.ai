# Services Page — Design Spec
**Date:** 2026-04-05
**Author:** Seifedin Hussen / GadaaLabs

---

## Problem

GadaaLabs provides free AI education and sustains itself through professional web development services for small businesses. Several websites have already been delivered (live on subdomains under gadaalabs.com), but there is currently no place on the site where potential clients can discover this offering, see the work, or get in touch.

## Goal

Add a professional services presence to GadaaLabs.com that:
- Makes the web dev service discoverable to site visitors
- Showcases delivered work (portfolio with live links)
- Drives qualified leads to a Calendly discovery call
- Does not disrupt or dilute the core educational product

---

## Approach

**Option C selected:** A dedicated `/services` page + a compact homepage teaser strip + footer links.

This mirrors the DataLab pattern — the service lives on the site, is discoverable, but does not compete with the core product for attention. The main navigation is left unchanged.

---

## Architecture

### Files Created

| File | Purpose |
|------|---------|
| `app/services/page.tsx` | Full services + portfolio page |
| `components/marketing/ServicesTeaser.tsx` | Compact homepage strip |

### Files Modified

| File | Change |
|------|--------|
| `app/page.tsx` | Add `<ServicesTeaser />` after `<LiveDemoTeaser />` |
| `components/layout/Footer.tsx` | Add "Services" link column |

### No changes to:
- `components/layout/Header.tsx` — main nav stays education-focused
- Any DataLab or course files

---

## Services Page — `app/services/page.tsx`

### Block 1: Hero
- Badge: "Professional Services"
- Headline: "We Build for Businesses"
- Sub-copy: Two lines establishing the honest model — GadaaLabs keeps education free; professional web development is how it sustains itself.
- No CTA in the hero — let the page breathe and build trust first.

### Block 2: What We Build
Three service cards in a responsive grid (1 col mobile, 3 col desktop):

| Service | Description |
|---------|-------------|
| Business Websites | Full multi-page sites for small businesses — modern, fast, mobile-first |
| Landing Pages | High-conversion single-page sites for products, launches, or campaigns |
| Portfolio & Showcase | Personal or company showcase sites for professionals and creatives |

Each card has: icon, title, description, and 2–3 feature bullets.

### Block 3: Portfolio Grid
Static array of project objects hardcoded in the page file:

```ts
type Project = {
  name: string
  description: string
  url: string       // live subdomain under gadaalabs.com
  category: string  // "Business Website" | "Landing Page" | "Portfolio"
}
```

Each card shows: project name, description, a generic "Industry-leading web stack" tech badge, category badge, and a "View Live →" link button (opens in new tab). No specific framework or tooling is named. Grid: 1 col mobile, 2 col tablet, 3 col desktop.

**Portfolio data (hardcoded):**

| Name | Description | URL | Category |
|------|-------------|-----|----------|
| Immigration Services | A polished, trust-building website for an immigration consulting agency — designed to turn anxious visitors into confident clients. | https://preview.gadaalabs.com/ | Business Website |
| Mimz Barbershop | A sharp, modern site for a premium barbershop — built to make a strong first impression and keep clients coming back. | https://mimz.gadaalabs.com/ | Business Website |
| Perth City Barbershop | A sleek, mobile-first site for a city barbershop that commands attention, communicates quality, and drives bookings. | https://perthcity.gadaalabs.com/ | Business Website |

### Block 4: How It Works
Three-step horizontal strip:
1. **Book a free call** — Tell us about your project
2. **We scope & quote** — Clear deliverables, honest timeline
3. **We build & deliver** — Modern, fast, handoff-ready

### Block 5: CTA Section
- Headline: "Ready to get started?"
- Sub-copy: "Book a free 30-minute discovery call. No commitment."
- Primary button: "Book a Discovery Call" → `https://calendly.com/seif-explorer4` (opens in new tab)
- Subtle note: response within 24 hours

---

## Homepage Teaser — `components/marketing/ServicesTeaser.tsx`

Positioned in `app/page.tsx` after `<LiveDemoTeaser />`, before the footer.

Visual: Single full-width card (purple-tinted, matching the footer contact strip aesthetic).

- **Left:** Headline "Need a website for your business?" + one supporting line
- **Right:** Single CTA button "View Our Services →" → `/services`

Intentionally minimal — opens the door, doesn't sell on the homepage.

---

## Footer Update — `components/layout/Footer.tsx`

Add a 4th column "Services" to the existing 3-column footer link grid:

```
Services
  - Services Overview  →  /services
  - Book a Call        →  https://calendly.com/seif-explorer4 (external)
```

Footer grid expands from `md:grid-cols-4` (currently `md:grid-cols-4` with brand col spanning 2) to accommodate naturally — brand col stays `col-span-2 md:col-span-1`, three link columns become four.

---

## Data & Content

- Portfolio project data: hardcoded static array in `app/services/page.tsx` (3 projects as of spec date)
- Tech stack is not disclosed on cards — displayed as "Industry-leading web stack"
- Calendly URL: `https://calendly.com/seif-explorer4`
- No database, no CMS, no API calls needed
- To add a new portfolio project: edit the static array and redeploy

---

## Out of Scope

- Pricing/quote calculator
- Client portal or project tracking
- CMS-driven portfolio
- Testimonials (can be added in a future iteration once collected)
- Contact form (Calendly handles this fully)

---

## Success Criteria

- Visitors landing on `gadaalabs.com` can discover the services offering without it competing with the education content
- Potential clients can view live portfolio work and book a discovery call in under 60 seconds
- The page matches the existing site's visual language (dark theme, CSS custom properties, Tailwind)
