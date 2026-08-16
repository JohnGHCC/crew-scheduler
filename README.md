# Crew Board

A drag-and-drop crew/equipment scheduling board — jobs across the top, days across the top,
crews with equipment/dump trucks/attachments/drivers/operators nested underneath.

## Important: how data is stored right now

This version saves your schedule to **browser local storage** — meaning it persists between
visits *on the same browser, on the same device*. It is **not shared** between different
people or different devices. If you and your team open this on separate computers, you'll
each see your own separate schedule, not a shared one.

That's fine for trying it out or for single-person use. If you want your **whole team looking
at the same live schedule** (dispatcher in the office, foremen in the field, etc.), you'll need
a shared backend (a small database + API) instead of local storage — see "Going multi-user"
below. Let me know if you want help building that next; it's a bigger step than what's here,
but very doable.

## Running it locally

You'll need [Node.js](https://nodejs.org) installed (v18 or newer).

```bash
npm install
npm run dev
```

This starts a local dev server (usually at `http://localhost:5173`) — open that in your
browser.

## Building for deployment

```bash
npm run build
```

This produces a `dist/` folder with static HTML/CSS/JS files — that's your entire deployable
app, no server required.

## Deploying to GitHub Pages (free, no commercial-use restriction)

This is already set up for you — just need your repo created first.

### 1. Create a GitHub repo and push this code

If you don't already have this in a repo:

```bash
cd crew-scheduler
git init
git add .
git commit -m "Initial commit"
```

Then create a new (empty) repo on [github.com/new](https://github.com/new) — call it whatever
you want, e.g. `crew-scheduler` — and push:

```bash
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git branch -M main
git push -u origin main
```

### 2. Set the base path to match your repo name

Open `vite.config.js` and make sure the `base` value matches your **exact repo name**, with
slashes on both sides:

```js
base: "/YOUR-REPO-NAME/",
```

(If you named your repo something other than `crew-scheduler`, update this — it currently
says `/crew-scheduler/`.) This step matters: GitHub Pages serves your site from a
subfolder-style URL, and without this the page will load blank.

### 3. Install dependencies and deploy

```bash
npm install
npm run deploy
```

That single command builds the app and pushes the built files to a `gh-pages` branch on your
repo — `gh-pages` (added to `package.json` already) handles this automatically.

### 4. Turn on GitHub Pages in your repo settings

1. Go to your repo on GitHub → **Settings** → **Pages** (left sidebar)
2. Under "Build and deployment" → "Source", select **Deploy from a branch**
3. Branch: select `gh-pages`, folder `/ (root)` → **Save**
4. Wait ~1 minute, then refresh — GitHub shows your live URL at the top of that page, something
   like `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

### Updating it later

Any time you make changes:

```bash
npm run deploy
```

That rebuilds and re-publishes — no need to redo the settings steps again.

## Deploying elsewhere instead

Vercel and Netlify both work too, and don't need the `base` path change above (that's a
GitHub Pages quirk only) — just note both restrict their free tiers to non-commercial use,
so a paid plan (~$20/month) would apply for real business use on either of those.

- **Vercel**: push to GitHub, import the repo at [vercel.com](https://vercel.com), it
  auto-detects Vite and deploys on click.
- **Netlify**: run `npm run build`, then drag the resulting `dist/` folder onto
  [netlify.com](https://netlify.com)'s manual deploy area.

## Going multi-user (shared schedule across your team)

The current setup keeps everyone's data separate and local. To make it a true shared
scheduling tool where the office and the field see the same board in real time, you'd need:

- A small backend with a database (e.g., Supabase, Firebase, or a simple Node/Express API)
- The app would read/write to that instead of `localStorage`
- Optionally, real-time sync so changes show up live for everyone without a refresh

This is a meaningfully bigger project than what's here, but the app's structure (all state
already flows through `resources`, `jobs`, and `assignments`) makes it a reasonably clean
swap — the UI and interaction logic wouldn't need to change much, just where the data is
read from and written to. Happy to help build that out when you're ready for it.

## What's in this folder

- `src/App.jsx` — the whole app (single component)
- `src/main.jsx` — entry point that mounts it
- `index.html` — the page shell
- `package.json` / `vite.config.js` — build tooling (Vite + React)
