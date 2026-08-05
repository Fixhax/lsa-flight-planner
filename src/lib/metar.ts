export interface MetarTafResult {
  icao: string
  metar: string | null
  taf: string | null
}

async function fetchRaw(kind: 'metar' | 'taf', icao: string): Promise<string | null> {
  const res = await fetch(
    `https://aviationweather.gov/api/data/${kind}?ids=${encodeURIComponent(icao)}&format=raw`,
    { signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) throw new Error(`Aviation Weather Center returned ${res.status}`)
  const text = (await res.text()).trim()
  if (!text) return null
  return text
}

// Official raw METAR/TAF text from the (US) Aviation Weather Center's free
// public API — genuinely different from the Weather report panel's
// Open-Meteo forecast (a numerical model): this is the actual published
// aviation report, but only exists for airports with an ICAO identifier
// that issues one. Most of this app's curated grass/gravel strips are
// uncontrolled and don't have one. Returned as raw, undecoded text on
// purpose — summarizing/decoding it here risks introducing a misreading
// that wouldn't exist if you read the real thing.
export async function fetchMetarTaf(icao: string): Promise<MetarTafResult> {
  const [metar, taf] = await Promise.all([
    fetchRaw('metar', icao).catch(() => null),
    fetchRaw('taf', icao).catch(() => null)
  ])
  return { icao, metar, taf }
}
