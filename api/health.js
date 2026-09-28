function configured(name) {
  let value = (process.env[name] || '').trim()
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim()
  value = value.replace(/^("|')|("|')$/g, '')
  return Boolean(value && !/^your_/i.test(value))
}

export default function handler(req, res) {
  const data = {
    ok: true,
    platform: 'vercel',
    tmdbConfigured: configured('TMDB_API_KEY') || configured('TMDB_READ_ACCESS_TOKEN'),
  }

  if (res && typeof res.status === 'function') {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(data)
  }

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
