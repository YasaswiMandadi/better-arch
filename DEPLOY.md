# Sharing a live preview + connecting MongoDB (free tier)

Everything below is free: Vercel **Hobby** (hosting + the API), MongoDB Atlas **M0** (512 MB database).
Note: Vercel Hobby is for non-commercial use — fine for a client preview; move to a paid plan (or another host) when the real site goes live.

How it works: the site is built with `VITE_REMOTE=1` (set in `vercel.json`). It then loads its content from `/api/site`
(Vercel serverless function → MongoDB). Visitors see **published** content only; the console (`/console`) asks for the admin
password and saves every change to the database. Without `VITE_REMOTE` (e.g. `npm run dev`) the app works exactly as before,
using browser storage.

## 1. MongoDB Atlas (one-time, ~5 min)
1. Create a free account at <https://www.mongodb.com/cloud/atlas> → **Create** a free **M0** cluster (pick a region near your users, e.g. Mumbai).
2. **Database Access** → Add a database user (username + strong password). Role: *Read and write to any database*.
3. **Network Access** → Add IP address → **Allow access from anywhere** (`0.0.0.0/0`). Vercel's outgoing IPs change, so this is required; the database is still protected by the user/password.
4. **Database → Connect → Drivers** → copy the connection string and put your user/password into it. That is `MONGODB_URI`.

## 2. Put the code on GitHub
Push this project (including the new `api/` folder, `vercel.json`, `DEPLOY.md`) to your GitHub repo.

## 3. Vercel (one-time, ~5 min)
1. <https://vercel.com> → sign in with GitHub → **Add New → Project** → import the repo. Framework is detected as Vite; leave build settings alone.
2. Before deploying, open **Environment Variables** and add (Production **and** Preview):
   | Name | Value |
   |---|---|
   | `MONGODB_URI` | the Atlas connection string from step 1 |
   | `MONGODB_DB` | `betterarch` |
   | `ADMIN_PASSWORD` | a long random password — this unlocks `/console` |
   | `SESSION_SECRET` | another long random string |
3. **Deploy.** You get a link like `https://your-project.vercel.app` — that is the link to send the client.
   Every `git push` redeploys automatically, so the client sees your progress at the same link.

## 4. First login (do this from the browser that holds your current content)
1. Open `https://your-project.vercel.app/console` and sign in with `ADMIN_PASSWORD`.
2. Because the database is empty, your browser's current content (all themes, episodes, essays, collaborators — including episodes you created via uploads) is **uploaded automatically** (top bar shows "Saving to database…" then "Saved to database").
3. From now on every console edit is saved to MongoDB; drafts stay hidden from visitors until published.

## Good to know
- The preview link is marked `noindex` (see `vercel.json`) so search engines skip it. **Remove that header when the real site goes live.**
- Anyone with the link can browse the public site; only the password unlocks editing. Draft episodes are never sent to non-admin visitors.
- Admin sessions last 12 hours. If one expires mid-edit, your unsaved edits are kept and saved right after you sign in again.
- Two admins editing at once: the last save of each item wins. Use one admin at a time for now.
- Changing `ADMIN_PASSWORD` (or `SESSION_SECRET`) signs everyone out.
- Pointing the real domain later: Vercel → Project → Settings → Domains.
- If the database can't be reached, the site and console fall back to the browser's own copy and the console top bar says so.
