const ALLOWED_PATHS = [
  /^\/trending\/(movie|tv)\/week$/,
  /^\/search\/(movie|tv)$/,
  /^\/discover\/(movie|tv)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/(movie|tv)\/\d+\/(videos|watch\/providers|credits|recommendations)$/,
  /^\/(movie|tv)\/(top_rated|popular|upcoming|now_playing)$/,
  /^\/person\/\d+$/,
  /^\/person\/\d+\/combined_credits$/,
]

const ALLOWED_PARAMS = new Set([
  'query', 'sort_by', 'with_original_language', 'with_genres',
  'page', 'vote_average.gte', 'vote_count.gte',
  'primary_release_year', 'first_air_date_year',
  'without_genres', 'with_keywords', 'with_networks',
  'language', 'region',
])

function readSecret(name) {
  let value = (process.env[name] || '').trim()
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim()
  return value.replace(/^("|')|("|')$/g, '')
}

function validTmdbPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return false
  const parsed = new URL(value, 'https://api.themoviedb.org')
  return parsed.origin === 'https://api.themoviedb.org'
    && ALLOWED_PATHS.some(pattern => pattern.test(parsed.pathname))
    && [...parsed.searchParams.keys()].every(key => ALLOWED_PARAMS.has(key))
}

export default async function handler(req, res) {
  let requestedPath = ''
  if (req.query && req.query.path) {
    requestedPath = req.query.path
  } else if (req.url) {
    const url = new URL(req.url, 'http://localhost')
    requestedPath = url.searchParams.get('path') || ''
  }

  const apiKey = readSecret('TMDB_API_KEY')
  const token = readSecret('TMDB_READ_ACCESS_TOKEN')

  if (!apiKey && !token) {
    if (res && typeof res.status === 'function') {
      return res.status(503).send('TMDB server credentials are not configured.')
    }
    return new Response('TMDB server credentials are not configured.', { status: 503 })
  }

  if (!validTmdbPath(requestedPath)) {
    if (res && typeof res.status === 'function') {
      return res.status(400).send('Invalid TMDB request.')
    }
    return new Response('Invalid TMDB request.', { status: 400 })
  }

  const target = new URL(`https://api.themoviedb.org/3${requestedPath}`)
  if (apiKey) target.searchParams.set('api_key', apiKey)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const upstream = await fetch(target, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
    const body = await upstream.text()

    if (res && typeof res.status === 'function') {
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', upstream.ok ? 'public, max-age=300, s-maxage=300' : 'no-store')
      res.setHeader('X-Content-Type-Options', 'nosniff')
      return res.status(upstream.status).send(body)
    }

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': upstream.ok ? 'public, max-age=300, s-maxage=300' : 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    if (res && typeof res.status === 'function') {
      return res.status(502).send('Unable to reach TMDB.')
    }
    return new Response('Unable to reach TMDB.', { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
