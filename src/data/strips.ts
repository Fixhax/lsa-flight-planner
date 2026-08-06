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
    frequencies: [
      { type: 'Common/traffic', mhz: 123.065, note: 'Norwegian common frequency for uncontrolled areas (enroute, blind calls) — not exclusive to Henning' }
    ],
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
    lon: 7.8079,
    lengthM: 485,
    elevationFt: 600,
    runway: '11/29',
    note: 'Grass surface confirmed — Evje flyplass on Evjeneset in the Otra river, Evje og Hornnes'
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
    icao: 'ENMO',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.3723,
    lon: 11.8117,
    lengthM: 590,
    elevationFt: 980,
    runway: '16/34',
    note: 'Grass surface confirmed (somewhat uneven terrain noted, crushed gabbro fill) \u2014 length/elevation corrected to 590m/980ft per Wikipedia (Mer\u00e5ker flyplass, \u00d8ian), which differs from the 592m/1010ft previously cited to a "Praktisk Flyging" mikrofly guide; landing fee NOK 50, MoGas available'
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
    icao: 'ENFA',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.7005,
    lon: 8.7604,
    lengthM: 1199,
    elevationFt: 152,
    runway: '04/22',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Fr\u00f8ya flyplass, Flatval per Wikipedia; runway extended to current 1,199m with lighting added in late 2023; elevation 46.3m/152ft. Not certified for aircraft over 5.7t/10 seats; former home of the now-disbanded Fr\u00f8ya Flyklubb'
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
    lon: 9.7269,
    lengthM: 500,
    elevationFt: 259,
    runway: '07/25',
    note: 'Grass surface confirmed \u2014 per Wikidata (Agdenes Airport, Q11957004): runway 07/25, 500\u00d78m, elevation 79m/259ft'
  },
  {
    id: 'no-gossen',
    name: 'Gossen',
    country: 'NO',
    region: 'M\u00f8re og Romsdal',
    surface: 'grass',
    lat: 62.8346,
    lon: 6.8315,
    note: 'Former WWII Luftwaffe airfield (Aukra flyplass, Gossen) \u2014 per Wikipedia the original 1650m runway has shrunk to roughly 550m and is now described as used largely for model aircraft flying; current usability for full-scale GA aircraft is unclear, so no length/runway data added'
  },
  {
    id: 'no-gauldal-ler',
    name: 'Gauldal, Ler',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 63.1979,
    lon: 10.2906,
    lengthM: 700,
    elevationFt: 151,
    runway: '17/35',
    note: 'Grass surface confirmed \u2014 also known as Losen flystripe, home of Gauldal Seilflyklubb since 1995 \u2014 per Wikidata (Ler Airport, Q11983769): runway 17/35, 700\u00d725m, elevation 46m/151ft'
  },
  {
    id: 'no-gravvold-surnadal',
    name: 'Gravvold, Surnadal',
    country: 'NO',
    region: 'M\u00f8re og Romsdal',
    surface: 'grass',
    lat: 63.0549,
    lon: 8.7139,
    lengthM: 630,
    elevationFt: 151,
    runway: '07/25',
    note: 'Grass surface confirmed \u2014 operated by Surnadal Luftsportsklubb \u2014 per Wikidata (Gravvold Airport, Q17778382): runway 07/25, 630\u00d720m, elevation 46m/151ft'
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
    icao: 'ENLB',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 62.2357,
    lon: 8.2468,
    lengthM: 800,
    runway: '12/30',
    note: 'Surface is actually paved (asphalt), not grass — Bjorli flyplass (Lesja flyplass, Bjorli) per Wikipedia; used for skydiving operations'
  },
  {
    id: 'no-wadahl',
    name: 'Wadahl',
    country: 'NO',
    region: 'Innlandet',
    surface: 'gravel',
    lat: 61.4994,
    lon: 9.7982,
    lengthM: 500,
    elevationFt: 3150,
    runway: '15/33',
    note: 'Surface corrected to mixed gravel/grass ("Grus og gress"), not pure grass — per Wikipedia (Wadahl flyplass); opened 1970 near Wadahl Høgfjellshotel at Gålå, extended from under 330m to the current 500×8m; elevation 950m/3150ft, described as "probably Norway’s highest-lying airfield"'
  },
  {
    id: 'no-frya',
    name: 'Frya',
    icao: 'ENRI',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.5449,
    lon: 10.0633,
    lengthM: 800,
    elevationFt: 570,
    runway: '10/28',
    note: 'Surface is actually paved (asphalt), not grass — Ringebu flyplass, Frya per Wikipedia; skydiving conducted by Lesja and Hamar parachute clubs, home of Gudbrandsdal Flyklubb'
  },
  {
    id: 'no-dokka-thomlevold',
    name: 'Dokka, Thomlevold',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.8335,
    lon: 9.9101,
    lengthM: 740,
    note: 'Grass surface confirmed — per Store norske leksikon; private strip belonging to Land Flyklubb, year-round operation'
  },
  {
    id: 'no-reinsvoll',
    name: 'Reinsvoll',
    icao: 'ENRV',
    country: 'NO',
    region: 'Innlandet',
    surface: 'gravel',
    lat: 60.6737,
    lon: 10.5655,
    lengthM: 600,
    elevationFt: 1381,
    runway: '16/34',
    note: 'Surface corrected to gravel, not grass \u2014 per Wikidata (Reinsvoll Airport, Q19386419): runway 16/34, 600\u00d720m, elevation 421m/1381ft; operated by Gj\u00f8vik og Toten Flyklubb'
  },
  {
    id: 'no-husodden',
    name: 'Husodden',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.7478,
    lon: 10.2383,
    lengthM: 600,
    elevationFt: 450,
    runway: '14/32',
    note: 'Grass surface confirmed \u2014 per Wikipedia (Husodden flyplass): runway 14/32, 600m, elevation 140m/450ft; established 1991 by landowner Lars Nordraak on the Husodden peninsula, Randsfjorden. Also a registered seaplane base'
  },
  {
    id: 'no-boverbu',
    name: 'B\u00f8verbu',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 60.6373,
    lon: 10.6769,
    lengthM: 600,
    elevationFt: 1330,
    runway: '18/36',
    frequencies: [
      {
        type: 'Local/blind calls',
        mhz: 123.065,
        note: 'The field\u2019s own page publishes 123.500 MHz for blind reporting \u2014 that frequency is obsolete nationally, superseded by 123.065 (see this app\u2019s reference frequency list), so listed here as 123.065 instead'
      }
    ],
    note: 'Grass surface confirmed \u2014 matches Wikipedia\u2019s "B\u00f8verbru flyplass" (likely the same field as this entry, whose name here is missing the final "r" \u2014 coordinates match closely, worth double-checking): runway 18/36, 600\u00d730m, elevation 405.4m/1330ft; established by farm owner Jan Stikbakke with Seilflyklubben Mj\u00f8sa (disbanded 2013), now operated by Ringerike Mikroflyklubb'
  },
  {
    id: 'no-folldal-grimsmoen',
    name: 'Folldal, Grimsmoen',
    icao: 'ENGN',
    country: 'NO',
    region: 'Innlandet',
    surface: 'gravel',
    lat: 62.1169,
    lon: 10.1103,
    lengthM: 1000,
    elevationFt: 2263,
    note: 'Surface corrected to gravel (with concrete pads at both ends for engine run-ups) — per Wikipedia; popular gliding site near Rondane/Dovrefjell for mountain-wave conditions'
  },
  {
    id: 'no-tynset',
    name: 'Tynset',
    icao: 'ENTY',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 62.2566,
    lon: 10.6693,
    lengthM: 940,
    elevationFt: 1580,
    runway: '05/23',
    note: 'Grass surface confirmed (regarded as one of the country\u2019s best grass runways) \u2014 per Wikipedia/tynsetflyklubb.no; home of Tynset Flyklubb'
  },
  {
    id: 'no-solenstua',
    name: 'S\u00f8lenstua',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.8395,
    lon: 11.7302,
    lengthM: 800,
    elevationFt: 1900,
    runway: '02/20',
    note: 'Per airportguide.com (S\u00f8lenstua Airfield, EN25), in Rendalen: runway 02/20, approx. 800\u00d712m, field elevation 1900ft/579m MSL. That is an aviation-reference aggregator rather than an official/primary source, so treat with more caution than Wikipedia-sourced entries in this list; surface not stated by that source, left as default grass'
  },
  {
    id: 'no-aera',
    name: '\u00c6ra',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.2583,
    lon: 11.669,
    lengthM: 600,
    elevationFt: 1621,
    runway: '01/19',
    note: 'Surface is actually paved (asphalt), not grass \u2014 \u00d8stre \u00c6ra Airport per Wikidata; operated by Norges Luftsportforbund'
  },
  {
    id: 'no-trysil-saeteraasen',
    name: 'Trysil, S\u00e6ter\u00e5sen',
    icao: 'ENTS',
    country: 'NO',
    region: 'Innlandet',
    surface: 'grass',
    lat: 61.2296,
    lon: 12.2659,
    lengthM: 800,
    runway: '15/33',
    note: 'Runway is ~30m wide with only the center 8.6m paved (asphalt) \u2014 per metar-taf.com; skydiving, gliding and advanced VFR flying conducted here, operated by Trysil flying club'
  },
  {
    id: 'no-trysil-ljordalen',
    name: 'Trysil, Lj\u00f8rdalen',
    country: 'NO',
    region: 'Innlandet',
    surface: 'gravel',
    lat: 61.3547,
    lon: 12.7562,
    lengthM: 800,
    note: 'Surface corrected to gravel (morenegrus/moraine gravel), not grass, per search results citing the field\u2019s own data'
  },
  {
    id: 'no-hamar-stafsberg',
    name: 'Hamar, Stafsberg',
    icao: 'ENHA',
    country: 'NO',
    region: 'Innlandet',
    surface: 'gravel',
    lat: 60.8196,
    lon: 11.0657,
    lengthM: 800,
    elevationFt: 729,
    runway: '15/33',
    note: 'Surface corrected to gravel with a paved (asphalt) center strip ~10m wide, per a 2022 NSIA (Statens havarikommisjon) accident report; some other sources list it simply as asphalt. Runway length figures vary slightly between sources (800m per NSIA/TODA vs up to ~944m physical length cited elsewhere). Operated by Innlandet Luftsportsenter.'
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
    lon: 12.0226,
    lengthM: 770,
    elevationFt: 495,
    runway: '16/34',
    note: 'Grass surface confirmed; home of Phoenix Mikroflyklubb'
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
    icao: 'ENKJ',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 59.9699,
    lon: 11.0406,
    lengthM: 1735,
    elevationFt: 354,
    runway: '12/30',
    note: 'Surface is actually paved (asphalt), not grass \u2014 per Wikipedia (Kjeller Airfield); historic airfield adjoining the built-up Kjeller area \u2014 confirm current civil-use status locally'
  },
  {
    id: 'no-ski',
    name: 'Ski',
    country: 'NO',
    region: 'Akershus',
    surface: 'grass',
    lat: 59.7084,
    lon: 10.8822,
    lengthM: 525,
    elevationFt: 350,
    runway: '01/19',
    note: 'Grass surface confirmed — Ski flyplass, Søndre Ski Gård per Wikipedia; home of Follo Flyklubb, established 1963'
  },
  {
    id: 'no-torsnes',
    name: 'Torsnes',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.1953,
    lon: 11.0633,
    note: 'Grass surface confirmed, summer-season operation only \u2014 per Wikipedia; an outbase of Flyklubben \u00d8st; length/runway not confirmed'
  },
  {
    id: 'no-rakkestad',
    name: 'Rakkestad',
    icao: 'ENRK',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.3973,
    lon: 11.3465,
    lengthM: 1080,
    elevationFt: 380,
    runway: '15/33',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Rakkestad flyplass, \u00c5storp per Wikipedia; originally a 600m grass strip (1970), paved in 1998 and extended to 1080m in 2009. Private field, home of Norr\u00f8nafly, Rakkestad Flyklubb and Nimbus Fallskjermklubb'
  },
  {
    id: 'se-arvika',
    name: 'Arvika',
    icao: 'ESKV',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 59.6752,
    lon: 12.6394,
    lengthM: 1150,
    elevationFt: 237,
    runway: '01/19',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Arvika flygplats, Westlanda per Wikipedia; private field serving Arvika Flygklubb'
  },
  {
    id: 'no-jarlsberg',
    name: 'Jarlsberg',
    icao: 'ENJB',
    country: 'NO',
    region: 'Vestfold',
    surface: 'grass',
    lat: 59.2985,
    lon: 10.3699,
    lengthM: 800,
    elevationFt: 90,
    runway: '18/36',
    note: 'Surface is actually paved (asphalt), not grass — Tønsberg flyplass, Jarlsberg per Wikipedia; operated by Jarlsberg Luftsportssenter AS, home to Tønsberg Flyveklubb and other clubs (motor, sport, model, glider, parachuting)'
  },
  {
    id: 'no-hokksund',
    name: 'Hokksund',
    icao: 'ENHS',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 59.7598,
    lon: 9.9175,
    lengthM: 630,
    elevationFt: 30,
    runway: '10/28',
    note: 'Grass surface confirmed; important gliding site with significant motor/microfly activity too'
  },
  {
    id: 'no-geilo-dagali',
    name: 'Geilo, Dagali',
    icao: 'ENDI',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 60.4165,
    lon: 8.5128,
    note: 'Surface is actually paved, not grass — Geilo Airport, Dagali per Wikipedia; private field, usable runway length varies by source/season (up to ~1000m summer, ~850m winter when plowed; historically paved to 1800m) so no single length figure is recorded here'
  },
  {
    id: 'no-eggemoen',
    name: 'Eggemoen',
    icao: 'ENEG',
    country: 'NO',
    region: 'Buskerud',
    surface: 'grass',
    lat: 60.21,
    lon: 10.3116,
    lengthM: 2100,
    elevationFt: 660,
    runway: '04/22',
    note: 'Surface is actually paved (asphalt), not grass — Hønefoss Airport, Eggemoen per Wikipedia/eggemoen.no; part of the Eggemoen Aviation & Technology Park, not part of the Avinor network'
  },
  {
    id: 'no-stryn',
    name: 'Stryn',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 61.9104,
    lon: 6.7555,
    lengthM: 260,
    elevationFt: 12,
    runway: '09/27',
    note: 'Grass surface confirmed — per Stryn Luftsportsklubb (strynluftsport.no); PPR required, two hangars and a clubhouse on site'
  },
  {
    id: 'no-voss-bomoen',
    name: 'Voss, B\u00f8moen',
    icao: 'ENBM',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 60.6379,
    lon: 6.4987,
    lengthM: 1000,
    elevationFt: 331,
    runway: '09/27',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Voss Airport, B\u00f8moen per Wikipedia; former military field, not part of the Avinor network'
  },
  {
    id: 'no-os-vaksinen',
    name: 'Os, Vaksinen (Ulven)',
    icao: 'ENUL',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 60.1911,
    lon: 5.4202,
    lengthM: 700,
    elevationFt: 180,
    runway: '05/23',
    note: 'Grass (north) / gravel (south) surface \u2014 per Os Aero Klubb\u2019s own site (osaero.webnode.page): runway 05/23, 700m total. Elevation per Wikipedia (Os flyplass, Vaksinen) is 54.9m/180ft, used here; the club\u2019s own site instead states 200ft \u2014 flagging that discrepancy rather than picking silently. Approved for glider operations only, with motor activity limited to the club\u2019s tow aircraft. Restricted \u2014 gliders and PPL only per source, not open GA use'
  },
  {
    id: 'no-stord-sorstokken',
    name: 'Stord, S\u00f8rstokken',
    icao: 'ENSO',
    country: 'NO',
    region: 'Vestland',
    surface: 'grass',
    lat: 59.7931,
    lon: 5.339,
    lengthM: 1460,
    elevationFt: 153,
    runway: '14/32',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Stord Airport, S\u00f8rstokken per Wikipedia; municipally owned (not part of the Avinor network), used for offshore-helicopter and GA traffic'
  },
  {
    id: 'no-sylvknapp-valle',
    name: 'Sylvknapp, Valle',
    icao: 'ENVE',
    country: 'NO',
    region: 'Agder',
    surface: 'grass',
    lat: 59.0311,
    lon: 7.5549,
    lengthM: 800,
    elevationFt: 770,
    runway: '01/19',
    note: 'Surface is actually paved (asphalt), not grass — Valle flyplass, Åraksøyne per Wikipedia'
  },
  {
    id: 'no-arendal-gullknapp',
    name: 'Arendal, Gullknapp',
    icao: 'ENGK',
    country: 'NO',
    region: 'Agder',
    surface: 'grass',
    lat: 58.5169,
    lon: 8.7046,
    lengthM: 1199,
    elevationFt: 390,
    runway: '05/23',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Arendal Airport, Gullknapp per Wikipedia. Source flags this field as closed (\u201cStengt\u201d) as of its last update \u2014 confirm current status before planning to use it'
  },
  {
    id: 'no-lunde-nome',
    name: 'Lunde, Nome',
    icao: 'ENLU',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.2981,
    lon: 9.1317,
    lengthM: 700,
    note: 'Grass surface confirmed — 700m strip (usable landing/takeoff distance ~950m including safety areas) per Nome Flyklubb (nomeflyklubb.no), home base of that club'
  },
  {
    id: 'no-skien-geitryggen',
    name: 'Skien, Geitryggen',
    icao: 'ENSN',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.1836,
    lon: 9.5667,
    lengthM: 1416,
    elevationFt: 463,
    runway: '01/19',
    note: 'Surface is actually paved (asphalt), not grass — Skien Airport, Geiteryggen per Wikipedia; a private field operated by Grenland Luftsportssenter, not part of the Avinor network'
  },
  {
    id: 'no-notodden-tuven',
    name: 'Notodden, Tuven',
    icao: 'ENNO',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.5666,
    lon: 9.2092,
    lengthM: 1393,
    elevationFt: 62,
    runway: '12/30',
    note: 'Surface is actually paved (asphalt), not grass — Notodden Airport, Tuven per Wikipedia; owned by Notodden municipality, operated by Notodden Lufthavn AS, not part of the Avinor network'
  },
  {
    id: 'no-oppdal-fagerhaug',
    name: 'Oppdal, Fagerhaug',
    icao: 'ENOP',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'grass',
    lat: 62.6513,
    lon: 9.8516,
    lengthM: 936,
    note: 'Surface is actually paved (asphalt), not grass \u2014 Oppdal Airport, Fagerhaug per Wikipedia; length corrected to 936m (was 1000m) per the article\u2019s infobox/facilities section'
  },
  {
    id: 'se-torsby',
    name: 'Torsby',
    icao: 'ESST',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.1591,
    lon: 12.9895,
    lengthM: 1591,
    elevationFt: 394,
    runway: '16/34',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Torsby flygplats per Wikipedia; a substantial regional airport, not a small strip \u2014 runway rebuilt 2004-2005'
  },
  {
    id: 'no-fyresdal',
    name: 'Fyresdal',
    icao: 'ENFY',
    country: 'NO',
    region: 'Telemark',
    surface: 'grass',
    lat: 59.2021,
    lon: 8.0878,
    lengthM: 800,
    note: 'Surface is actually paved (asphalt), not grass — Vest-Telemark Airport, Fyresdal per Wikipedia; declared runway length 800m, though physical length is 1,400m; private airfield operated by the local aeroclub and Fyresdal kommune since 2009, no scheduled service currently. Elevation and runway heading not confirmed'
  },
  {
    id: 'no-gaundalen',
    name: 'Gaundalen',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'gravel',
    lat: 64.0123,
    lon: 12.6807,
    lengthM: 600,
    note: 'Surface corrected to gravel, not grass \u2014 built and operated privately at Gaundalen mountain farm in Sn\u00e5sa municipality'
  },
  {
    id: 'no-grong-bjorgan',
    name: 'Grong, Bj\u00f8rgan',
    country: 'NO',
    region: 'Tr\u00f8ndelag',
    surface: 'gravel',
    lat: 64.3956,
    lon: 12.3402,
    lengthM: 550,
    runway: '16/34',
    note: 'Surface corrected to gravel, not grass \u2014 per Wikipedia/Wikidata (Bj\u00f8rgan flyplass, near Formofoss); length corrected to 550m (was 680m) per Wikidata Q11961287'
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
    icao: 'ESKU',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 59.8543,
    lon: 13.1028,
    lengthM: 770,
    elevationFt: 380,
    runway: '01/19',
    note: 'Grass surface confirmed \u2014 Sunne-Holmby flygplats per Wikipedia: runway 01/19, 770\u00d7100m, elevation 116m/380ft; home of Sunne Flygklubb'
  },
  {
    id: 'se-hedlanda',
    name: 'Hedlanda',
    icao: 'ESNC',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 62.4103,
    lon: 13.7448,
    lengthM: 1175,
    elevationFt: 1460,
    runway: '06/24',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Hedlanda flygplats per Wikipedia: runway 06/24, elevation 445m/1460ft. Opened 1970 by Hede municipality, runway extended from 1,000m to current 1,175m in 2007; operated by Hedlanda flygf\u00f6rening; no rescue services on site, so limited to aircraft with max 19 passengers'
  },
  {
    id: 'se-hagfors',
    name: 'Hagfors',
    icao: 'ESOH',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.0199,
    lon: 13.5789,
    lengthM: 1510,
    elevationFt: 474,
    runway: '18/36',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Hagfors flygplats per Wikipedia; a regional airport, not a small strip'
  },
  {
    id: 'se-sveg',
    name: 'Sveg',
    icao: 'ESND',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 62.0478,
    lon: 14.4186,
    lengthM: 1700,
    elevationFt: 1178,
    runway: '09/27',
    note: 'Surface is actually paved (asphalt), not grass \u2014 H\u00e4rjedalen Sveg Airport per Wikipedia; a regional airport, not a small strip'
  },
  {
    id: 'se-mora',
    name: 'Mora',
    icao: 'ESKM',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 60.9583,
    lon: 14.5106,
    lengthM: 1810,
    elevationFt: 634,
    runway: '16/34',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Mora-Siljan flygplats per Wikipedia; a substantial category-4C regional airport, not a small strip; length/elevation corrected to 1810m/634ft (was 1814m/635ft) to match the infobox exactly'
  },
  {
    id: 'se-orsa',
    name: 'Orsa',
    icao: 'ESNR',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 61.19,
    lon: 14.7122,
    lengthM: 900,
    elevationFt: 682,
    runway: '15/33',
    note: 'Grass surface confirmed \u2014 Orsa-Tallheds flygf\u00e4lt per Wikipedia: grass runway 15/33 (900\u00d740m) used by aircraft, plus a separate paved 03/21 runway (1,000\u00d730m) used mainly for motorsports; elevation 208m/682ft. Built by the Swedish Air Force 1940\u20131943'
  },
  {
    id: 'se-optand',
    name: 'Optand',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.1296,
    lon: 14.802,
    lengthM: 1000,
    elevationFt: 1236,
    runway: '18/36',
    note: 'Surface: the primary runway (18/36, 1,000\u00d718m) is actually paved asphalt, per Wikipedia (\u00d6stersund-Optand flygf\u00e4lt); two additional grass strips also present (15/33, 750\u00d740m, and a second 18/36, 800\u00d725m). Elevation 376m/1236ft. Former WWII-era military "F\u00e4lt 26" (used 1939\u20132004), now owned by \u00d6stersunds flygklubb and used by GA, gliding, skydiving and model-aircraft clubs plus aviation museums'
  },
  {
    id: 'se-hemavan',
    name: 'Hemavan',
    icao: 'ESUT',
    country: 'SE',
    region: 'V\u00e4sterbotten',
    surface: 'grass',
    lat: 65.8075,
    lon: 15.0811,
    lengthM: 1444,
    elevationFt: 1509,
    runway: '15/33',
    note: 'Surface is actually paved (asphalt), not grass \u2014 Hemavan T\u00e4rnaby flygplats per Wikipedia; a regional airport with scheduled service, not a small strip'
  },
  {
    id: 'se-hallviken',
    name: 'Hallviken',
    icao: 'ESNA',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.738,
    lon: 15.4594,
    lengthM: 1000,
    elevationFt: 1119,
    runway: '14/32',
    note: 'Surface: the primary runway (14/32, 1,000\u00d730m) is actually paved asphalt, per Wikipedia (Hallvikens flygf\u00e4lt); two more runways also present \u2014 02/20 (800\u00d730m, asphalt) and 08/26 (800\u00d730m, gravel). Elevation 341m/1119ft. Former WWII-era military airfield (Field 27, built 1940\u201343), opened to civil traffic in 1955'
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
    icao: 'ESGS',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 59.0168,
    lon: 11.34,
    lengthM: 900,
    elevationFt: 115,
    runway: '03/21',
    note: 'Grass surface confirmed (soft but usable) \u2014 per metar-taf.com/airfield sources; PPR required, obtainable by phone'
  },
  {
    id: 'se-fjallbacka-anras',
    name: 'Fj\u00e4llbacka, Anr\u00e5s',
    icao: 'ESTF',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.6302,
    lon: 11.3149,
    lengthM: 740,
    elevationFt: 6,
    runway: '06/24',
    note: 'Grass surface confirmed \u2014 Fj\u00e4llbacka flygf\u00e4lt per Wikipedia: runway 06/24, 740m, elevation 6ft. Opened 1987 on land at Lilla Anr\u00e5s leased by Roland Broberg, purchased by Tanums kommun in 1995; approx. 300 landings/year'
  },
  {
    id: 'se-uddevalla-rorkarr',
    name: 'Uddevalla, R\u00f6rk\u00e4rr',
    icao: 'ESGU',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.367,
    lon: 11.7746,
    lengthM: 655,
    elevationFt: 120,
    runway: '03/21',
    note: 'Grass surface confirmed \u2014 R\u00f6rk\u00e4rr flygf\u00e4lt per Wikipedia: runway 03/21, 655m, elevation 36m/120ft. Owned/operated by Uddevalla Flygklubb; B\u00e5ngens golf course surrounds the field, golfers cross the runway at three points during a round'
  },
  {
    id: 'se-uddevalla-backamo',
    name: 'Uddevalla, Backamo',
    icao: 'ESGA',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.1771,
    lon: 11.9736,
    lengthM: 760,
    elevationFt: 424,
    runway: '06/24',
    note: 'Grass surface confirmed \u2014 Backamo flygf\u00e4lt per Wikipedia: runway nominally 060\u00b0/240\u00b0 (06/24), 760\u00d730m, elevation 129m/424ft. Built 1937\u201338 as one of a chain of emergency landing fields decided by parliament in 1932; used today by Backamo Flygklubb and others'
  },
  {
    id: 'se-bondestroms-gard',
    name: 'Bondestr\u00f6ms G\u00e5rd',
    country: 'SE',
    region: 'V\u00e4stra G\u00f6taland',
    surface: 'grass',
    lat: 58.1491,
    lon: 12.1263,
    note: 'Grass surface confirmed ("F\u00e4ltyta: Gr\u00e4s") per the field\u2019s own listing on flygkartan.se; private field, strict PPR, under Gothenburg TMA. Operational status uncertain \u2014 a 2017 visitor review on the same site described it as closed, though an earlier one described it as active; confirm current status before planning to use it. Length/elevation/runway not confirmed'
  },
  {
    id: 'se-eksharad',
    name: 'Eksh\u00e4rad flygf\u00e4lt',
    icao: 'ESKH',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.154,
    lon: 13.5298,
    elevationFt: 460,
    note: 'Elevation per world-airport-codes.com/SkyVector (surface there is only described as "soft", consistent with grass but not independently detailed). Length and runway heading not confirmed'
  },
  {
    id: 'se-backa',
    name: 'Backa',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.5308,
    lon: 13.1218,
    note: 'Likely a duplicate of the "Finnskoga, Backa" entry elsewhere in this list (se-finnskoga-backa) \u2014 coordinates are ~2km apart and both appear to reference the same Backa/Finnskoga grass airfield near Klar\u00e4lven in Torsby kommun. Flagging for review rather than merging entries; no other data added here'
  },
  {
    id: 'se-malung-skinnlanda',
    name: 'Malung, Skinnlanda',
    icao: 'ESVM',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 60.6591,
    lon: 13.7266,
    lengthM: 800,
    elevationFt: 975,
    runway: '16/34',
    note: 'Surface is actually paved (asphalt), not grass \u2014 per the field\u2019s own site (malungsflygklubb.se/skinnlanda): 800\u00d724m, elevation 975ft, right-hand traffic on runway 16 (implying 16/34). 3km south of Malung center'
  },
  {
    id: 'se-siljansnas',
    name: 'Siljansn\u00e4s Airpark',
    icao: 'ESVS',
    country: 'SE',
    region: 'Dalarna',
    surface: 'grass',
    lat: 60.7851,
    lon: 14.8269,
    lengthM: 850,
    runway: '14/32',
    note: 'Grass surface confirmed \u2014 per Wikipedia (Siljan Airpark): two parallel 850m runways, one asphalt (14R/32L) and one grass (14L/32R); the grass one matches this entry\u2019s default surface. Private residential airpark inaugurated 2009, home of Siljansn\u00e4s Flygklubb (founded 1959). Elevation not confirmed'
  },
  {
    id: 'se-finnskoga-backa',
    name: 'Finnskoga, Backa',
    country: 'SE',
    region: 'V\u00e4rmland',
    surface: 'grass',
    lat: 60.5534,
    lon: 13.1024,
    lengthM: 650,
    note: 'Grass surface confirmed \u2014 grass field approx. 650\u00d730m near Klar\u00e4lven, just north of a power line, per flygkartan.se; established early 1970s by Lennart Berglund and others in Liken\u00e4s, just south of Bran\u00e4s. Possibly the same field as the separate "Backa" entry elsewhere in this list (se-backa) \u2014 flagging as a likely duplicate rather than merging. Elevation/runway not confirmed'
  },
  {
    id: 'se-alvdalen',
    name: '\u00c4lvdalen',
    country: 'SE',
    region: 'Dalarna',
    surface: 'gravel',
    lat: 61.2141,
    lon: 14.0445,
    lengthM: 670,
    elevationFt: 750,
    note: 'Surface corrected to gravel ("oljegrus", oiled gravel, with grass shoulders), not pure grass \u2014 per \u00c4lvdalens Flygklubb\u2019s own site (alvdalsflyg.se): runway 670m long, 7m wide (11m grass shoulders each side), elevation 750ft. Runway heading not stated by that source'
  },
  {
    id: 'se-funasdalen',
    name: 'Fun\u00e4sdalen Heliport',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 62.5222,
    lon: 12.5954,
    note: 'Confirmed helicopter-only facility \u2014 "H\u00e4rjedalens helikopterstation/heliport" near Ljusnedal, in Fun\u00e4sdalen\u2019s eastern industrial area, historically a secondary base for J\u00e4mtlands Flyg (ceased operations 2019). No fixed-wing runway, so not usable by fixed-wing LSA aircraft \u2014 surface/length/elevation intentionally left as-is/blank since there is no runway to describe'
  },
  {
    id: 'se-oviken-graftavallen',
    name: 'Oviken, Gr\u00e4ft\u00e5vallen',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'gravel',
    lat: 63.0382,
    lon: 14.0014,
    lengthM: 900,
    note: 'Surface corrected to gravel ("mycket fint grusstr\u00e5k", a very fine gravel strip), not grass \u2014 per flygkartan.se; approx. 900m long. Caution advised for wind from south-southwest to north-northwest (turbulence behind the mountain). Width/orientation/elevation not confirmed'
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
    id: 'se-goviken',
    name: 'G\u00f6viken Heli Port & Sj\u00f6flygplats',
    country: 'SE',
    region: 'J\u00e4mtland',
    surface: 'grass',
    lat: 63.1922,
    lon: 14.6308,
    note: 'Confirmed helicopter-only facility per Wikipedia (G\u00f6viken Heliport) \u2014 home base of J\u00e4mtlands Flyg AB, single helipad (asphalt, ~30m), elevation 473m/1552ft, no IATA/ICAO code. No fixed-wing runway despite the "Sj\u00f6flygplats" (seaplane base) part of this entry\u2019s name \u2014 not usable by fixed-wing LSA aircraft; surface/length/elevation intentionally left as-is/blank since there is no runway to describe'
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
    surface: 'gravel',
    lat: 69.0404,
    lon: 23.0345,
    lengthM: 1200,
    runway: '01/19',
    note: 'Surface corrected to gravel, not grass — per Wikipedia'
  },
  {
    id: 'no-kjollefjord',
    name: 'Kj\u00f8llefjord flystripe',
    country: 'NO',
    region: 'Finnmark',
    surface: 'gravel',
    lat: 70.9403,
    lon: 27.3474,
    lengthM: 630,
    note: 'Surface corrected to gravel (630x40m per Wikipedia). Wikipedia describes this as a disused general-aviation airfield abandoned in the 1980s \u2014 confirm current status/usability before planning to use it'
  },
  {
    id: 'no-eidsberg',
    name: 'Eidsberg',
    country: 'NO',
    region: '\u00d8stfold',
    surface: 'grass',
    lat: 59.5337,
    lon: 11.2428,
    lengthM: 312,
    elevationFt: 300,
    runway: '18/36',
    note: 'Grass surface confirmed \u2014 per Wikipedia (Eidsberg flyplass): two grass runways, 18/36 (312\u00d715m) and 11/29 (280\u00d715m); elevation 91.4m/300ft; established 1997'
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
    lengthM: 210,
    elevationFt: 138,
    note: 'Elevation per OurAirports (Rompene Airfield, NO-0042): field elevation 42m/138ft. Home of Gulen Luftsportklubb, which holds an annual "Multifly" fly-in here. The pre-existing 210m length figure was not independently reconfirmed by this pass — runway heading not confirmed'
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
    lengthM: 500,
    runway: '04/22',
    frequencies: [
      {
        type: 'Local',
        mhz: 123.065,
        note: 'The field\u2019s own site (skognflyplass.no) publishes 123.5 MHz as the local frequency \u2014 that frequency is obsolete nationally, superseded by 123.065 (see this app\u2019s reference frequency list), so listed here as 123.065 instead'
      }
    ],
    note: 'Grass surface confirmed \u2014 per the field\u2019s own site (skognflyplass.no): approx. 500\u00d720m, runway 04/22; operates under V\u00e6rnes TMA, contact V\u00e6rnes Approach on 118.6 MHz before/after flight. Only by prior arrangement per source \u2014 not open-access'
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
