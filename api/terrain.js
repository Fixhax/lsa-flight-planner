// Proxies Open Topo Data — it doesn't set CORS headers either, so this
// exists for the same reason as api/aviation-weather.js: a same-origin
// call to this function has no CORS restriction, and its own server-side
// fetch to Open Topo Data is unaffected by browser CORS entirely.
export default async function handler(req, res) {
  const { locations } = req.query
  if (!locations) {
    res.status(400).json({ error: 'locations required' })
    return
  }

  try {
    const upstream = await fetch(
      `https://api.opentopodata.org/v1/eudem25m?locations=${encodeURIComponent(locations)}`,
      { signal: AbortSignal.timeout(8000) }
    )
    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', 'application/json')
    // Ground elevation for a given point never changes — safe to cache
    // aggressively.
    res.setHeader('cache-control', 'public, max-age=86400')
    res.send(body)
  } catch {
    res.status(502).json({ error: 'Could not reach Open Topo Data' })
  }
}
