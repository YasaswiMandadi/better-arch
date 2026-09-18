# BetterArch.org — React/TypeScript/Tailwind revamp

A ground-up rebuild of the BetterArch.org frontend and console (backend CMS),
moving from a single hand-built HTML file to React + TypeScript + Tailwind CSS v4,
while preserving every season, episode, and the full Ep.01 analysis record verbatim.

## What's new

- **Watching Eye hero** — an SVG eye on the homepage that tracks your cursor and
  blinks on its own irregular rhythm. It's a literal nod to the project's "media as a
  mirror" premise: the site watches you back.
- **Reinterpreted word-field background** — an animated canvas of drifting
  architecture/media vocabulary that brightens near your cursor.
- **Light/dark theme toggle**, persisted, using the exact color tokens from the
  original design system (same reds, papers, accent hues per section).
- Full site: Home, Project (season) pages, Episode pages (generic + the deep
  Ep.01 analysis record with bubble map / sentiment radar / criticality compass /
  transcript viewer), About, Contact (working local form).
- **Console** (`/console`) — the full BetterArch Console editorial backend:
  Dashboard, Seasons, Episodes, a 13-section Episode Editor (identity, corrected
  transcript, reading, lexical terrain, themes, phrases, lived experience, quotes,
  sentiment register, criticality compass, references, related episodes,
  materials — each with live completion tracking in the sidebar), a Pages copy
  editor, an Inbox (reads submissions from the public Contact form), and
  Settings, plus whole-database JSON export/import and rich-text fields
  throughout. It seeds itself from the site's real content (`src/data/db.ts` +
  the full `ep01.ts` analysis record) rather than placeholder data, then
  persists edits to `localStorage` (`ba-console-db`, `ba-inbox`,
  `ba-console-theme`). It keeps its own colour system and light/dark toggle,
  scoped under `.consoleApp` in `src/console/console.css`, independent of the
  public site's theme.

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build     # production build -> dist/
npm run preview   # preview the production build
```

## Project structure

```
src/
  data/           # migrated season/episode data + full Ep.01 analysis record
  components/     # shared UI: Topbar, SideNav, Section, WordField, WatchingEye...
  components/charts/  # BubbleChart, SentimentSpider, CriticalityCompass (SVG)
  pages/          # Home, Project, Episode, About, Contact
  console/        # BetterArch Console (CMS): App.tsx, console.css, components/, views/, store/, lib/, types.ts
  lib/theme.tsx   # light/dark theme context (public site only — the console has its own)
```

## Notes

- Only Episode 01 ("Media as a Mirror") ships the full deep-analysis record, exactly
  as in the original -- other episodes link out to Spotify or show a generic page.
  Add more analysis records the same way `ep01.ts` is shaped, and toggle
  `analysis: true` on that episode in `src/data/db.ts` (or from the Console's
  Episodes tab, which only toggles a "live/draft" flag on the mocked data).
- The Console is local-first (no real backend) — it persists to `localStorage`
  in the browser it's used in. Use its Export/Import (JSON) to move a working
  copy between browsers or hand off edits, or wire `setDB`/`useConsole` up to
  a real API when ready.
- Two fields from the original `ep01.ts` don't have a home in the Console's
  data model, by the console's own design: each quote's `read` commentary
  (the Console's Quote editor tracks only the quote text and its context),
  and the compass's resource-axis reading (the Console derives it live as the
  average of the five compass-indicator scores instead of storing it
  separately).
