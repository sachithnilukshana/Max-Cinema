function parseEmbedBase(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export default function handler(req, res) {
  const embedBase = parseEmbedBase(process.env.EMBED_BASE) || new URL('https://embedmaster.link')
  const embedApiKey = (process.env.EMBED_API_KEY || '').trim()

  let parts = []
  if (req.query && Array.isArray(req.query.path)) {
    parts = req.query.path
  } else if (req.query && typeof req.query.path === 'string') {
    parts = req.query.path.split('/').filter(Boolean)
  } else {
    const pathname = new URL(req.url, 'http://localhost').pathname
    parts = pathname.split('/').filter(Boolean).slice(2)
  }

  const isMovie = parts.length === 2 && parts[0] === 'movie' && /^\d+$/.test(parts[1])
  const isTv = parts.length === 4 && parts[0] === 'tv' && parts.slice(1).every(v => /^\d+$/.test(v))

  if (!isMovie && !isTv) {
    if (res && typeof res.status === 'function') {
      return res.status(400).send('Invalid playback request.')
    }
    return new Response('Invalid playback request.', { status: 400 })
  }

  const target = new URL(`/${parts.join('/')}`, embedBase)
  if (embedApiKey) {
    target.searchParams.set('apikey', embedApiKey)
  }

  if (res && typeof res.redirect === 'function') {
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.redirect(302, target.toString())
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

