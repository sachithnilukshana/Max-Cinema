function configured(name) {
  let value = (process.env[name] || '').trim()
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim()
  value = value.replace(/^("|')|("|')$/g, '')
  return Boolean(value && !/^your_/i.test(value))
}

export default function health() {
  return Response.json({
    ok: true,
    platform: 'netlify',
    tmdbConfigured: configured('TMDB_API_KEY') || configured('TMDB_READ_ACCESS_TOKEN'),
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

export const config = { path: '/api/health', method: 'GET' }
