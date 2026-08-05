// Proxies the Overpass API — same reason as the other two functions in
// this folder: a direct browser fetch to overpass-api.de fails with no
// CORS headers set, while a same-origin call to this function (and its
// own server-side fetch onward) isn't subject to that restriction at all.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const query = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? '')

  try {
    // Overpass's interpreter endpoint expects the query as a form-encoded
    // "data" field, not a raw text/plain body — sending it as plain text
    // got a 406 (and, separately, its public instance rate-limits fairly
    // aggressively per IP, which shows up as a "rate_limited" error in the
    // response body rather than an HTTP error code).
    const upstream = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(20000)
    })
    const body = await upstream.text()
    res.status(upstream.status)
    res.setHeader('content-type', 'application/json')
    res.send(body)
  } catch {
    res.status(502).json({ error: 'Could not reach Overpass' })
  }
}
