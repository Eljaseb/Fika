# Fika Reviews

Premium café-review card generator with a public guide + private admin.
React + Vite, deploys to **Netlify**. Cards render on `<canvas>` and export at 2×.

## What's new in this build
- **Public vs Admin.** Visitors see the café guide, scores, location and Google
  reviews but can't edit. You unlock editing with a code (🔒 Admin on the home screen).
- **Location + Google reviews.** Every café shows "Open in Google Maps" and a
  "How others review it" section. With a Google key it shows the live star rating
  and review snippets; without one it links straight to Google.
- **Publish workflow.** Admin → **Export data** downloads `cafes.json`. Replace
  `public/cafes.json` with it (re-upload to your repo) to update what the public sees.

## Deploy to Netlify (no Mac, no terminal needed)
1. Put this folder in a **GitHub** repo (drag-and-drop upload works).
2. On **netlify.com** → Add new site → Import from GitHub → pick the repo → Deploy.
   Netlify reads `netlify.toml` (build `npm run build`, publish `dist`, functions in `netlify/functions`).
3. You get a live `https://….netlify.app` URL. Open in Safari → Share → **Add to Home Screen**.

## Set your codes/keys (Netlify → Site settings → Environment variables)
- `VITE_ADMIN_CODE` — the code you type to unlock admin. **Redeploy after changing.**
- `ANTHROPIC_API_KEY` — turns on the AI assistant (key from the Anthropic Console).
- `GOOGLE_MAPS_API_KEY` — turns on live Google ratings/reviews. In Google Cloud:
  enable **Places API**, enable billing, restrict the key to your site. Until set,
  the app falls back to the Google Maps link automatically.

## How the admin gate works (read this)
The admin code is checked in the browser, so it's a **soft gate** — fine for keeping
casual visitors read-only, but it is **not bank-grade security** (a determined person
can read the site's code). If you ever need real accounts/security, the drop-in upgrade
is **Netlify Identity** (free) — ask and it can be wired in.

## The shared-data limitation (read this too)
A static site has no shared database, so the public sees whatever is in
`public/cafes.json`. Edits you make in admin live only in your browser until you
**Export data** and re-upload that file. For real-time shared data (many editors,
instant updates), the upgrade is a small database like **Supabase** (free tier).

## Run locally (optional)
```bash
npm install
npm run dev                  # app at http://localhost:5173 (functions inactive)
# or, to test functions/AI/Google locally:
npm i -g netlify-cli
netlify dev                  # serves app + /.netlify/functions/*
```

## Structure
```
index.html                     app shell
src/App.jsx                    whole app (UI + canvas renderer + admin/public + Google panel)
src/main.jsx                   React entry
public/cafes.json              published café data the public sees
netlify/functions/anthropic.js AI proxy (keeps Anthropic key server-side)
netlify/functions/places.js    Google Places proxy (rating + reviews)
netlify.toml                   Netlify build + functions config
.env.example                   keys/codes template
```

## A note on Google reviews
Showing Google ratings/snippets uses the Places API and must follow Google's terms
(attribution shown as "via Google", no permanent storage of review content). This
build fetches live and attributes; it does not cache reviews.
