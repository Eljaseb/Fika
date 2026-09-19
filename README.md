# Fika Reviews — Vercel build (Vercel Blob)

Premium café-review card generator with a public guide + private admin. React
+ Vite, deployed on **Vercel**. Cards render on `<canvas>` and export at 2×.
Shared café data is stored in **Vercel Blob** and the serverless code lives in
`api/` (Vercel API routes).

## What it does

- **Public app for your IG followers:** first-time visitors get a "Welcome to
  WorthTheFika" screen and pick a **nickname** (saved on their device — no
  login). They browse your reviews, filter by **city**, and build a **❤️
  wishlist** (heart). No download/edit tools.
- **AI summary of Google reviews:** on each café, an "✨ Fika-style summary"
  turns the Google reviews into a fun emoji category breakdown
  (☕🥐🛋️🤍💰). Needs the AI + Google keys.
- **Admin (only you, behind your code):** add and edit any café (✏️ Edit this
  café), upload photos, and download cards in every format for IG. Public
  never sees admin tools.
- **Location + Google reviews.** Every café shows "Open in Google Maps" and a
  "How others review it" section. With a Google key it shows the live star
  rating and review snippets; without one it links straight to Google.

## How publish works

- Visitors load published cafés from `/api/cafes` (GET) — reads the latest
  Blob.
- Admin taps **⬆ Publish** → POST to `/api/cafes` → saves the whole list to
  Vercel Blob (a uniquely-named file each time; older versions are cleaned up
  automatically).
- Everyone sees the update on their next open/refresh.

## Deploy to Vercel

1. Put this folder in a **GitHub** repo (drag-and-drop upload works).
2. On **vercel.com** → Add New → Project → Import the repo → Deploy. Vercel
   builds with `npm run build` and serves `api/*.js` as serverless functions
   automatically — no extra config needed.
3. Connect a **Blob** store: Project → Storage → connect/create Blob. This
   injects `BLOB_READ_WRITE_TOKEN` automatically.
4. Set the environment variables below, then redeploy.

## Environment variables

Set these under Vercel → Project → Settings → Environment Variables, then
**redeploy** after any change:

- `VITE_ADMIN_CODE` and `ADMIN_CODE` — set BOTH to the SAME code (client
  unlock + server publish check). If either is unset, the admin unlock is
  disabled rather than falling back to a default code.
- `ANTHROPIC_API_KEY` — AI review summary and content assistant.
- `GOOGLE_MAPS_API_KEY` — live Google ratings/reviews (Places API + billing).
  Until set, the app falls back to a Google Maps link automatically.
- `BLOB_READ_WRITE_TOKEN` — added automatically when you connect a Blob store
  (see step 3 above). `BLOB_STORE_ID` isn't needed by the code — the token is
  what the SDK uses.

## API routes

- `api/cafes.js` — shared store (GET published list / POST publish, capped
  at 8MB per publish) · uses `@vercel/blob`
- `api/anthropic.js` — AI proxy (keeps the Anthropic key server-side)
- `api/places.js` — Google Places proxy (rating + reviews)

Note: café photos are stored inside the published data as base64, so a very
large list can get heavy. For lots of cafés, moving photos to dedicated Blob
files is the natural next upgrade.

## How the admin gate works (read this)

The admin code is checked in the browser, so it's a **soft gate** — fine for
keeping casual visitors read-only, but it is **not bank-grade security** (a
determined person can read the site's code, and `VITE_*` env vars are always
bundled into the client JS). The server double-checks the code before any
write to Blob storage. If you ever need real accounts/security, the drop-in
upgrade is a proper auth provider (e.g. Vercel's own auth integrations or
Supabase Auth) — ask and it can be wired in.

## The shared-data model

Café data lives in Vercel Blob, so there's a single shared source of truth
across all visitors — no manual file re-upload needed. **Export data**
(admin → ⬇ Backup) still downloads a `cafes.json` snapshot for safekeeping.
`public/cafes.json` in this repo is only the seed/fallback used if Blob is
empty or unreachable.

## Run locally

```bash
npm install
npm run dev        # app at http://localhost:5173 (API routes inactive)
# or, to test the API routes/AI/Google locally:
npm i -g vercel
vercel dev          # serves app + /api/* with your env vars
```

## Structure

```
index.html              app shell
src/App.jsx              whole app (UI + canvas renderer + admin/public + Google panel)
src/main.jsx              React entry
src/ErrorBoundary.jsx     top-level crash guard
public/cafes.json         seed/fallback café data (used only if Blob is empty)
api/cafes.js              shared café store (GET/POST) · Vercel Blob
api/anthropic.js          AI proxy (keeps Anthropic key server-side)
api/places.js             Google Places proxy (rating + reviews)
```

## A note on Google reviews

Showing Google ratings/snippets uses the Places API and must follow Google's
terms (attribution shown as "via Google", no permanent storage of review
content). This build fetches live and attributes; it does not cache reviews.
