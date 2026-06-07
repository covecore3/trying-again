# Deploying VIBE with a Real Server (Render.com — Free)

## What you get
- Songs stored permanently on the server
- Works on phone AND PC — same account, same songs
- No 7-day storage wipe
- Upload MP3s from any device, play on any device

---

## Step 1 — Create a GitHub repo

1. Go to **github.com** → sign in
2. Click **＋ New repository** → name it `vibe-server` → Public → **Create**
3. Click **Add file → Upload files**
4. Upload ALL THREE files:
   - `server.js`
   - `package.json`
   - `index.html` ← this is the app frontend
5. Click **Commit changes**

---

## Step 2 — Deploy to Render (free server)

1. Go to **render.com** → sign up (free, no credit card)
2. Click **New +** → **Web Service**
3. Connect your GitHub account → select your `vibe-server` repo
4. Fill in these settings:
   - **Name:** `vibe` (or anything)
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free`
5. Click **Create Web Service**
6. Wait ~2 minutes for it to build
7. Your app URL will be: `https://vibe-XXXX.onrender.com`

---

## Step 3 — Open on your phone

1. Go to your Render URL on your phone's browser
2. Log in / create account
3. Upload songs — they go to the server, stay forever
4. **Add to Home Screen** (Share → Add to Home Screen on iPhone) for a real app icon

---

## Important: Free tier sleep

Render's free tier **sleeps after 15 minutes of inactivity**. First load after sleeping takes ~30 seconds to wake up. Paid tier ($7/month) stays awake always.

To avoid this: log in once a day, or upgrade. The sleep doesn't delete your data — just slow first load.

---

## How songs are stored

| Song type | Stored where | Works on phone? | Survives forever? |
|-----------|-------------|-----------------|-------------------|
| MP3 upload | Server disk | ✅ Yes | ✅ Yes |
| YouTube link | Server DB | ✅ Yes | ✅ Yes |
| SoundCloud | Server DB | ✅ Yes | ✅ Yes |

---

## Updating the app

When you get a new `index.html`:
1. Go to your GitHub repo → click `index.html` → pencil icon → delete it
2. Upload new `index.html`
3. Render auto-redeploys in ~1 minute

---

## File size limit

The server accepts files up to **50MB**. Most MP3s are 3–10MB so this covers most songs.
