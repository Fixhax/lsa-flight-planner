// Proxies Aviation Weather Center's public API — it doesn't set CORS
// headers, so a direct browser fetch from the app's origin fails outright
// ("Failed to fetch" / Safari's "Load failed"). Same-origin calls to this
// serverless function have no such restriction, and the fetch it makes to
// AWC happens server-side where CORS doesn't apply at all.
export default async function handler(req, res) {
  const { kind, ...rest } = req.query

  if (kind !== 'metar' && kind !== 'taf') {
    res.status(400).json({ error: 'kind must be "metar" or "taf"' })
    return
  }

  const params = new URLSearchParams(rest)
  const url = `https://aviationweather.gov/api/data/${kind}?${params.toString()}`

  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(10000) })
    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', upstream.headers.get('content-type') || 'text/plain')
    // METAR/TAF change on the order of minutes to hours — a short cache
    // avoids hammering AWC on repeated taps without going stale in any
    // way that matters for flight planning.
    res.setHeader('cache-control', 'public, max-age=120')
    res.send(body)
  } catch {
    res.status(502).json({ error: 'Could not reach Aviation Weather Center' })
  }
}
