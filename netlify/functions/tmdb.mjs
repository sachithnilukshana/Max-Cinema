const ALLOWED_PATHS = [
  /^\/trending\/(movie|tv)\/week$/,
  /^\/search\/(movie|tv)$/,
  /^\/discover\/movie$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/(movie|tv)\/\d+\/(videos|watch\/providers|credits|recommendations)$/,
]

const ALLOWED_PARAMS = new Set(['query', 'sort_by', 'with_original_language', 'with_genres'])

function readSecret(name) {
  let value = (process.env[name] || '').trim()
  // Netlify expects only the value, but accepting a pasted .env-style line
  // avoids a confusing 401 when someone enters "TMDB_API_KEY=..." in the UI.
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

function text(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

export default async function tmdb(request) {
  const apiKey = readSecret('TMDB_API_KEY')
  const token = readSecret('TMDB_READ_ACCESS_TOKEN')
  if (!apiKey && !token) return text('TMDB server credentials are not configured.', 503)

  const requestUrl = new URL(request.url)
  const requestedPath = requestUrl.searchParams.get('path')
  if (!validTmdbPath(requestedPath)) return text('Invalid TMDB request.', 400)

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
    if (!upstream.ok) console.error(`TMDB request failed with status ${upstream.status}.`)
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': upstream.ok ? 'public, max-age=300, s-maxage=300' : 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return text('Unable to reach TMDB.', 502)
  } finally {
    clearTimeout(timeout)
  }
}

export const config = {
  path: '/api/tmdb',
  method: 'GET',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: 'ip',
    windowSize: 60,
    windowLimit: 90,
  },
}
