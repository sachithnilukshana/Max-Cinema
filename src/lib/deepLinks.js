// ── Max Cinema Deep Links Library ─────────────────────────────────────────────
// Provides URL parsing and building helpers for shareable deep links.

const BASE_URL = 'https://max-cinema.vercel.app'

/**
 * Parse the current pathname into a structured deep link object.
 * Returns null when the path does not match any known pattern.
 *
 * Supported patterns:
 *   /movie/:id                       → { type: 'movie', id }
 *   /tv/:id/:season/:episode         → { type: 'tv', id, season, episode }
 *   /watchlist                       → { type: 'watchlist' }
 *   /stats                           → { type: 'stats' }
 *   /party                           → { type: 'party' }
 *   /party/:roomCode                 → { type: 'party', roomCode }
 */
export function parseDeepLink(pathname) {
  const path = (pathname || window.location.pathname).replace(/\/+$/, '')
  const segments = path.split('/').filter(Boolean)

  if (!segments.length) return null

  const [first, second, third, fourth] = segments

  if (first === 'movie' && second) {
    return { type: 'movie', id: second }
  }

  if (first === 'tv' && second) {
    const result = { type: 'tv', id: second }
    if (third) result.season = parseInt(third, 10) || 1
    if (fourth) result.episode = parseInt(fourth, 10) || 1
    return result
  }

  if (first === 'watchlist') return { type: 'watchlist' }
  if (first === 'stats') return { type: 'stats' }

  if (first === 'party') {
    if (second) return { type: 'party', roomCode: second.toUpperCase() }
    return { type: 'party' }
  }

  return null
}

/**
 * Build a relative movie deep link path.
 * @param {string|number} tmdbId
 * @returns {string} e.g. '/movie/123456'
 */
export function buildMovieLink(tmdbId) {
  return '/movie/' + tmdbId
}

/**
 * Build a relative TV deep link path.
 * @param {string|number} tmdbId
 * @param {number} season
 * @param {number} episode
 * @returns {string} e.g. '/tv/tt0903747/1/1'
 */
export function buildTVLink(tmdbId, season, episode) {
  return `/tv/${tmdbId}/${season}/${episode}`
}

/**
 * Copy text to clipboard. Falls back to execCommand for older browsers.
 * @param {string} text
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    return navigator.clipboard.writeText(text)
  }
  // Fallback
  const el = document.createElement('textarea')
  el.value = text
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

/**
 * Build the full shareable URL for a piece of media.
 * @param {'movie'|'tv'|'watchlist'|'stats'|'party'} type
 * @param {string|number} [id]
 * @param {number} [season]
 * @param {number} [episode]
 * @returns {string} full URL
 */
export function getShareUrl(type, id, season, episode) {
  if (type === 'movie' && id) {
    return `${BASE_URL}/movie/${id}`
  }
  if (type === 'tv' && id) {
    if (season && episode) return `${BASE_URL}/tv/${id}/${season}/${episode}`
    return `${BASE_URL}/tv/${id}`
  }
  if (type === 'watchlist') return `${BASE_URL}/watchlist`
  if (type === 'stats') return `${BASE_URL}/stats`
  if (type === 'party') {
    if (id) return `${BASE_URL}/party/${id}`
    return `${BASE_URL}/party`
  }
  return BASE_URL
}
