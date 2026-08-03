# LSA Flight Planner

Route and fuel planning for light sport aircraft, built around the ICP
Savannah S with a clean extension point for other LSAs.

## What it does (v0.1)

- Installable as a real app (PWA) on desktop, iPhone, and iPad — its own
  icon and window, not just a browser bookmark
- Generates a VFR flight-plan preparation sheet (ICAO item layout) from
  your route/aircraft/fuel data, with Norway/Sweden border-crossing and
  customs-notification detection — it prepares the information, it does
  not submit anything to any authority (see below)
- An interactive map of the route — drag a waypoint marker to reposition it, or
  drag one of the small handles along the route line to insert a new waypoint
  there; the nav log and fuel numbers update automatically
- Enter a route as a list of waypoints (decimal-degree lat/lon), or search a
  starter list of confirmed grass/gravel strips in Norway and Sweden to
  fill a waypoint automatically
- Enter a single wind (direction/speed) for the route
- Get a full nav log: true course, wind-corrected heading, ground speed,
  time, and fuel burn **per leg**
- A fuel gauge showing trip fuel, reserve, and remaining margin against
  usable tank capacity
- Aircraft performance figures live in one file per aircraft, so adding a
  new LSA later is a small, isolated change

Not in v0.1 yet, but the code is structured to add them without a rewrite:
weight & balance, takeoff/landing performance, magnetic variation/deviation
(everything currently is **true**, not magnetic), multi-leg wind (currently
one wind for the whole route).

## Project layout

```
src/
  types/aircraft.ts       # the AircraftProfile shape every aircraft implements
  aircraft/
    savannah-s.ts          # ICP Savannah S performance figures
    ctsw.ts                 # Flight Design CTSW
    rans-s6.ts               # RANS S-6 Coyote II
    registry.ts               # add new aircraft here
  lib/
    geo.ts                   # great-circle distance, true course, destination point
    wind.ts                  # wind-triangle solution (WCA, heading, ground speed)
    planning.ts              # turns waypoints + aircraft + wind into a nav log
    units.ts                  # speed unit conversion (kt/mph/kmh/ms)
    weight.ts                  # takeoff weight & MTOW check
    glide.ts                    # engine-out glide range (wind-shifted circle)
    weather.ts                   # live forecast wind fetch (Open-Meteo)
    sunTimes.ts                   # live sunset/twilight fetch (sunrisesunset.io)
    supabaseClient.ts               # auth client (no-op if unconfigured)
  data/
    strips.ts                 # curated grass/gravel strips (Norway & Sweden starter set)
  components/
    FuelGauge.tsx
    NavLog.tsx
    StripSearch.tsx           # dropdown/typeahead over data/strips.ts
    WeightSummary.tsx
    GlideSummary.tsx
    WeatherFetch.tsx           # wind fetch button + status
    DaylightInfo.tsx            # sunset/twilight fetch + display
    RouteMap.tsx               # interactive Leaflet map, drag-to-insert waypoints
    AuthGate.tsx                # login screen, wraps the whole app
  App.tsx                    # UI state & layout
```

## About the airstrip search data

`src/data/strips.ts` is a **starter set**, not an official aeronautical
database. Each entry's surface and coordinates were sourced from public
references (Wikipedia airport articles, a Swedish airfield directory) and
checked individually — none are guessed — but coverage is intentionally
small rather than approximate. Before flying to any of them, cross-check
against a current chart/AIP for PPR requirements, NOTAMs, and any surface
or status changes.

To add more strips: append an entry to the `airstrips` array in
`src/data/strips.ts` with a unique `id`. The search box in `App.tsx` reads
straight from that array, so nothing else needs to change.

To add another aircraft: copy `src/aircraft/savannah-s.ts`, fill in its
performance numbers, and add it to the array in `src/aircraft/registry.ts`.
The aircraft picker in the header updates automatically.

## Running it locally

You'll need [Node.js](https://nodejs.org) (v18+) installed.

```bash
npm install
npm run dev
```

This starts a local dev server (prints a `localhost` URL) and reloads
automatically as you edit files.

## Installing it as an app (desktop, and eventually iOS)

This app is a **PWA** (Progressive Web App) — a real, installable app that
happens to be built with web technology, not a bookmark or a shortcut to a
browser tab. It has an app manifest, icons, and an auto-updating service
worker (`vite-plugin-pwa`), so browsers offer a genuine "Install" action
for it, the same mechanism apps like Google Photos or Excel Online use for
their desktop versions.

**Install it on this computer right now, no deployment needed:**

1. `npm install && npm run dev` (or `npm run build && npm run preview` for
   a closer-to-production test)
2. Open the printed `localhost` URL in **Chrome or Edge**
3. Look in the address bar for an install icon (a monitor with a down
   arrow, or a small "+"), or open the browser's `⋮` menu → **Install LSA
   Flight Planner**
4. Confirm — it installs like a native app: its own window (no browser
   toolbar), an entry in your Start Menu (Windows) or Applications/
   Launchpad (Mac), and it'll appear in Alt-Tab / Cmd-Tab as its own app

**To get an icon specifically on your desktop** (not just the Start Menu
or Applications folder):
- **Windows:** Start Menu → find "LSA Flight Planner" → right-click →
  **More → Open file location**, then right-click the shortcut found there
  → **Send to → Desktop**
- **Mac:** open **Applications** in Finder (Chrome PWAs install there),
  drag "LSA Flight Planner" onto the Desktop (hold ⌘ while dragging to
  create an alias instead of moving it)

**Sharing it with friends:** once it's deployed with a real `https://` URL
(see the next section), send them the link. Each of them opens it in
Chrome/Edge on their own computer and installs it exactly the same way —
no npm, no code, no account with you required beyond whatever login you've
set up. If you've turned on the invite-only login below, they'll each need
their own invite from you first.

**iOS:** yes, this works on iPhone/iPad too, via the same PWA mechanism —
see "Using it on your iPhone or iPad" further down. Apple doesn't offer a
"real" install button the way Chrome does; instead it's Safari's **Add to
Home Screen**, which produces the same result (its own icon, full-screen,
no browser chrome). That part of this README already covers the exact
steps and works today, not as a future item.

## Publishing it publicly with invite-only login

The app ships with a login gate (`src/components/AuthGate.tsx`) built on
[Supabase](https://supabase.com) — a free-tier auth provider. Supabase's own
dashboard is the invite system: you turn off public sign-up, and only
accounts you personally invite by email can sign in. There's no separate
"admin" role to configure — whoever owns the Supabase project (you) has
full control over who's invited, and that's the same account you'd use to
manage the deployment.

I can't create any of these accounts for you — each one needs your own
email — but here's the exact path, roughly 10 minutes:

**1. Create a free Supabase project**
- Go to [supabase.com](https://supabase.com) → sign up → "New project"
- Once it's created, go to **Authentication → Providers** and make sure
  **Email** is enabled
- Go to **Authentication → Settings** (or "Sign In / Providers" depending
  on the current dashboard layout) and turn **off** "Allow new users to
  sign up" — this is what makes it invite-only; without this, anyone could
  create their own account
- Go to **Project Settings → API** and copy the **Project URL** and the
  **anon public key**

**2. Invite yourself (and anyone else)**
- Go to **Authentication → Users → Invite user**, enter your own email
- You'll get an email with a link to set your password — that's your login

**3. Wire the app to your project**
- Copy `.env.example` to `.env`
- Paste in the Project URL and anon key you copied above
- Locally, confirm it works: `npm install && npm run dev`, you should now
  see a login screen

**4. Deploy it**
- Push this project to a GitHub repo (or use the Vercel/Netlify CLI to
  deploy the folder directly without git)
- On [vercel.com](https://vercel.com) or [netlify.com](https://netlify.com),
  sign up free, import the repo (or drag-and-drop the `dist/` folder from
  `npm run build` for a one-off deploy)
- Add the same two values from `.env` as environment variables in the
  hosting platform's project settings (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`), then redeploy so the build picks them up
- You'll get a permanent `https://` URL — that's your published tool

From then on, inviting someone new is just **Authentication → Users →
Invite user** in Supabase — no code changes or redeploys needed.

If you skip all of this and just run the app without a `.env` file, it
works exactly as before with no login screen — useful for local testing
before you're ready to publish.

## Using it on your iPhone or iPad

This is the same PWA install covered above, just via Safari's mechanism
instead of Chrome's:

**Quickest way — same wifi network:**

1. Run `npm run dev` (already configured with `host: true`, so it's
   reachable on your LAN)
2. The terminal will print a `Network:` URL like `http://192.168.1.23:5173`
3. Open that URL in Safari on your iPhone/iPad
4. Tap the Share icon → **Add to Home Screen** — it'll behave like a real
   app icon, launch full-screen, and remember your last route

Once deployed with a real `https://` URL (see above), do the same thing
with that URL from anywhere, not just your home wifi.

## A note on the aircraft data

The Savannah S figures in `src/aircraft/savannah-s.ts` come from ICP's own
published factory specs (standard-tank, Rotax 912 ULS configuration).
Registration category changes some of these numbers (450 kg vs 600 kg
MTOW, standard vs extended tanks, 80 vs 100 hp engine) — check them against
your specific aircraft's POH before using this for real flight planning.
This tool is a planning aid, not a certified flight-planning system.
