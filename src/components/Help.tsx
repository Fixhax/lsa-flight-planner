interface HelpGroup {
  title: string
  paragraphs: string[]
}

const HELP_GROUPS: HelpGroup[] = [
  {
    title: 'Aircraft',
    paragraphs: [
      "The Airplanes/Helicopters tabs filter the picker to that category — switching aircraft resets cruise speed, reserve, and MTOW to that aircraft's defaults, and fuel on board to full tanks. Weight & balance uses the correct fuel density automatically (avgas ~0.72kg/L vs Jet A ~0.8kg/L) based on the selected aircraft's fuel type.",
      "For Jet A aircraft, the \"Burn\" figure can be shown in kg/h instead of L/h (small selector next to it) — Jet A is usually measured by weight, not volume, in real operations. Avgas aircraft always just show L/h.",
      "Helicopters currently have no engine-out glide range shown — autorotation doesn't behave like a fixed-wing glide, so this app doesn't model it, rather than showing a fabricated \"glide circle\" that wouldn't reflect real performance."
    ]
  },
  {
    title: 'Cruise settings',
    paragraphs: [
      "Cruise speed defaults to your selected aircraft's published figure — lower it for a fuel-saving cruise or a short-field configuration. Altitude is recorded for your nav log but doesn't yet adjust true airspeed or fuel burn for density altitude.",
      "Weight, altitude, speed, and quantity fields throughout the app (here, Wind, Fuel, and Payload & weight) use a +/- stepper instead of a plain box — tap to nudge the value, or hold either button to run it up or down quickly. You can still type a value directly into the middle of it too."
    ]
  },
  {
    title: 'Wind',
    paragraphs: [
      "Wind speed has its own unit, separate from the header setting — handy since METAR/TAF wind is often reported in different units than you fly.",
      "The \"Fetch forecast wind\" button pulls a general forecast (Open-Meteo) for the route's midpoint at the pressure level closest to your cruise altitude — a convenience for roughing in a number, not an aviation weather briefing. No METAR/TAF/SIGMET/NOTAM data. Always get a proper pre-flight briefing before you fly. Requires an internet connection."
    ]
  },
  {
    title: 'Glide range',
    paragraphs: [
      "Modeled as a circle (still-air glide distance at your aircraft's glide ratio and best-glide speed), shifted downwind by the current wind. With GPS off, shown around each waypoint at your planned cruise altitude, as raw altitude above sea level (no ground-elevation data to correct it, since there's no single \"current position\" to look up terrain under). Once GPS is on, that's replaced by a single circle that follows your live position — this one is corrected for terrain when it can be: your GPS altitude minus the ground elevation looked up under you (a free public elevation dataset, ~25m resolution, covering Norway and Sweden) gives actual height above ground, which is what the panel below the circle summary tells you it's using. If that lookup hasn't resolved yet (or fails), it falls back to raw GPS altitude and says so, which can meaningfully overstate range over high ground. Best glide speed is sometimes an estimate (~1.3× stall speed) rather than a published POH figure for some aircraft — use your aircraft's actual best glide speed in a real emergency. Treat all of this as a planning aid, not a guarantee."
    ]
  },
  {
    title: 'Engine out',
    paragraphs: [
      "The ⚠ button on the map (needs GPS on, and an aircraft with published glide data — not helicopters, see \"Aircraft\" above) draws a heavy red dashed line to the nearest curated airfield still inside your live glide circle, labeled with distance and how much glide margin is left at that circle's edge — tight numbers mean little room for error, not a safe bet. If nothing curated is in range, the HUD says so instead of guessing. It re-picks the nearest reachable field automatically as you move; tap the button (or the HUD badge) again to cancel.",
      "It also fetches a one-time overlay of nearby open fields and larger roads from OpenStreetMap, shown as dashed amber shapes. This is UNVERIFIED — OpenStreetMap has no data here on power lines/poles, slope, crop height, surface condition, fences, or road traffic, and its map data can itself be outdated or wrong. It is not a suggested landing site, only something worth a visual look if nothing better is available. This overlay needs a live internet connection at the moment you activate it; the airfield targeting above does not."
    ]
  },
  {
    title: 'Route & map',
    paragraphs: [
      "Drag a waypoint marker to reposition it, or drag one of the small handles along the route line to insert a new waypoint there — the nav log and fuel numbers update automatically. \"Undo\", next to \"Add waypoint\" below the list, steps back through your last 20 route edits (add, remove, insert, move, clear, or applying a strip from search) — it's disabled when there's nothing to undo. Typing a waypoint's name doesn't count as an edit here (your browser's own text-field undo already covers that), only structural changes to the route. The dashed amber circles show engine-out glide range from each waypoint at your planned cruise altitude. Use the layers icon (top-right) to switch to Kartverket's detailed Norway topographic tiles — free, official, but Norway-only; OpenStreetMap covers Sweden too. The same menu also has an optional aviation overlay (airspace, airports, navaids, and reporting points combined, courtesy of OpenAIP) you can layer on top of either base map. Small grey diamonds show every curated strip, not just your route — tap one for a card with its runway, surface, length, elevation, radio frequencies, and PPR contact (tap the phone number to call), plus buttons to set it as start, destination, or an added waypoint, prefilled with all of that data rather than a bare point. Fields it doesn't have confirmed data for show as \"—\" rather than a guess. That card also has a \"Pilot notes\" section — a shared board for tips from other pilots who've used the field (soft ground after rain, a changed PPR number, livestock near the threshold, that kind of thing), visible to every signed-in pilot, not just you. Needs an account to read or post; you can only delete your own notes.",
      "Push and hold anywhere on empty map space (or right-click on desktop) to open a menu at that point. \"Set as start\" inserts it as the new first waypoint (green Start badge in the list below), and \"Set destination\" appends it as the new last waypoint (amber Destination badge) — once both are set, \"Add waypoint here\" always inserts between them instead of pushing the destination further down the list, so tapping out a route in any order still keeps start and destination pinned at the ends. \"Direct to here\" behaves differently depending on GPS: with GPS off it's inserted as your immediate next waypoint, ahead of the rest of your plan; with GPS on, it instead draws a bold red-orange dashed line straight from your live position to that point (shown with distance, an ETA in minutes, and an estimated fuel used — from your aircraft's cruise burn rate applied to that ETA, not a measured figure — in the bottom-left HUD — tap it to cancel) without touching your saved route at all. ETA/fuel use your live GPS ground speed once it's above 5kt; below that (or with no speed reading yet) they fall back to your planned cruise speed instead, marked \"(planned)\" so it's clear which one you're looking at. The remove button on each waypoint refuses to go below 2 (nav log and fuel calc need a departure and destination) — use \"Clear all waypoints\" below the list to fully reset the route instead.",
      "The screen icon (top-left) opens a fullscreen map with flight-timer buttons below it, handy for practicing patterns. The crosshair icon follows your live GPS position. The (i) icon opens a drawer with nearby radio frequencies and an airspace-ceiling check, without leaving this view — see \"Airspace & nearby info\" below. The ⚠ icon is engine-out targeting — see \"Engine out\" above. The small dial (bottom-right) rotates the map — drag it to point any direction up; double-click/tap it to reset to north-up. All the map's own buttons (zoom, fullscreen, follow, info, engine-out, layers) are sized for easy use one-handed in flight.",
      "Landing pattern overlay: the downwind offset and base-turn point (where the threshold sits 45° behind the wing) are exact geometry for whatever distance you enter. Traffic side defaults to left since that's the global convention, but published pattern direction isn't looked up automatically — verify locally. Magnetic variation is an approximate figure you adjust by hand, not looked up live. This is a visual training reference, not a substitute for the field's actual published procedures.",
      "Open the strip-search dropdown to browse a curated list of grass/gravel strips in Norway and Sweden (including a large batch sourced from the community-maintained \"Norske Mikroflystriper\" map), with surface, runway, length, and elevation shown where confirmed. None of this is an official AIP — PPR requirements, restrictions, closures, and even whether a field is still operational can be out of date, so always verify locally before relying on it. For anywhere else, type coordinates directly in decimal degrees (e.g. 44.8848, -93.2223); south and west are negative."
    ]
  },
  {
    title: 'Airspace & nearby info',
    paragraphs: [
      "Opened from the (i) icon on the map. \"Radio frequencies\" mirrors the Radio frequencies panel, filtered to within 50nm of your route or live position. \"Airspace ceiling\" is a manual, on-demand check (tap \"Check airspace\") against OpenAIP's structured airspace data — a different, more detailed data source than the raster aviation overlay on the map itself — for whichever point you're at right now (your live GPS position if tracking, otherwise your first waypoint). It reports the highest altitude you could climb to there before entering airspace that needs an ATC clearance (Class A–D) or must be avoided (restricted, danger, prohibited, or a CTR).",
      "This checks a single point directly beneath you, not a corridor or your whole route, and only refreshes when you tap the button — recheck it as you move. Floors given as \"AGL (approx.)\" are estimated without local terrain data, and flight-level-referenced floors assume standard pressure. OpenAIP's dataset is community-maintained and not exhaustive. This is a planning aid, not a substitute for checking the current AIP and getting an actual clearance before entering controlled airspace."
    ]
  },
  {
    title: 'Live tracking',
    paragraphs: [
      "Uses this device's GPS — needs your permission, a page served over https (or localhost), and doesn't work from a plain local file on most browsers, especially iOS Safari. ETA uses live GPS ground speed when available, otherwise your planned cruise ground speed. The current-position marker shows on the map as a magenta arrow. This also works from the fullscreen map view.",
      "While GPS tracking is on, this also tries to keep the screen from sleeping (the Wake Lock API) — the status line here says \"screen kept awake\" when it's actually holding that lock. Some browsers don't support this (older Safari, mainly) or can still let the screen sleep to save battery; if that happens, your device's own display-timeout setting is the fallback. It releases automatically once you stop tracking."
    ]
  },
  {
    title: 'Daylight',
    paragraphs: [
      "Civil twilight ends when the sun reaches 6° below the horizon — check your national VFR night-flying rule for which of sunset or end-of-civil-twilight actually applies as your limit."
    ]
  },
  {
    title: 'Synthetic vision',
    paragraphs: [
      "An attitude horizon (pitch/bank, from this device's motion sensors — iOS will prompt for a one-time \"Motion & Orientation Access\" permission the first time you tap Enable) plus a vertical bearing line for a target airfield: pick one from the dropdown, or leave it on \"Auto\" to follow your engine-out target when that's active, otherwise your route's destination. The line sits left or right of center by how far you'd need to turn — left/right from your device's compass heading vs. the true bearing to the target — and disappears when the target isn't roughly ahead (behind you, or well off to one side), same as it would out a real windscreen. Distance, left/right angle, and altitude difference are shown as numbers below the horizon, not as part of the line itself, so they're still there even when the line has scrolled out of view.",
      "This is NOT real synthetic vision in the certified-avionics sense — no terrain is rendered, and it can't know about hills, towers, or anything else between you and the target. It's a computed bearing pointer toward known coordinates, nothing more. Needs both motion sensors and GPS (Live tracking panel — a \"Turn on GPS\" button is right in this panel too) to show the line and the distance/bearing readout; without GPS or without a working compass on this device, it falls back to just the plain horizon. \"Level / center\" resets the current orientation as zero, since a kneeboard or mount is rarely perfectly level itself — recalibrate if it drifts or after remounting the device. Invert/swap settings are remembered per device, so you shouldn't need to redo them every time you open this."
    ]
  },
  {
    title: 'Flight history',
    paragraphs: [
      "Turn on GPS tracking before takeoff and log the landing in the flight timer to save that leg's track automatically. Selecting a saved flight draws its GPS track (dashed purple) on the Route & map panel and zooms to fit it."
    ]
  },
  {
    title: 'Fuel',
    paragraphs: [
      "Extended-tank capacity (where applicable) is an estimate, not a confirmed factory spec — verify against your aircraft's documentation before relying on it.",
      "For Jet A aircraft with kg/h selected (see the Aircraft panel), fuel onboard and the fuel gauge switch to kg too — everything here follows that one toggle, so you're not reading some numbers in L and others in kg."
    ]
  },
  {
    title: 'Payload & weight',
    paragraphs: [
      "Fuel weight uses an approximate density for the selected aircraft's fuel type — 0.72 kg/L for avgas, 0.8 kg/L for Jet A. This is a takeoff-weight check only — it doesn't verify CG position within limits.",
      "MTOW category lists whatever variants this app knows about for the selected aircraft (e.g. 450kg microlight vs 600kg LSA, or a helicopter's internal/external-load limits) — resets to that aircraft's default whenever you switch aircraft. Empty weight defaults to this app's registry figure but is editable, since a real aircraft's equipped empty weight (avionics, interior, etc.) is often different — worth setting to your actual aircraft's weighed figure rather than relying on the default."
    ]
  },
  {
    title: 'Radio frequencies',
    paragraphs: [
      "The regional list was provided and confirmed by a user citing official Avinor AIP charts. The Bergen (ENBR) entries were independently spot-checked against the exact chart cited and matched precisely — the rest wasn't individually re-verified beyond that. AIRAC cycles change frequencies periodically, so cross-check before relying on this operationally.",
      "General reference frequencies: only ones that could be confirmed or were explicitly provided are shown — nothing is guessed. Not a substitute for the current AIP; frequencies can change."
    ]
  },
  {
    title: 'Weather report',
    paragraphs: [
      "General forecast (Open-Meteo) for your departure and destination — a convenience overview, not an aviation briefing. No METAR/TAF/SIGMET/NOTAM data. Always get a proper pre-flight weather briefing before you fly. Requires an internet connection."
    ]
  },
  {
    title: 'METAR / TAF',
    paragraphs: [
      "The real, official published aviation reports (Aviation Weather Center's free public data) for your departure and destination — shown as raw, undecoded text on purpose, so nothing gets lost or misread in translation. Fetched only when you tap the button, not automatically.",
      "When a waypoint has its own ICAO identifier, that airport's own METAR/TAF is shown. When it doesn't — most of this app's curated grass/gravel strips are uncontrolled and don't have one — this instead looks up the nearest currently-reporting station and shows that, clearly labeled with its distance and \"not the field itself\". A station a few nm away can still have meaningfully different wind, cloud, or visibility than the actual strip, especially near terrain or coastline — use it as context, not as if it were measured at the field.",
      "This is still not a substitute for a full pre-flight briefing (SIGMET/NOTAM/AIRMET aren't included) — see \"Weather report\" above for the general forecast model instead, which is a different thing entirely.",
      "\"Translate to plain language\" decodes the standard groups (wind, visibility, weather, cloud, temperature/dew point, altimeter, and TAF's BECMG/TEMPO/PROB/FM change periods) into plain English below the raw text — a learning aid for reading reports faster, not a replacement for the raw text itself, which always stays shown above it. It's a fixed, offline decoder (no AI rewriting involved), so it never guesses: anything it doesn't recognize — remarks (RMK…) especially — is listed as \"not decoded\" rather than paraphrased into something that might be wrong."
    ]
  },
  {
    title: 'Flight plan (Norway VFR)',
    paragraphs: [
      "Laid out by standard ICAO flight-plan item numbers (per SKYbrary's Flight Plan Completion guidance) — this prepares the information, it doesn't submit anything anywhere. File it yourself via ippc.no (Avinor's official briefing portal) or by radio/phone to AFIS. EOBT is UTC, not local — ICAO flight plans are always filed in UTC."
    ]
  },
  {
    title: 'Flight timer (logbook)',
    paragraphs: [
      "Airframe time is summed takeoff-to-landing across all legs; engine time is summed start-up-to-shutdown — these differ whenever the engine keeps running through a stop (common in bush flying) or idles before/after the flight portion. Times use this device's clock. Timer sessions aren't saved between visits (unlike your flight-plan settings, which do sync when signed in). This also runs in the fullscreen map view so you can time patterns while watching the map."
    ]
  },
  {
    title: 'Checklist',
    paragraphs: [
      "Generic reference items only, not any specific aircraft's published checklist — always fly your aircraft's actual POH/AFM checklist instead. Checked boxes are deliberately not saved between visits (a checklist that remembers yesterday's checked boxes could make you think something's already been checked when it hasn't) — use \"Reset all\" between flights within the same session, e.g. after pre-flight and before using the before-landing list."
    ]
  },
  {
    title: 'Saved plans',
    paragraphs: [
      "A library of named snapshots, separate from your one always-open plan (which keeps autosaving on its own regardless of anything here). \"Save as new\" captures your current aircraft, route, fuel, and weight setup under a name; \"Load\" brings a saved one back into the currently-open plan (overwriting what's there — save or note down your current plan first if you don't want to lose it); \"Overwrite\" updates a saved plan with what's currently open; \"Rename\" just renames it. Requires an account — there's no local-only version of this list."
    ]
  },
  {
    title: 'Appearance',
    paragraphs: [
      "The sun/moon button in the header switches between dark and light. Defaults to your device's own light/dark setting the first time you open the app, then remembers whatever you pick after that, on this browser. The map's own overlays (route line, glide circles, direct-to/engine-out lines) keep the same colors either way — they're tuned for contrast against map tiles, not app theme."
    ]
  },
  {
    title: 'Account & data',
    paragraphs: [
      "Signing in syncs your flight-plan settings (aircraft, waypoints, fuel, weight, wind, etc.) to your account, so they follow you across devices — without an account, they're only saved to this browser. Saved flight tracks and saved plans are always tied to your account and only visible to you."
    ]
  }
]

export default function Help() {
  return (
    <div className="help-panel">
      {HELP_GROUPS.map((group) => (
        <div className="help-group" key={group.title}>
          <p className="panel-sublabel">{group.title}</p>
          {group.paragraphs.map((p, i) => (
            <p className="help-text" key={i}>
              {p}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}
