function parseEmbedBase(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

export default function play(request) {
  const embedBase = parseEmbedBase(process.env.EMBED_BASE)
  const embedApiKey = process.env.EMBED_API_KEY
  if (!embedBase || !embedApiKey) {
    return new Response('Playback is not configured. Add a licensed provider to the Netlify function environment.', { status: 503 })
  }

  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  const validMovie = parts.length === 4 && parts[2] === 'movie' && /^\d+$/.test(parts[3])
  const validTv = parts.length === 6 && parts[2] === 'tv' && parts.slice(3).every(value => /^\d+$/.test(value))
  if (!validMovie && !validTv) return new Response('Invalid playback request.', { status: 400 })

  const target = new URL(`/embed/${parts.slice(2).join('/')}`, embedBase)
  target.searchParams.set('apikey', embedApiKey)
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export const config = {
  path: '/api/play/*',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: 'ip',
    windowSize: 60,
    windowLimit: 45,
  },
}
