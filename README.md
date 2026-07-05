# Torq CRM

A clean, fast lead-pipeline CRM for the automotive leads your scraper produces.
It loads the **7,628 London automotive businesses** (`london_automotive_scored.json`)
plus the **161 Instagram-enriched "hot" leads** (`east_london_leads.json`), and gives
you and your teammates one place to **find → qualify → progress** them.

- **Dashboard** — totals, pipeline funnel, lead-quality mix, team activity, and the
  hottest opportunities you haven't grabbed yet.
- **Lead Pool** — a fast, virtualised table over every scraped lead. Search + filter
  by tier, area, category, IG-hot, has-Instagram, has-email, and whether it's already
  in the pipeline. One click adds a lead to the pipeline.
- **Pipeline** — a drag-and-drop kanban across **New → Contacted → Replied → Qualified
  → Won / Lost**. Assign owners, and it all reflects on the dashboard.
- **Lead detail** — full contact block (phone, email, website, Instagram, address,
  Google rating), the Instagram signal for hot leads, owner assignment, an Instagram
  **DM composer**, and a shared **notes / activity** trail.

Built to be **neat, not heavy**: Vite + React + Tailwind, no backend required to start.

---

## Instagram DM outreach

The CRM is the command centre for your IG outreach — you compose and track here, and
send in Instagram (one tap away). No automation, no bots, no ban risk, no backend.

- **Compose** — open any lead, pick a **template**, and it fills in merge fields for
  that business (`{{name}}`, `{{area}}`, `{{category}}`, `{{rating}}`, `{{reviews}}`,
  `{{followers}}`, `{{handle}}`, `{{district}}`). Edit freely.
- **Send** — hit **Copy & open DM**: it copies your message and opens that business's
  DM thread in Instagram (`ig.me/m/handle`). Paste, send, done. There's also a quick
  **Send** button on each pool row to jump straight to a lead's thread.
- **Track** — mark **Sent / Replied / No reply**. Marking "Sent" moves the lead to
  **Contacted**, claims it for you, and logs the exact message to its activity trail —
  so the whole team can see who's been messaged and what was said.
- **Work-list** — the pool's **Not DM'd** filter shows every lead with an Instagram
  handle you haven't messaged yet: your outreach queue. The dashboard shows total DMs
  sent and replies.
- **Templates** are shared across the team (they sync like everything else). Manage
  them from the sliders icon in any lead's DM box.

> Why not send the DMs automatically from inside the CRM? Instagram's official API
> forbids cold DMs, and doing it via automation violates their ToS and risks account
> bans — so this "launch-pad" approach gives you the tracking and speed without the
> risk. If you later want a fully-automated inbox (send + read threads in-app), that's
> a separate backend service with real trade-offs — ask and we'll scope it.

---

## Run it

```bash
cd crm
npm install
npm run dev
```

Open the URL it prints (http://localhost:5180). That's it — the leads are loaded
automatically. `npm install` also regenerates the lead data from the scraper output.

To build a static bundle you can host anywhere:

```bash
npm run build      # outputs to dist/
npm run preview    # preview the build locally
```

## Refreshing the leads

Whenever the scraper produces new output, just re-run:

```bash
npm run data       # re-reads ../torq-leads/output/*.json → public/leads.json
```

This also runs automatically before every `dev` and `build`. To point it at different
files, edit the paths at the top of `scripts/build-data.mjs`.

---

## Working with your team (today)

The app stores your team's work — stages, owners, notes — in the browser
(`localStorage`), so it's private to each machine by default. To collaborate right now:

1. Open **Team & sharing** (top-right).
2. Add your teammates and pick who you're **acting as** (notes are attributed to them).
3. **Export snapshot** and send the file over. Teammates **Import & merge** it — edits
   merge per lead, newest change wins. Do a round-trip whenever you want to sync up.

This is the zero-setup path. For **always-on live sync**, see below.

---

## Turning on live team sync (Supabase, ~15 min)

The whole app reads and writes team state through **one** small module —
`src/lib/store.js` — and every persistence call goes through two functions: `load()`
and `persist()`. That's the only thing you swap to get a shared, real-time backend.

1. Create a free project at [supabase.com](https://supabase.com) and add one table:

   ```sql
   create table crm_records (
     lead_id   text primary key,
     stage     text,
     owner_id  text,
     notes     jsonb default '[]',
     updated_at timestamptz default now()
   );
   -- realtime + basic team access
   alter publication supabase_realtime add table crm_records;
   ```

2. `npm install @supabase/supabase-js`, add your project URL + anon key to `.env.local`.

3. In `src/lib/store.js`, replace `load()` / `persist()` to read/write `crm_records`,
   and subscribe to Supabase realtime so remote changes call the store's `set()`. The
   action functions, all components, and the UI stay exactly as they are.

4. Deploy the frontend free on [Vercel](https://vercel.com) (`vercel` in this folder)
   and share the URL. Everyone logs in, everyone sees the same board live.

Add Supabase Auth if you want per-person logins instead of the "acting as" selector.

---

## How the data is shaped

`scripts/build-data.mjs` normalises the two scraper files into one lead model, de-dupes
the hot leads into the main set (marking them `hot: true`), cleans placeholder emails,
derives the postcode **area** (E10, RM8, …), and sorts strongest-first. Output is a
single `public/leads.json` the app fetches once on load.

Leads are **read-only** (they come from the scraper). Everything your team creates on
top of them lives separately in the store, keyed by lead id — so refreshing the leads
never disturbs your pipeline.

---

## Stack

| | |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS (warm-paper "control-room" theme) |
| Fonts | Clash Display · Satoshi · JetBrains Mono |
| Table | `@tanstack/react-virtual` (handles all 7,628 rows) |
| State | tiny external store + `localStorage` (swap for Supabase) |
| Icons | lucide-react |

No state library, no component library, no backend to stand up. Less is more.
