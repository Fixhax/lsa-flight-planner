export interface AirstripEntry {
  id: string
  name: string
  icao?: string
  country: 'NO' | 'SE'
  region: string // county / län
  surface: 'grass' | 'gravel'
  lat: number
  lon: number
  lengthM?: number // runway length, metres
  elevationFt?: number // field elevation, feet AMSL
  runway?: string // e.g. '16/34' — omitted where not confirmed
  pprContact?: { name: string; phone: string } // shown as a persistent footnote once selected
  customsCleared?: boolean // designated customs aerodrome — relevant for NO/SE border crossings
  frequencies?: { type: string; mhz: number; note?: string }[] // only confirmed, published frequencies — omitted where not verified
  note?: string
}

// A starter set of confirmed grass/gravel strips in Norway and Sweden, for
// the waypoint dropdown. Each entry's surface and coordinates are sourced
// from public aviation references (Wikipedia airport articles, Wikidata,
// national aviation-club sites) — not an official AIP, so always cross-check
// against current charts/NOTAMs before flying, especially PPR requirements
// and any surface changes since these were recorded. Fields left undefined
// (length/elevation/runway) mean that detail wasn't confirmed in any source
// checked — the UI shows those as "—" rather than guessing.
//
// To add more: append an entry below with a unique id. No other file needs
// to change — the dropdown in App.tsx reads straight from this array.
export const airstrips: AirstripEntry[] = [
  {
    id: 'no-haslemoen',
    name: 'Haslemoen',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.6543,
    lon: 11.9105,
    lengthM: 585,
    elevationFt: 575,
    runway: '16/34',
    note: 'Ultralight/GA use'
  },
  {
    id: 'no-rognan',
    name: 'Rognan',
    icao: 'ENRG',
    country: 'NO',
    region: 'Nordland',
    surface: 'grass',
    lat: 67.0977,
    lon: 15.411,
    lengthM: 735,
    elevationFt: 15,
    runway: '01/19'
  },
  {
    id: 'no-engeloy',
    name: 'Engeløy, Grådussan',
    icao: 'ENEN',
    country: 'NO',
    region: 'Nordland',
    surface: 'grass',
    lat: 67.9672,
    lon: 14.9925,
    lengthM: 600,
    elevationFt: 10,
    runway: '05/23',
    note: 'PPR required'
  },
  {
    id: 'no-starmoen',
    name: 'Elverum, Starmoen',
    icao: 'ENHN',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.8764,
    lon: 11.6756,
    lengthM: 885,
    elevationFt: 709,
    runway: '15/33',
    note: 'Grass alongside a paved runway — glider/GA site'
  },
  {
    id: 'se-gryttjom',
    name: 'Gryttjom',
    icao: 'ESKG',
    country: 'SE',
    region: 'Uppland',
    surface: 'grass',
    lat: 60.2861,
    lon: 17.4294,
    elevationFt: 105,
    runway: '17/35',
    frequencies: [
      { type: 'Common/traffic', mhz: 123.65, note: 'Shared by several Swedish flying clubs and gliding sites in this area, not exclusive to Gryttjom \u2014 expect other traffic on it' }
    ],
    note: 'Active skydiving — check for jump ops; runway length not confirmed'
  },
  {
    id: 'se-gimo-grasfalt',
    name: 'Gimo gräsfält',
    country: 'SE',
    region: 'Uppland',
    surface: 'grass',
    lat: 60.183,
    lon: 18.183,
    note: 'Approximate position (pinned to Gimo village center); length/elevation/runway not confirmed'
  },
  {
    id: 'no-henning',
    name: 'Henning',
    country: 'NO',
    region: 'Trøndelag',
    surface: 'grass',
    lat: 63.9308,
    lon: 11.5876,
    lengthM: 470,
    elevationFt: 312,
    runway: '06/24',
    note: 'Home of Innherred Flyklubb'
  },
  {
    id: 'no-snasa-gronora',
    name: 'Snåsa, Grønøra',
    icao: 'ENGS',
    country: 'NO',
    region: 'Trøndelag',
    surface: 'gravel',
    lat: 64.183,
    lon: 12.1702,
    lengthM: 590,
    elevationFt: 79,
    runway: '04/22',
    customsCleared: true,
    note: 'Mixed grass/gravel surface; customs-approved aerodrome'
  },
  {
    id: 'se-frostlanda',
    name: 'Frostlanda',
    country: 'SE',
    region: 'Jämtland',
    surface: 'gravel',
    lat: 64.4821,
    lon: 14.1045,
    lengthM: 800,
    runway: '07/25',
    note: 'Near Gäddede; elevation not confirmed'
  },
  {
    id: 'no-frosta',
    name: 'Frosta',
    country: 'NO',
    region: 'Trøndelag',
    surface: 'grass',
    lat: 63.613811,
    lon: 10.761887,
    lengthM: 500,
    pprContact: { name: 'Arnt Ring', phone: '97993005' },
    note: 'Surface assumed grass (not independently confirmed) \u2014 PPR required, call owner'
  },
  {
    id: 'no-klanten',
    name: 'Gol, Klanten',
    icao: 'ENKL',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 60.7914,
    lon: 9.0506,
    lengthM: 1150,
    elevationFt: 2720,
    runway: '11/29',
    frequencies: [
      {
        type: 'Traffic',
        mhz: 133.99,
        note: 'New local frequency effective 1 Jan 2026 (8.33 kHz changeover), confirmed on the field\u2019s own club site \u2014 switch to it within 8nm and below 6,000ft AMSL of Klanten; replaces the field\u2019s previous local frequency.'
      }
    ],
    note: 'Grass strip (per Wikipedia; club site says 1150m with a 660m paved inset, sources vary slightly on the declared length) \u2014 winter length typically ~800m. Home of Hallingdal Flyklubb; active glider/aerobatic soaring and towing site as well as GA.'
  }
]
