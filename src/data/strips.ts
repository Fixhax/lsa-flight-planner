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

// Grass/gravel strips in Norway and Sweden, for the waypoint dropdown.
// Each entry's surface and coordinates are sourced from public aviation
// references (Wikipedia airport articles, Wikidata, national aviation-club
// sites, and — for the large batch appended below the "no-klanten" entry —
// the community-maintained "Norske Mikroflystriper" Google My Maps) — not
// an official AIP, so always cross-check against current charts/NOTAMs
// before flying, especially PPR requirements and any surface/status
// changes since these were recorded. Fields left undefined (length/
// elevation/runway) mean that detail wasn't confirmed in any source
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
    note: 'Ultralight/GA use — flagged as currently not operational ("IKKE OPERATIV") by the "Norske Mikroflystriper" community map as of its last update; confirm current status before planning to use it'
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
  },

  // Below: strips sourced from "Norske Mikroflystriper" (a community-
  // maintained Google My Maps, ~171 pins, published 2021), filtered to
  // small uncontrolled strips only \u2014 major controlled/scheduled Avinor-
  // network airports were deliberately excluded, since this dropdown is
  // for the small-strip use case those are already well-documented
  // elsewhere for. County/region assigned from coordinates, cross-checked
  // against a live geocode for a sample of these. None of these have been
  // individually re-verified beyond that source: surface is assumed grass
  // (not confirmed either way) unless noted otherwise, and length/
  // elevation/runway are omitted rather than guessed. PPR, restriction,
  // closure, and contact notes below are carried over from the source as
  // of its last update \u2014 treat all of it, especially those, as something
  // to confirm locally/against the current AIP before relying on it.
  {
    id: 'no-evje',
    name: 'Evje flystripe',
    country: 'NO',
    region: 'Agder',
    surface: 'grass',
    lat: 58.6054,
    lon: 7.8079
  },
  {
    id: 'no-ripel-omvikdal',
    name: 'Ripel i Omvikdal',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 59.938,
    lon: 5.9901
  },
  {
    id: 'no-gulli',
    name: 'Gulli',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 60.1337,
    lon: 11.4532
  },
  {
    id: 'no-lier',
    name: 'Lier flystripe',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 59.8856,
    lon: 10.279
  },
  {
    id: 'no-sogne',
    name: 'S\u00f8gne flystripe',
    country: 'NO',
    region: 'Agder',
    surface: 'grass',
    lat: 58.0936,
    lon: 7.8208,
    pprContact: { name: 'Reidar Olsen', phone: '91514580' },
    note: 'PPR \u2014 also coordinate with Kjevik CTR'
  },
  {
    id: 'no-meraker-oian',
    name: 'Mer\u00e5ker, \u00d8ian',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.3723,
    lon: 11.8117
  },
  {
    id: 'no-atna',
    name: 'Atna',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.7257,
    lon: 10.8422
  },
  {
    id: 'no-vinnu-sunndal',
    name: 'Vinnu, Sunndal',
    country: 'NO',
    region: 'M\u00f8re og Romsdal',
    surface: 'grass',
    lat: 62.6548,
    lon: 8.6841
  },
  {
    id: 'no-froya-flatval',
    name: 'Fr\u00f8ya, Flatval',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.7005,
    lon: 8.7604
  },
  {
    id: 'no-brekken-bergosen',
    name: 'Brekken, Bergosen',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 62.6552,
    lon: 11.855
  },
  {
    id: 'no-agdenes-breivika',
    name: 'Agdenes, Breivika',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.6286,
    lon: 9.7269
  },
  {
    id: 'no-sandane',
    name: 'Sandane',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 61.8301,
    lon: 6.1081
  },
  {
    id: 'no-floro',
    name: 'Flor\u00f8',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 61.5814,
    lon: 5.0153
  },
  {
    id: 'no-gossen',
    name: 'Gossen',
    country: 'NO',
    region: 'M\u00f8re og Romsdal',
    surface: 'grass',
    lat: 62.8346,
    lon: 6.8315
  },
  {
    id: 'no-gauldal-ler',
    name: 'Gauldal, Ler',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.1979,
    lon: 10.2906
  },
  {
    id: 'no-gravvold-surnadal',
    name: 'Gravvold, Surnadal',
    country: 'NO',
    region: 'M\u00f8re og Romsdal',
    surface: 'grass',
    lat: 63.0549,
    lon: 8.7139
  },
  {
    id: 'no-fiske-surnadal',
    name: 'Fiske, Surnadal',
    country: 'NO',
    region: 'M\u00f8re og Romsdal',
    surface: 'grass',
    lat: 63.0118,
    lon: 9.0441
  },
  {
    id: 'no-bjorli',
    name: 'Bjorli',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 62.2357,
    lon: 8.2468
  },
  {
    id: 'no-wadahl',
    name: 'Wadahl',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.4994,
    lon: 9.7982
  },
  {
    id: 'no-frya',
    name: 'Frya',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.5449,
    lon: 10.0633
  },
  {
    id: 'no-fagernes-leirin',
    name: 'Fagernes, Leirin',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.0142,
    lon: 9.2883
  },
  {
    id: 'no-dokka-thomlevold',
    name: 'Dokka, Thomlevold',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.8335,
    lon: 9.9101
  },
  {
    id: 'no-reinsvoll',
    name: 'Reinsvoll',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.6737,
    lon: 10.5655
  },
  {
    id: 'no-husodden',
    name: 'Husodden',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.7478,
    lon: 10.2383,
    note: 'Also a registered seaplane base'
  },
  {
    id: 'no-boverbu',
    name: 'B\u00f8verbu',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.6373,
    lon: 10.6769
  },
  {
    id: 'no-folldal-grimsmoen',
    name: 'Folldal, Grimsmoen',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 62.1169,
    lon: 10.1103
  },
  {
    id: 'no-tynset',
    name: 'Tynset',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 62.2566,
    lon: 10.6693
  },
  {
    id: 'no-roros',
    name: 'R\u00f8ros',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 62.5797,
    lon: 11.3426
  },
  {
    id: 'no-solenstua',
    name: 'S\u00f8lenstua',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.8395,
    lon: 11.7302
  },
  {
    id: 'no-aera',
    name: '\u00c6ra',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.2583,
    lon: 11.669
  },
  {
    id: 'no-trysil-saeteraasen',
    name: 'Trysil, S\u00e6ter\u00e5sen',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.2296,
    lon: 12.2659
  },
  {
    id: 'no-trysil-ljordalen',
    name: 'Trysil, Lj\u00f8rdalen',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.3547,
    lon: 12.7562
  },
  {
    id: 'no-hamar-stafsberg',
    name: 'Hamar, Stafsberg',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.8196,
    lon: 11.0657
  },
  {
    id: 'no-mesnali',
    name: 'Mesnali',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.0835,
    lon: 10.6835
  },
  {
    id: 'no-kongsvinger-gjolstad',
    name: 'Kongsvinger, Gj\u00f8lstad',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.2673,
    lon: 12.0226
  },
  {
    id: 'no-maarud',
    name: 'Maarud',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 60.1813,
    lon: 11.5651
  },
  {
    id: 'no-haga',
    name: 'Haga',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 60.0199,
    lon: 11.3819
  },
  {
    id: 'no-kjeller',
    name: 'Kjeller',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 59.9699,
    lon: 11.0406,
    note: 'Historic airfield adjoining the built-up Kjeller area \u2014 confirm current civil-use status locally'
  },
  {
    id: 'no-ski',
    name: 'Ski',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 59.7084,
    lon: 10.8822
  },
  {
    id: 'no-torsnes',
    name: 'Torsnes',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.1953,
    lon: 11.0633
  },
  {
    id: 'no-rakkestad',
    name: 'Rakkestad',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.3973,
    lon: 11.3465
  },
  {
    id: 'se-arvika',
    name: 'Arvika',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 59.6752,
    lon: 12.6394
  },
  {
    id: 'no-jarlsberg',
    name: 'Jarlsberg',
    country: 'NO',
    region: 'Vestfold',
    surface: 'grass',
    lat: 59.2985,
    lon: 10.3699
  },
  {
    id: 'no-hokksund',
    name: 'Hokksund',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 59.7598,
    lon: 9.9175
  },
  {
    id: 'no-geilo-dagali',
    name: 'Geilo, Dagali',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 60.4165,
    lon: 8.5128
  },
  {
    id: 'no-eggemoen',
    name: 'Eggemoen',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 60.21,
    lon: 10.3116
  },
  {
    id: 'no-stryn',
    name: 'Stryn',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 61.9104,
    lon: 6.7555,
    note: 'PPR'
  },
  {
    id: 'no-orsta-hovden',
    name: '\u00d8rsta, Hovden',
    country: 'NO',
    region: 'M\u00f8re og Romsdal',
    surface: 'grass',
    lat: 62.1797,
    lon: 6.0714
  },
  {
    id: 'no-sogndal-haukaasen',
    name: 'Sogndal, Hauk\u00e5sen',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 61.1553,
    lon: 7.1352
  },
  {
    id: 'no-forde-bringeland',
    name: 'F\u00f8rde, Bringeland',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 61.3923,
    lon: 5.7606
  },
  {
    id: 'no-voss-bomoen',
    name: 'Voss, B\u00f8moen',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 60.6379,
    lon: 6.4987
  },
  {
    id: 'no-os-vaksinen',
    name: 'Os, Vaksinen (Ulven)',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 60.1911,
    lon: 5.4202,
    note: 'Restricted \u2014 gliders and PPL only per source, not open GA use'
  },
  {
    id: 'no-stord-sorstokken',
    name: 'Stord, S\u00f8rstokken',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 59.7931,
    lon: 5.339
  },
  {
    id: 'no-haugesund-karmoy',
    name: 'Haugesund, Karm\u00f8y area strip',
    country: 'NO',
    region: 'Rogaland',
    surface: 'grass',
    lat: 59.3432,
    lon: 5.2113
  },
  {
    id: 'no-lista-farsund',
    name: 'Lista, Farsund',
    country: 'NO',
    region: 'Agder',
    surface: 'grass',
    lat: 58.1003,
    lon: 6.6244
  },
  {
    id: 'no-sylvknapp-valle',
    name: 'Sylvknapp, Valle',
    country: 'NO',
    region: 'Agder',
    surface: 'grass',
    lat: 59.0311,
    lon: 7.5549
  },
  {
    id: 'no-arendal-gullknapp',
    name: 'Arendal, Gullknapp',
    country: 'NO',
    region: 'Agder',
    surface: 'grass',
    lat: 58.5169,
    lon: 8.7046,
    note: 'Source flags this field as closed (\u201cStengt\u201d) as of its last update \u2014 confirm current status before planning to use it'
  },
  {
    id: 'no-lunde-nome',
    name: 'Lunde, Nome',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.2981,
    lon: 9.1317
  },
  {
    id: 'no-skien-geitryggen',
    name: 'Skien, Geitryggen',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.1836,
    lon: 9.5667
  },
  {
    id: 'no-notodden-tuven',
    name: 'Notodden, Tuven',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.5666,
    lon: 9.2092
  },
  {
    id: 'no-oppdal-fagerhaug',
    name: 'Oppdal, Fagerhaug',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 62.6513,
    lon: 9.8516
  },
  {
    id: 'se-torsby',
    name: 'Torsby',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.1591,
    lon: 12.9895
  },
  {
    id: 'no-fyresdal',
    name: 'Fyresdal',
    icao: 'ENFY',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.2021,
    lon: 8.0878
  },
  {
    id: 'no-gaundalen',
    name: 'Gaundalen',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 64.0123,
    lon: 12.6807
  },
  {
    id: 'no-grong-bjorgan',
    name: 'Grong, Bj\u00f8rgan',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 64.3956,
    lon: 12.3402
  },
  {
    id: 'no-stor-amdal-overhalla',
    name: 'Stor-Amdal, Overhalla',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 64.5275,
    lon: 11.9881
  },
  {
    id: 'se-sunne',
    name: 'Sunne',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 59.8543,
    lon: 13.1028
  },
  {
    id: 'se-hedlanda',
    name: 'Hedlanda',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 62.4103,
    lon: 13.7448
  },
  {
    id: 'se-hagfors',
    name: 'Hagfors',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.0199,
    lon: 13.5789
  },
  {
    id: 'se-sveg',
    name: 'Sveg',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 62.0478,
    lon: 14.4186
  },
  {
    id: 'se-mora',
    name: 'Mora',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 60.9583,
    lon: 14.5106
  },
  {
    id: 'se-orsa',
    name: 'Orsa',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 61.19,
    lon: 14.7122
  },
  {
    id: 'se-optand',
    name: 'Optand',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.1296,
    lon: 14.802
  },
  {
    id: 'se-hemavan',
    name: 'Hemavan',
    country: 'SE',
    region: 'V\u00e4sterbotten',
    surface: 'grass',
    lat: 65.8075,
    lon: 15.0811
  },
  {
    id: 'se-hallviken',
    name: 'Hallviken',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.738,
    lon: 15.4594
  },
  {
    id: 'se-alingsas',
    name: 'Alings\u00e5s',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 57.9493,
    lon: 12.576
  },
  {
    id: 'se-stromstad-nasinge',
    name: 'Str\u00f6mstad, N\u00e4singe',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 59.0168,
    lon: 11.34
  },
  {
    id: 'se-fjallbacka-anras',
    name: 'Fj\u00e4llbacka, Anr\u00e5s',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.6302,
    lon: 11.3149
  },
  {
    id: 'se-uddevalla-rorkarr',
    name: 'Uddevalla, R\u00f6rk\u00e4rr',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.367,
    lon: 11.7746
  },
  {
    id: 'se-uddevalla-backamo',
    name: 'Uddevalla, Backamo',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.1771,
    lon: 11.9736
  },
  {
    id: 'se-bondestroms-gard',
    name: 'Bondestr\u00f6ms G\u00e5rd',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.1491,
    lon: 12.1263
  },
  {
    id: 'se-eksharad',
    name: 'Eksh\u00e4rad flygf\u00e4lt',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.154,
    lon: 13.5298
  },
  {
    id: 'se-backa',
    name: 'Backa',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.5308,
    lon: 13.1218
  },
  {
    id: 'se-malung-skinnlanda',
    name: 'Malung, Skinnlanda',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 60.6591,
    lon: 13.7266
  },
  {
    id: 'se-siljansnas',
    name: 'Siljansn\u00e4s Airpark',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 60.7851,
    lon: 14.8269
  },
  {
    id: 'se-salenfjallen',
    name: 'S\u00e4lenfj\u00e4llen',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 61.1584,
    lon: 12.8423
  },
  {
    id: 'se-finnskoga-backa',
    name: 'Finnskoga, Backa',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.5534,
    lon: 13.1024
  },
  {
    id: 'se-alvdalen',
    name: '\u00c4lvdalen',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 61.2141,
    lon: 14.0445
  },
  {
    id: 'se-funasdalen',
    name: 'Fun\u00e4sdalen Heliport',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 62.5222,
    lon: 12.5954
  },
  {
    id: 'se-oviken-graftavallen',
    name: 'Oviken, Gr\u00e4ft\u00e5vallen',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.0382,
    lon: 14.0014
  },
  {
    id: 'se-svenstavik',
    name: 'Svenstavik flygf\u00e4lt',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 62.7785,
    lon: 14.4062
  },
  {
    id: 'se-ottsjoen',
    name: 'Ottsj\u00f6en, Vinterplats',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.2076,
    lon: 13.0072,
    note: 'Winter operations only per source'
  },
  {
    id: 'se-are-molanda',
    name: '\u00c5re, Molanda',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.328,
    lon: 13.4225
  },
  {
    id: 'se-vilhelmina-sagadal',
    name: 'Vilhelmina, Sagadal',
    country: 'SE',
    region: 'V\u00e4sterbotten',
    surface: 'grass',
    lat: 64.5785,
    lon: 16.8333
  },
  {
    id: 'se-goviken',
    name: 'G\u00f6viken Heli Port & Sj\u00f6flygplats',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.1922,
    lon: 14.6308
  },
  {
    id: 'se-are-ostersund-froson',
    name: '\u00d6stersund, Fr\u00f6s\u00f6n',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.1949,
    lon: 14.4951
  },
  {
    id: 'se-alaasen',
    name: '\u00c5l\u00e5sen flygplats',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.8656,
    lon: 14.609
  },
  {
    id: 'no-salangen-elvenes',
    name: 'Salangen, Elvenes',
    country: 'NO',
    region: 'Troms',
    surface: 'grass',
    lat: 68.8706,
    lon: 17.9828
  },
  {
    id: 'no-setermoen-artillerisletta',
    name: 'Setermoen, Artillerisletta',
    country: 'NO',
    region: 'Troms',
    surface: 'grass',
    lat: 68.856,
    lon: 18.3506,
    note: 'PPR \u2014 primarily reserved for Bardufoss flyklubb per source; others contact the landowner'
  },
  {
    id: 'no-kautokeino',
    name: 'Kautokeino',
    country: 'NO',
    region: 'Finnmark',
    surface: 'grass',
    lat: 69.0404,
    lon: 23.0345
  },
  {
    id: 'no-kjollefjord',
    name: 'Kj\u00f8llefjord flystripe',
    country: 'NO',
    region: 'Finnmark',
    surface: 'grass',
    lat: 70.9403,
    lon: 27.3474
  },
  {
    id: 'no-eidsberg',
    name: 'Eidsberg',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.5337,
    lon: 11.2428
  },
  {
    id: 'no-huseby',
    name: 'Huseby',
    country: 'NO',
    region: 'Vestfold',
    surface: 'grass',
    lat: 59.2678,
    lon: 10.8112
  },
  {
    id: 'no-trogstad',
    name: 'Tr\u00f8gstad',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.6833,
    lon: 11.2954
  },
  {
    id: 'no-spydeberg',
    name: 'Spydeberg',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.6653,
    lon: 11.1193
  },
  {
    id: 'no-rompene-trikeport',
    name: 'Rompene Trikeport, Gulen',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 60.9285,
    lon: 5.1587,
    lengthM: 210
  },
  {
    id: 'no-ruteig',
    name: 'Ruteig',
    country: 'NO',
    region: 'Vestfold',
    surface: 'grass',
    lat: 59.4753,
    lon: 10.1944
  },
  {
    id: 'no-teien-sande',
    name: 'Teien, Sande',
    country: 'NO',
    region: 'Vestfold',
    surface: 'grass',
    lat: 59.5844,
    lon: 10.187,
    note: 'PPR'
  },
  {
    id: 'no-kloefta-stokker',
    name: 'Kl\u00f8fta, Stokker',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 60.0663,
    lon: 11.2116
  },
  {
    id: 'no-hoyland',
    name: 'H\u00f8yland flystripe',
    country: 'NO',
    region: 'Rogaland',
    surface: 'grass',
    lat: 58.6853,
    lon: 5.5833
  },
  {
    id: 'no-skogn',
    name: 'Skogn flyplass',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.696,
    lon: 11.226,
    note: 'Only by prior arrangement per source \u2014 not open-access'
  },
  {
    id: 'no-sor-reime',
    name: 'S\u00f8r-Reime',
    country: 'NO',
    region: 'Rogaland',
    surface: 'grass',
    lat: 58.6382,
    lon: 5.6167
  },
  {
    id: 'no-stadsbygd',
    name: 'Stadsbygd mikroflystripe',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.526,
    lon: 10.0344,
    note: 'Owner/POC per source: H\u00e5vard Ersland'
  },
  {
    id: 'no-dorndal-rissa',
    name: 'D\u00f8rndal, Rissa',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.5989,
    lon: 9.9597,
    note: 'Contact per source: Olav Sand, \u00d8rland Flyklubb'
  },
  {
    id: 'no-raustein-agdenes',
    name: 'Raustein, Agdenes',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.6136,
    lon: 9.5847,
    pprContact: { name: 'Morten Raustein', phone: '97049973' },
    note: 'A working field, not a dedicated strip \u2014 only usable by prior arrangement and when it suits the owner\u2019s farm operations'
  },
  {
    id: 'no-leirvatnet',
    name: 'Leirvatnet',
    country: 'NO',
    region: 'Troms',
    surface: 'gravel',
    lat: 68.8972,
    lon: 20.2478,
    note: 'Old military OP strip on a moraine ridge, condition last checked ok in 2002 per source \u2014 landing permission required from M\u00e5lselv kommune/Troms fylke; treat condition as unverified until confirmed current'
  }
]
