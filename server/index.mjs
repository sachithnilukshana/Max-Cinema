import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import telegramHandler from '../api/telegram.js'
import checkPremiumHandler from '../api/check-premium.js'
import virtualCardPayHandler from '../api/virtual-card-pay.js'
import reportHandler from '../api/report.js'
import recordReferralHandler from '../api/record-referral.js'
import payhereNotifyHandler from '../api/payhere-notify.js'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

// Load local .env if present
try {
  if (existsSync(join(rootDir, '.env')) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(join(rootDir, '.env'))
  }
} catch {}

const distDir = join(rootDir, 'dist')
const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'
function readSecret(name) {
  let value = (process.env[name] || '').trim()
  if (value.startsWith(`${name}=`)) value = value.slice(name.length + 1).trim()
  return value.replace(/^("|')|("|')$/g, '')
}
const tmdbApiKey = readSecret('TMDB_API_KEY')
const tmdbToken = readSecret('TMDB_READ_ACCESS_TOKEN')
const embedBase = process.env.EMBED_BASE || 'https://embedmaster.link'
const embedApiKey = readSecret('EMBED_API_KEY')
const cache = new Map()
const cacheTtlMs = 5 * 60 * 1000
const cacheMaxEntries = 300
const rateLimits = new Map()
const rateLimitWindowMs = 60 * 1000
const rateLimitMax = 90

function parseEmbedBase(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

const embedBaseUrl = parseEmbedBase(embedBase) || new URL('https://embedmaster.link')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

function contentSecurityPolicy() {
  const frameSources = ["'self'", 'https://www.youtube-nocookie.com']
  try {
    if (embedBaseUrl) frameSources.push(embedBaseUrl.origin)
  } catch {}
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://ihenxsggtzkhnqiepysd.supabase.co wss://ihenxsggtzkhnqiepysd.supabase.co https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://api.themoviedb.org https://api.telegram.org https://cash-scan-connect.lovable.app https://cinescope-api-9ukz.onrender.com",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'self'",
    `frame-src ${frameSources.join(' ')}`,
    "img-src 'self' https://image.tmdb.org https://*.googleusercontent.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net data:",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://*.googlesyndication.com https://cinescope-api-9ukz.onrender.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  ].join('; ')
}

function securityHeaders() {
  return {
    'Content-Security-Policy': contentSecurityPolicy(),
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
  }
}

function send(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    ...securityHeaders(),
    ...headers,
  })
  response.end(body)
}

function validTmdbPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return false
  const parsed = new URL(value, 'https://api.themoviedb.org')
  const allowedPaths = [
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
  const allowedParams = new Set([
    'query', 'sort_by', 'with_original_language', 'with_genres',
    'page', 'vote_average.gte', 'vote_count.gte',
    'primary_release_year', 'first_air_date_year',
    'without_genres', 'with_keywords', 'with_networks',
    'language', 'region',
  ])
  return parsed.origin === 'https://api.themoviedb.org'
    && allowedPaths.some(pattern => pattern.test(parsed.pathname))
    && [...parsed.searchParams.keys()].every(key => allowedParams.has(key))
}

function isRateLimited(request) {
  const address = request.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const recent = (rateLimits.get(address) || []).filter(time => now - time < rateLimitWindowMs)
  recent.push(now)
  rateLimits.set(address, recent)
  if (rateLimits.size > 10_000) {
    for (const [key, times] of rateLimits) {
      if (!times.some(time => now - time < rateLimitWindowMs)) rateLimits.delete(key)
    }
  }
  return recent.length > rateLimitMax
}

function cacheResponse(key, body) {
  if (cache.size >= cacheMaxEntries && !cache.has(key)) cache.delete(cache.keys().next().value)
  cache.set(key, { body, expiresAt: Date.now() + cacheTtlMs })
}

async function proxyTmdb(requestUrl, request, response) {
  if (!tmdbApiKey && !tmdbToken) {
    send(response, 503, 'TMDB server credentials are not configured.')
    return
  }

  const requestedPath = requestUrl.searchParams.get('path')
  if (!validTmdbPath(requestedPath)) {
    send(response, 400, 'Invalid TMDB request.')
    return
  }
  if (isRateLimited(request)) {
    send(response, 429, 'Too many TMDB requests. Please try again shortly.', { 'Retry-After': '60' })
    return
  }

  const target = new URL(`https://api.themoviedb.org/3${requestedPath}`)
  if (tmdbApiKey) target.searchParams.set('api_key', tmdbApiKey)
  const cacheKey = target.pathname + target.search
  const cached = cache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    send(response, 200, cached.body, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' })
    return
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  try {
    const upstream = await fetch(target, { headers: tmdbToken ? { Authorization: `Bearer ${tmdbToken}` } : {}, signal: controller.signal })
    const body = await upstream.text()
    if (upstream.ok) cacheResponse(cacheKey, body)
    send(response, upstream.status, body, {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': upstream.ok ? 'public, max-age=300' : 'no-store',
    })
  } catch {
    send(response, 502, 'Unable to reach TMDB.')
  } finally {
    clearTimeout(timeout)
  }
}

function playEmbed(pathname, response) {
  const parts = pathname.split('/').filter(Boolean)
  const validMovie = parts.length === 4 && parts[2] === 'movie' && /^\d+$/.test(parts[3])
  const validTv = parts.length === 6 && parts[2] === 'tv' && parts.slice(3).every(value => /^\d+$/.test(value))
  if (!validMovie && !validTv) {
    send(response, 400, 'Invalid playback request.')
    return
  }

  const target = new URL(`/${parts.slice(2).join('/')}`, embedBaseUrl)
  if (embedApiKey) target.searchParams.set('apikey', embedApiKey)
  response.writeHead(302, { Location: target.toString(), 'Referrer-Policy': 'no-referrer', ...securityHeaders() })
  response.end()
}

function serveApp(pathname, response) {
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    send(response, 400, 'Invalid URL path.')
    return
  }
  if (decodedPath.includes('\0')) {
    send(response, 400, 'Invalid URL path.')
    return
  }
  const requested = decodedPath === '/' ? '/index.html' : decodedPath
  const filePath = resolve(distDir, `.${requested.replaceAll('\\', '/')}`)
  const fileRelative = relative(distDir, filePath)
  const canServe = !fileRelative.startsWith('..') && !isAbsolute(fileRelative) && existsSync(filePath) && statSync(filePath).isFile()
  const fallbackPath = join(distDir, 'index.html')
  const target = canServe ? filePath : fallbackPath

  if (!existsSync(target)) {
    send(response, 503, 'Build the app first with npm run build.')
    return
  }

  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(target)] || 'application/octet-stream',
    'Cache-Control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable',
    ...securityHeaders(),
  })
  createReadStream(target).pipe(response)
}

async function runHandler(handler, request, response, requestUrl) {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (request.method === 'OPTIONS') {
    response.writeHead(200)
    response.end()
    return
  }

  request.query = Object.fromEntries(requestUrl.searchParams.entries())
  let bodyData = ''
  for await (const chunk of request) {
    bodyData += chunk
  }
  try {
    request.body = bodyData ? JSON.parse(bodyData) : {}
  } catch {
    request.body = bodyData
  }

  response.status = (code) => {
    response.statusCode = code
    return response
  }
  response.json = (data) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    response.end(JSON.stringify(data))
  }
  response.send = (data) => {
    response.end(data)
  }

  try {
    await handler(request, response)
  } catch (err) {
    console.error('API handler error:', err)
    if (!response.writableEnded) {
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ error: err.message }))
    }
  }
}

const server = createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`)

  if (requestUrl.pathname === '/api/health') {
    send(response, 200, JSON.stringify({ ok: true }), { 'Content-Type': 'application/json; charset=utf-8' })
  } else if (requestUrl.pathname === '/api/tmdb') {
    if (request.method !== 'GET') {
      send(response, 405, 'Method not allowed.')
      return
    }
    proxyTmdb(requestUrl, request, response)
  } else if (requestUrl.pathname.startsWith('/api/play/')) {
    if (request.method !== 'GET') {
      send(response, 405, 'Method not allowed.')
      return
    }
    playEmbed(requestUrl.pathname, response)
  } else if (requestUrl.pathname === '/api/telegram') {
    runHandler(telegramHandler, request, response, requestUrl)
  } else if (requestUrl.pathname === '/api/check-premium') {
    runHandler(checkPremiumHandler, request, response, requestUrl)
  } else if (requestUrl.pathname === '/api/virtual-card-pay') {
    runHandler(virtualCardPayHandler, request, response, requestUrl)
  } else if (requestUrl.pathname === '/api/report') {
    runHandler(reportHandler, request, response, requestUrl)
  } else if (requestUrl.pathname === '/api/record-referral') {
    runHandler(recordReferralHandler, request, response, requestUrl)
  } else if (requestUrl.pathname === '/api/payhere-notify') {
    runHandler(payhereNotifyHandler, request, response, requestUrl)
  } else if (requestUrl.pathname.startsWith('/api/')) {
    send(response, 404, 'API endpoint not found.')
  } else {
    serveApp(requestUrl.pathname, response)
  }
})

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing Max Cinema API process or run with a different PORT value.`)
  } else {
    console.error('Max Cinema server could not start:', error.message)
  }
  process.exitCode = 1
})

server.listen(port, host, () => {
  console.log(`Max Cinema server running at http://${host}:${port}`)
})
