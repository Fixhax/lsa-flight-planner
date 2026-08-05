// General-purpose reference frequencies — these are broad national/
// international conventions, not tied to any specific airfield in this
// app's data. Sourced and cross-checked individually before inclusion;
// see the note on each for what it actually covers.
export interface ReferenceFrequency {
  label: string
  mhz: number
  scope: 'International' | 'Norway' | 'Sweden'
  note: string
  source: 'published' | 'user-reported' | 'user-confirmed' // see note on each entry for what's actually been verified
}

export const REFERENCE_FREQUENCIES: ReferenceFrequency[] = [
  {
    label: 'Emergency (Guard)',
    mhz: 121.5,
    scope: 'International',
    note: 'International aeronautical emergency frequency \u2014 standardized worldwide.',
    source: 'published'
  },
  {
    label: 'Search and rescue (SAR)',
    mhz: 123.1,
    scope: 'Norway',
    note: 'Norwegian SAR frequency, continued on the old 25 kHz channel (not affected by the 8.33 kHz changeover).',
    source: 'published'
  },
  {
    label: 'Civil emergency',
    mhz: 123.4,
    scope: 'Norway',
    note: 'Norwegian civil aviation emergency frequency (distinct from the international 121.5 guard frequency).',
    source: 'published'
  },
  {
    label: 'Common / uncontrolled areas (Enroute, blind calls)',
    mhz: 123.065,
    scope: 'Norway',
    note:
      'The new common European "Enroute"/blind-call frequency for uncontrolled airspace, replacing the old 123.500 \u2014 confirmed directly by a user of this app, who also flagged that 123.500 is no longer current and shouldn\u2019t be used (that entry has been removed here accordingly). This is the same frequency previously listed here for Class G airspace specifically; also corrects an earlier, mistaken 123.650 reported at one point. Not independently found in a published source by me, but fits the expected 8.33 kHz channel pattern and the user has confirmed it.',
    source: 'user-confirmed'
  }
]

export function formatMhz(mhz: number): string {
  // 8.33 kHz channel spacing (mandatory below FL195 in Norway and Sweden
  // since 2018) means the third decimal place is significant — always
  // show all three digits, never round to the old 25 kHz grid.
  return mhz.toFixed(3)
}

export interface RegionalFrequency {
  label: string
  mhz: number
  lat: number
  lon: number
  note?: string
  sourceUrl?: string
  approximate?: boolean // true for large-area FIS sectors, where lat/lon is only a rough regional anchor
  alwaysShow?: boolean // shown regardless of distance — for large-area FIS sectors where a point-distance filter doesn't represent real coverage
}

// Controlled-airspace / airport frequencies for Norway, provided and
// confirmed by a user of this app, citing official Avinor AIP charts. I
// independently spot-checked the Bergen (ENBR) entries against the exact
// AIP chart cited and they matched precisely (ATIS/APP/TWR/Ground all
// correct for the 2026-06-11 AIRAC cycle) — the rest of this list wasn't
// individually re-verified by me beyond that, so treat it the same way as
// any AIP excerpt: current at time of entry, but AIRAC cycles change
// things periodically, so cross-check before relying on it operationally.
export const REGIONAL_FREQUENCIES: RegionalFrequency[] = [
  { label: 'Trondheim V\u00e6rnes Approach (APP)', mhz: 118.605, lat: 63.4578, lon: 10.924 },
  { label: 'Trondheim V\u00e6rnes Tower (TWR)', mhz: 119.405, lat: 63.4578, lon: 10.924 },
  { label: 'Trondheim V\u00e6rnes Ground (GND)', mhz: 121.605, lat: 63.4578, lon: 10.924 },
  { label: 'Trondheim V\u00e6rnes Director (inbound/radar)', mhz: 119.155, lat: 63.4578, lon: 10.924 },

  {
    label: 'Bergen Flesland Approach, primary (APP)',
    mhz: 121.005,
    lat: 60.2934,
    lon: 5.2181,
    sourceUrl: 'https://aim-prod.avinor.no/no/AIP/View/Index/154/2026-06-11-AIRAC/graphics/579145.pdf'
  },
  {
    label: 'Bergen Flesland Approach, secondary/director',
    mhz: 118.855,
    lat: 60.2934,
    lon: 5.2181,
    sourceUrl: 'https://aim-prod.avinor.no/no/AIP/View/Index/154/2026-06-11-AIRAC/graphics/579145.pdf'
  },
  {
    label: 'Bergen Flesland Tower (TWR)',
    mhz: 119.105,
    lat: 60.2934,
    lon: 5.2181,
    sourceUrl: 'https://aim-prod.avinor.no/no/AIP/View/Index/154/2026-06-11-AIRAC/graphics/579145.pdf'
  },
  {
    label: 'Bergen Flesland Ground (GND)',
    mhz: 121.905,
    lat: 60.2934,
    lon: 5.2181,
    sourceUrl: 'https://aim-prod.avinor.no/no/AIP/View/Index/154/2026-06-11-AIRAC/graphics/579145.pdf'
  },
  {
    label: 'Bergen Flesland ATIS',
    mhz: 125.255,
    lat: 60.2934,
    lon: 5.2181,
    sourceUrl: 'https://aim-prod.avinor.no/no/AIP/View/Index/154/2026-06-11-AIRAC/graphics/579145.pdf'
  },

  { label: 'Stavanger Sola Approach (APP)', mhz: 119.605, lat: 58.8767, lon: 5.6378 },
  { label: 'Stavanger Sola Tower (TWR)', mhz: 118.355, lat: 58.8767, lon: 5.6378 },
  { label: 'Stavanger Sola Ground (GND)', mhz: 121.755, lat: 58.8767, lon: 5.6378 },

  {
    label: 'Haugesund Karm\u00f8y Tower/AFIS',
    mhz: 120.455,
    lat: 59.3453,
    lon: 5.2081,
    sourceUrl: 'https://partner.avinor.no/siteassets/ais-portalen-forside/aip-sup/en_sup_2025_a_065_en.pdf'
  },

  { label: 'Oslo Approach, south sector', mhz: 125.055, lat: 60.1939, lon: 11.1004 },
  { label: 'Oslo Approach, north sector', mhz: 120.455, lat: 60.1939, lon: 11.1004 },
  {
    label: 'Oslo Gardermoen Tower, west (TWR)',
    mhz: 118.305,
    lat: 60.1939,
    lon: 11.1004,
    sourceUrl: 'https://partner.avinor.no/siteassets/ais-portalen-forside/aip-sup/en_sup_2025_a_065_en.pdf'
  },
  {
    label: 'Oslo Gardermoen Tower, east (TWR)',
    mhz: 120.105,
    lat: 60.1939,
    lon: 11.1004,
    sourceUrl: 'https://partner.avinor.no/siteassets/ais-portalen-forside/aip-sup/en_sup_2025_a_065_en.pdf'
  },

  {
    label: 'Kjeller Tower / Oslo RMZ local channel',
    mhz: 119.105,
    lat: 59.9678,
    lon: 11.0347,
    note: 'Local channel within the Oslo Radio Mandatory Zone (RMZ).',
    sourceUrl: 'https://partner.avinor.no/siteassets/ais-portalen-forside/aip-sup/en_sup_2025_a_065_en.pdf'
  },

  { label: 'Skien Geiteryggen Information (AFIS)', mhz: 118.555, lat: 59.1867, lon: 9.5667 },

  { label: 'Bod\u00f8 Approach (APP)', mhz: 118.555, lat: 67.2692, lon: 14.3653 },
  { label: 'Bod\u00f8 Tower (TWR)', mhz: 119.155, lat: 67.2692, lon: 14.3653 },

  { label: 'Troms\u00f8 Approach (APP)', mhz: 119.305, lat: 69.6833, lon: 18.9189 },
  { label: 'Troms\u00f8 Tower (TWR)', mhz: 118.105, lat: 69.6833, lon: 18.9189 },

  {
    label: 'Polaris Control (M\u00f8re/Tr\u00f8ndelag FIS sector)',
    mhz: 126.455,
    lat: 63.0,
    lon: 9.5,
    approximate: true,
    alwaysShow: true,
    note: 'FIS sector covers a large area \u2014 always listed regardless of distance, since a single-point filter can\u2019t represent real sector coverage. Coordinates are only a rough regional anchor.'
  },
  {
    label: 'Polaris Control (Nordland FIS sector)',
    mhz: 126.705,
    lat: 67.0,
    lon: 14.5,
    approximate: true,
    alwaysShow: true,
    note: 'FIS sector covers a large area \u2014 always listed regardless of distance, since a single-point filter can\u2019t represent real sector coverage. Coordinates are only a rough regional anchor.'
  },
  {
    label: 'Polaris Control (Troms og Finnmark FIS sector)',
    mhz: 125.455,
    lat: 69.5,
    lon: 22.0,
    approximate: true,
    alwaysShow: true,
    note: 'FIS sector covers a large area \u2014 always listed regardless of distance, since a single-point filter can\u2019t represent real sector coverage. Coordinates are only a rough regional anchor.'
  }
]

export interface NearbyRegionalFrequency extends RegionalFrequency {
  distanceNm: number
}

// FIS sectors (alwaysShow) bypass the normal radiusNm cutoff since a
// single-point distance filter can't represent their real coverage area —
// but that shouldn't mean showing e.g. Polaris Control from clear across
// the country. This is a separate, larger cap just for those entries.
const ALWAYS_SHOW_MAX_NM = 100

/**
 * Returns regional/airport frequencies within radiusNm of any of the given
 * points (route waypoints, plus the live GPS position when tracking),
 * nearest first. Entries flagged alwaysShow (large FIS sectors) use a wider
 * cap (see ALWAYS_SHOW_MAX_NM above) instead of radiusNm, but aren't shown
 * unconditionally. Pass showAll to bypass every distance filter and return
 * everything, still sorted by distance when points are available.
 */
export function nearbyRegionalFrequencies(
  points: { lat: number; lon: number }[],
  radiusNm: number,
  distanceFn: (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => number,
  showAll: boolean = false
): NearbyRegionalFrequency[] {
  if (points.length === 0) {
    // With no route/position yet, there's nothing to measure distance
    // against — still surface the FIS sectors rather than hiding them.
    return REGIONAL_FREQUENCIES.filter((f) => f.alwaysShow || showAll).map((f) => ({
      ...f,
      distanceNm: NaN
    }))
  }

  const withDistance = REGIONAL_FREQUENCIES.map((f) => {
    const minDist = Math.min(...points.map((p) => distanceFn(p, f)))
    return { ...f, distanceNm: minDist }
  })

  return withDistance
    .filter(
      (f) =>
        showAll || (f.alwaysShow ? f.distanceNm <= ALWAYS_SHOW_MAX_NM : f.distanceNm <= radiusNm)
    )
    .sort((a, b) => a.distanceNm - b.distanceNm)
}
