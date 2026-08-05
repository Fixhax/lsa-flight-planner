// Deterministic, offline METAR/TAF decoder — no external "translate" call,
// on purpose: a plain-text decoder can only say what a group actually
// means or say nothing, while an LLM-style rewrite could quietly get a
// weather group wrong in a way that looks fluent. Anything not recognized
// here is listed honestly as unparsed rather than guessed at, matching
// how the rest of this app treats unconfirmed data. This is a learning
// aid for reading the real report faster, not a replacement for it — the
// raw text stays the primary display everywhere this is used.

export interface DecodedSection {
  header: string | null // null for the current/main conditions; set for TAF change periods
  lines: string[]
  unparsed: string[]
}

const WX_INTENSITY_PREFIX: [string, string][] = [
  ['+', 'Heavy '],
  ['-', 'Light ']
]

const WX_DESC: Record<string, string> = {
  MI: 'shallow',
  PR: 'partial',
  BC: 'patches of',
  DR: 'low drifting',
  BL: 'blowing',
  SH: 'showers of',
  TS: 'thunderstorm with',
  FZ: 'freezing'
}

const WX_PHENOM: Record<string, string> = {
  DZ: 'drizzle',
  RA: 'rain',
  SN: 'snow',
  SG: 'snow grains',
  IC: 'ice crystals',
  PL: 'ice pellets',
  GR: 'hail',
  GS: 'small hail/snow pellets',
  UP: 'unknown precipitation',
  BR: 'mist',
  FG: 'fog',
  FU: 'smoke',
  VA: 'volcanic ash',
  DU: 'widespread dust',
  SA: 'sand',
  HZ: 'haze',
  PY: 'spray',
  PO: 'dust/sand whirls',
  SQ: 'squall',
  FC: 'funnel cloud (or tornado/waterspout)',
  SS: 'sandstorm',
  DS: 'duststorm'
}

const CLOUD_COVER: Record<string, string> = {
  FEW: 'Few',
  SCT: 'Scattered',
  BKN: 'Broken',
  OVC: 'Overcast'
}

function decodeWind(token: string): string | null {
  const m = token.match(/^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS)$/)
  if (!m) return null
  const [, dir, speed, gust, unit] = m
  const unitLabel = unit === 'KT' ? 'kt' : 'm/s'
  if (dir !== 'VRB' && parseInt(dir, 10) === 0 && parseInt(speed, 10) === 0) return 'Wind calm'
  const dirText = dir === 'VRB' ? 'Variable direction' : `Wind ${dir}°`
  let s = dir === 'VRB' ? `${dirText}, ${parseInt(speed, 10)} ${unitLabel}` : `${dirText} at ${parseInt(speed, 10)} ${unitLabel}`
  if (gust) s += `, gusting ${parseInt(gust, 10)} ${unitLabel}`
  return s
}

function decodeVariableWindDir(token: string): string | null {
  const m = token.match(/^(\d{3})V(\d{3})$/)
  if (!m) return null
  return `Direction varying between ${m[1]}° and ${m[2]}°`
}

function decodeVisibility(token: string): string | null {
  if (token === 'CAVOK') return null // handled as its own flag, not here
  if (/^\d{4}$/.test(token)) {
    const v = parseInt(token, 10)
    return v >= 9999 ? 'Visibility 10 km or more' : `Visibility ${v} m`
  }
  const sm = token.match(/^(\d+)SM$/)
  if (sm) return `Visibility ${parseInt(sm[1], 10)} statute miles`
  const smFrac = token.match(/^(\d+)\/(\d+)SM$/)
  if (smFrac) return `Visibility ${smFrac[1]}/${smFrac[2]} statute miles`
  return null
}

function decodeCloud(token: string): string | null {
  if (token === 'SKC' || token === 'CLR') return 'Sky clear'
  if (token === 'NSC') return 'No significant cloud'
  if (token === 'NCD') return 'No cloud detected'
  const vv = token.match(/^VV(\d{3}|\/\/\/)$/)
  if (vv) {
    return vv[1] === '///'
      ? 'Vertical visibility not measured (indefinite ceiling)'
      : `Indefinite ceiling, vertical visibility ${parseInt(vv[1], 10) * 100} ft`
  }
  const m = token.match(/^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/)
  if (!m) return null
  const [, cover, hgt, type] = m
  let s = `${CLOUD_COVER[cover]} cloud at ${parseInt(hgt, 10) * 100} ft`
  if (type === 'CB') s += ' (cumulonimbus)'
  if (type === 'TCU') s += ' (towering cumulus)'
  return s
}

function decodeTempDewpoint(token: string): string | null {
  const m = token.match(/^(M?\d{2})\/(M?\d{2})$/)
  if (!m) return null
  const parse = (v: string) => (v.startsWith('M') ? -parseInt(v.slice(1), 10) : parseInt(v, 10))
  return `Temperature ${parse(m[1])}°C, dew point ${parse(m[2])}°C`
}

function decodeAltimeter(token: string): string | null {
  const q = token.match(/^Q(\d{4})$/)
  if (q) return `Altimeter (QNH) ${parseInt(q[1], 10)} hPa`
  const a = token.match(/^A(\d{4})$/)
  if (a) return `Altimeter ${(parseInt(a[1], 10) / 100).toFixed(2)} inHg`
  return null
}

function decodeObsTime(token: string): string | null {
  const m = token.match(/^(\d{2})(\d{2})(\d{2})Z$/)
  if (!m) return null
  return `Observed on day ${parseInt(m[1], 10)} of the month at ${m[2]}:${m[3]} UTC`
}

function decodeWeather(token: string): string | null {
  let t = token
  let intensity = ''
  for (const [prefix, label] of WX_INTENSITY_PREFIX) {
    if (t.startsWith(prefix)) {
      intensity = label
      t = t.slice(prefix.length)
      break
    }
  }
  if (!intensity && t.startsWith('VC')) {
    intensity = 'In the vicinity: '
    t = t.slice(2)
  }
  if (t.length === 0 || t.length % 2 !== 0) return null
  const groups = t.match(/.{2}/g)
  if (!groups) return null
  const parts: string[] = []
  for (const g of groups) {
    if (WX_DESC[g]) parts.push(WX_DESC[g])
    else if (WX_PHENOM[g]) parts.push(WX_PHENOM[g])
    else return null
  }
  if (parts.length === 0) return null
  const joined = (intensity + parts.join(' ')).trim()
  return joined.charAt(0).toUpperCase() + joined.slice(1)
}

function decodeToken(token: string): string | null {
  if (token === 'CAVOK') {
    return 'Ceiling and visibility OK (10 km+ visibility, no cloud below 5000 ft, no significant weather)'
  }
  if (token === 'AUTO') return 'Automated observation (no human observer)'
  if (token === 'COR') return 'Corrected report'
  if (token === 'AMD') return 'Amended forecast'
  if (token === 'NOSIG') return 'No significant change expected'
  if (token === 'NSW') return 'No significant weather (end of previously forecast weather)'
  return (
    decodeWind(token) ??
    decodeVariableWindDir(token) ??
    decodeVisibility(token) ??
    decodeCloud(token) ??
    decodeTempDewpoint(token) ??
    decodeAltimeter(token) ??
    decodeObsTime(token) ??
    decodeWeather(token)
  )
}

function decodeTokenSequence(tokens: string[]): { lines: string[]; unparsed: string[] } {
  const lines: string[] = []
  const unparsed: string[] = []
  for (const token of tokens) {
    const decoded = decodeToken(token)
    if (decoded) lines.push(decoded)
    else unparsed.push(token)
  }
  return { lines, unparsed }
}

function stripLeading(tokens: string[]): string[] {
  const t = [...tokens]
  if (t[0] === 'METAR' || t[0] === 'SPECI' || t[0] === 'TAF') t.shift()
  if (t[0] === 'AMD' || t[0] === 'COR') t.shift()
  if (/^[A-Z]{4}$/.test(t[0])) t.shift() // ICAO identifier — already shown as the card header
  return t
}

// Cuts off remarks (RMK ...) rather than attempting to decode them — US-
// style remarks groups (AO2, SLP132, T01560144, PK WND, etc.) are numerous
// and low-value for a first read; shown honestly as unparsed instead of
// guessed at.
function splitRemarks(tokens: string[]): { main: string[]; remarks: string[] } {
  const idx = tokens.indexOf('RMK')
  if (idx === -1) return { main: tokens, remarks: [] }
  return { main: tokens.slice(0, idx), remarks: tokens.slice(idx) }
}

export function decodeMetar(raw: string): DecodedSection[] {
  const tokens = stripLeading(raw.trim().split(/\s+/))
  const { main, remarks } = splitRemarks(tokens)
  const { lines, unparsed } = decodeTokenSequence(main)
  if (remarks.length > 0) unparsed.push(remarks.join(' '))
  return [{ header: null, lines, unparsed }]
}

function decodePeriodRange(token: string): string | null {
  const m = token.match(/^(\d{2})(\d{2})\/(\d{2})(\d{2})$/)
  if (!m) return null
  const [, d1, h1, d2, h2] = m
  return `day ${parseInt(d1, 10)} ${h1}:00 – day ${parseInt(d2, 10)} ${h2}:00 UTC`
}

export function decodeTaf(raw: string): DecodedSection[] {
  const allTokens = stripLeading(raw.trim().split(/\s+/))
  const { main, remarks } = splitRemarks(allTokens)

  const sections: DecodedSection[] = []
  let current: DecodedSection = { header: null, lines: [], unparsed: [] }

  function flush() {
    if (current.lines.length > 0 || current.unparsed.length > 0 || sections.length === 0) {
      sections.push(current)
    }
  }

  let i = 0
  // Issue time, then overall valid period open the first (unheadered)
  // section as informational lines rather than as their own period.
  if (main[i] && /^\d{6}Z$/.test(main[i])) {
    const decoded = decodeObsTime(main[i])
    if (decoded) current.lines.push(`Issued ${decoded.replace('Observed ', '')}`)
    i++
  }
  if (main[i] && /^\d{4}\/\d{4}$/.test(main[i])) {
    const range = decodePeriodRange(main[i])
    if (range) current.lines.push(`Valid ${range}`)
    i++
  }

  for (; i < main.length; i++) {
    const token = main[i]

    const prob = token.match(/^PROB(\d{2})$/)
    const fm = token.match(/^FM(\d{2})(\d{2})(\d{2})$/)

    if (token === 'BECMG' || token === 'TEMPO') {
      flush()
      const rangeToken = main[i + 1]
      const range = rangeToken ? decodePeriodRange(rangeToken) : null
      if (range) i++
      const label = token === 'BECMG' ? 'Becoming' : 'Temporarily'
      current = { header: range ? `${label}, ${range}` : label, lines: [], unparsed: [] }
      continue
    }

    if (prob) {
      flush()
      let label = `${parseInt(prob[1], 10)}% probability`
      const next = main[i + 1]
      if (next === 'TEMPO' || next === 'BECMG') {
        label += next === 'TEMPO' ? ', temporarily' : ', becoming'
        i++
      }
      const rangeToken = main[i + 1]
      const range = rangeToken ? decodePeriodRange(rangeToken) : null
      if (range) i++
      current = { header: range ? `${label}, ${range}` : label, lines: [], unparsed: [] }
      continue
    }

    if (fm) {
      flush()
      current = {
        header: `From day ${parseInt(fm[1], 10)} at ${fm[2]}:${fm[3]} UTC`,
        lines: [],
        unparsed: []
      }
      continue
    }

    const decoded = decodeToken(token)
    if (decoded) current.lines.push(decoded)
    else current.unparsed.push(token)
  }
  flush()

  if (remarks.length > 0) {
    sections[sections.length - 1].unparsed.push(remarks.join(' '))
  }

  return sections
}
