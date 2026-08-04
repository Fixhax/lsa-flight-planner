interface HelpGroup {
  title: string
  paragraphs: string[]
}

const HELP_GROUPS: HelpGroup[] = [
  {
    title: 'Cruise settings',
    paragraphs: [
      "Cruise speed defaults to your selected aircraft's published figure — lower it for a fuel-saving cruise or a short-field configuration. Altitude is recorded for your nav log but doesn't yet adjust true airspeed or fuel burn for density altitude."
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
      "Push and hold anywhere on empty map space (or right-click on desktop) to open a menu at that point: \"Add waypoint here\" appends it to the end of your route. \"Direct to here\" behaves differently depending on GPS: with GPS off it's inserted as your immediate next waypoint, ahead of the rest of your plan; with GPS on, it instead draws a dashed blue line straight from your live position to that point (shown with distance and, once your GPS ground speed is above 5kt, an ETA in minutes, in the bottom-left HUD — tap it to cancel) without touching your saved route at all. The remove button on each waypoint refuses to go below 2 (nav log and fuel calc need a departure and destination) — use \"Clear all waypoints\" below the list to fully reset the route instead.",
      "The screen icon (top-left) opens a fullscreen map with flight-timer buttons below it, handy for practicing patterns. The crosshair icon follows your live GPS position. The small dial (bottom-right) rotates the map — drag it to point any direction up; double-click/tap it to reset to north-up.",
      "Landing pattern overlay: the downwind offset and base-turn point (where the threshold sits 45° behind the wing) are exact geometry for whatever distance you enter. Traffic side defaults to left since that's the global convention, but published pattern direction isn't looked up automatically — verify locally. Magnetic variation is an approximate figure you adjust by hand, not looked up live. This is a visual training reference, not a substitute for the field's actual published procedures.",
      "Open the strip-search dropdown to browse a starter list of confirmed grass/gravel strips in Norway and Sweden, with surface, runway, length, and elevation shown for each. For anywhere else, type coordinates directly in decimal degrees (e.g. 44.8848, -93.2223); south and west are negative."
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
      "Extended-tank capacity (where applicable) is an estimate, not a confirmed factory spec — verify against your aircraft's documentation before relying on it."
    ]
  },
  {
    title: 'Payload & weight',
    paragraphs: [
      "Fuel weight uses an approximate avgas density of 0.72 kg/L. This is a takeoff-weight check only — it doesn't verify CG position within limits."
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
