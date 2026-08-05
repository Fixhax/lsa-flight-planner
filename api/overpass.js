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
    const upstream = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
      headers: { 'content-type': 'text/plain' },
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
