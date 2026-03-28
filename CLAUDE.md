# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**GadaaLabs** — AI educational website for developers and engineers.
Stack: Next.js 16 (App Router) · TypeScript strict · Tailwind CSS v4 · Radix UI · Vercel AI SDK v6 · Groq (free tier) · Zustand · Shiki · Monaco Editor

## Dev Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

## Environment Variables

Copy `.env.example` → `.env.local` and add your key:
```
GROQ_API_KEY=your_key_here   # Free at console.groq.com
```

## Architecture

- `app/` — Next.js App Router pages + API Route Handlers
- `components/` — UI, layout, marketing, demos, quiz components
- `lib/` — Shared utilities (rate-limit, shiki, utils)
- API calls to Groq stay **server-side only** in `app/api/ai/*` routes

## Key Conventions

- All AI calls go through `/api/ai/chat` or `/api/ai/complete` — never expose `GROQ_API_KEY` to the client
- Monaco Editor must be dynamically imported with `ssr: false`
- Use CSS custom properties from `globals.css` for colors (e.g. `var(--color-purple-600)`)
- Prefer inline styles for design token values over Tailwind arbitrary values
