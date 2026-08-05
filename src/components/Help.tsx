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
      "Modeled as a circle (still-air glide distance at your aircraft's glide ratio and best-glide speed), shifted downwind by the current wind. With GPS off, shown around each waypoint at your planned cruise altitude. Once GPS is on, those are replaced by a single circle that follows your live position, using your actual current altitude when the device reports one (falling back to planned cruise altitude otherwise). Best glide speed is sometimes an estimate (~1.3× stall speed) rather than a published POH figure for some aircraft — use your aircraft's actual best glide speed in a real emergency. This assumes altitude is height above the terrain you'd actually glide over, which isn't always true — treat it as a planning aid, not a guarantee."
    ]
  },
  {
    title: 'Route & map',
    paragraphs: [
      "Drag a waypoint marker to reposition it, or drag one of the small handles along the route line to insert a new waypoint there — the nav log and fuel numbers update automatically. The dashed amber circles show engine-out glide range from each waypoint at your planned cruise altitude. Use the layers icon (top-right) to switch to Kartverket's detailed Norway topographic tiles — free, official, but Norway-only; OpenStreetMap covers Sweden too. The same menu also has an optional aviation overlay (airspace, airports, navaids, and reporting points combined, courtesy of OpenAIP) you can layer on top of either base map. Small grey diamonds show every curated strip, not just your route.",
      "Push and hold anywhere on empty map space (or right-click on desktop) to open a menu at that point. \"Set as start\" inserts it as the new first waypoint (green Start badge in the list below), and \"Set destination\" appends it as the new last waypoint (amber Destination badge) — once both are set, \"Add waypoint here\" always inserts between them instead of pushing the destination further down the list, so tapping out a route in any order still keeps start and destination pinned at the ends. \"Direct to here\" behaves differently depending on GPS: with GPS off it's inserted as your immediate next waypoint, ahead of the rest of your plan; with GPS on, it instead draws a bold red-orange dashed line straight from your live position to that point (shown with distance, an ETA in minutes, and an estimated fuel used — from your aircraft's cruise burn rate applied to that ETA, not a measured figure — in the bottom-left HUD — tap it to cancel) without touching your saved route at all. ETA/fuel use your live GPS ground speed once it's above 5kt; below that (or with no speed reading yet) they fall back to your planned cruise speed instead, marked \"(planned)\" so it's clear which one you're looking at. The remove button on each waypoint refuses to go below 2 (nav log and fuel calc need a departure and destination) — use \"Clear all waypoints\" below the list to fully reset the route instead.",
      "The screen icon (top-left) opens a fullscreen map with flight-timer buttons below it, handy for practicing patterns. The crosshair icon follows your live GPS position. The (i) icon opens a drawer with nearby radio frequencies and an airspace-ceiling check, without leaving this view — see \"Airspace & nearby info\" below. The small dial (bottom-right) rotates the map — drag it to point any direction up; double-click/tap it to reset to north-up. All the map's own buttons (zoom, fullscreen, follow, info, layers) are sized for easy use one-handed in flight.",
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
      "Uses this device's GPS — needs your permission, a page served over https (or localhost), and doesn't work from a plain local file on most browsers, especially iOS Safari. ETA uses live GPS ground speed when available, otherwise your planned cruise ground speed. The current-position marker shows on the map as a magenta arrow. This also works from the fullscreen map view."
    ]
  },
  {
    title: 'Daylight',
    paragraphs: [
      "Civil twilight ends when the sun reaches 6° below the horizon — check your national VFR night-flying rule for which of sunset or end-of-civil-twilight actually applies as your limit."
    ]
  },
  {
    title: 'Attitude indicator',
    paragraphs: [
      "Uses this device's motion sensors — iOS will prompt for a one-time \"Motion & Orientation Access\" permission the first time you tap Enable. Reference only, not a certified flight instrument. \"Level / center\" resets the current orientation as zero, since a kneeboard or mount is rarely perfectly level itself — recalibrate if it drifts or after remounting the device."
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
    title: 'Account & data',
    paragraphs: [
      "Signing in syncs your flight-plan settings (aircraft, waypoints, fuel, weight, wind, etc.) to your account, so they follow you across devices — without an account, they're only saved to this browser. Saved flight tracks are always tied to your account and only visible to you."
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
