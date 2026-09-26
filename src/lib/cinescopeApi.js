// Base URL is set via VITE_CINESCOPE_API_URL in Netlify environment variables
export const CINESCOPE_API_BASE = import.meta.env.VITE_CINESCOPE_API_URL || 'https://cinescope-api-9ukz.onrender.com'

/**
 * Perform a safe GET request to the CineScope backend with timeout and graceful fallback.
 * Returns the `data` field of a successful JSON response, or null on any error.
 */
async function cinescopeFetch(endpoint) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${CINESCOPE_API_BASE}${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    // Backend wraps successful responses in { success: true, data: … }
    // Some list endpoints return the array directly at root level
    if (json?.success !== undefined) return json.success ? (json.data ?? null) : null
    return json ?? null
  } catch (err) {
    console.warn(`[CineScope API] Failed to fetch ${endpoint}:`, err?.message || err)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Build a URLSearchParams query string from a plain object, ignoring undefined/null values */
function buildQuery(params = {}) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

/** Detect the current device type for ad targeting */
function detectDevice() {
  if (typeof window === 'undefined') return 'ALL'
  return window.innerWidth < 768 ? 'MOBILE' : 'DESKTOP'
}

export const cinescopeApi = {
  // ── Homepage & Editorial ─────────────────────────────────────────────
  getHomepage: () => cinescopeFetch('/api/public/homepage'),
  getFeatured: () => cinescopeFetch('/api/public/featured'),
  getTrending: () => cinescopeFetch('/api/public/trending'),

  // ── Movies ───────────────────────────────────────────────────────────
  getMovies: (params) => cinescopeFetch(`/api/public/movies${buildQuery(params)}`),
  getMovieById: (id) => id ? cinescopeFetch(`/api/public/movies/${id}`) : Promise.resolve(null),

  // ── TV Shows ─────────────────────────────────────────────────────────
  getTVShows: (params) => cinescopeFetch(`/api/public/tv-shows${buildQuery(params)}`),
  getTVShowById: (id) => id ? cinescopeFetch(`/api/public/tv-shows/${id}`) : Promise.resolve(null),

  // ── Collections ──────────────────────────────────────────────────────
  getCollections: () => cinescopeFetch('/api/public/collections'),
  getCollectionBySlug: (slug) => slug ? cinescopeFetch(`/api/public/collections/${slug}`) : Promise.resolve(null),

  // ── Genres ───────────────────────────────────────────────────────────
  getGenres: () => cinescopeFetch('/api/public/genres'),

  // ── AI Recommendations (503 in staging — returns null gracefully) ────
  getRecommendations: (contentId) =>
    contentId ? cinescopeFetch(`/api/public/recommendations/${contentId}`) : Promise.resolve(null),

  // ── Ads (device-aware) ───────────────────────────────────────────────
  getAds: (placement = 'HOMEPAGE', device) =>
    cinescopeFetch(`/api/public/ads${buildQuery({ placement, device: device || detectDevice() })}`),
}

/**
 * Normalizes movie and TV items returned by CineScope Backend API
 * Supports both standalone items and nested { contentType, movie, tvShow } wrappers
 */
export function normalizeCinescopeItem(item) {
  if (!item) return null

  const isTV = item.contentType === 'TV_SHOW' || (!item.movie && Boolean(item.tvShow)) || item.media_type === 'tv'
  const target = isTV ? (item.tvShow || item) : (item.movie || item)

  const id = target.tmdbId || target.id || item.id
  const tmdbId = target.tmdbId || target.id || item.tmdbId
  const title = target.title || target.name || item.title || item.name || 'Untitled'
  const poster = target.posterUrl || target.poster_path || item.posterUrl || item.poster_path
  const backdrop = target.backdropUrl || target.backdrop_path || item.backdropUrl || item.backdrop_path
  const date = target.releaseDate || target.release_date || target.firstAirDate || target.first_air_date
  const rating = target.rating ?? target.vote_average

  return {
    ...target,
    id,
    tmdbId,
    cinescopeId: item.id || target.id,
    title,
    name: title,
    overview: target.overview || item.overview || '',
    poster_path: poster,
    backdrop_path: backdrop,
    release_date: date,
    first_air_date: date,
    vote_average: rating,
    media_type: isTV ? 'tv' : 'movie',
  }
}

// ----------------------------------------------------------------------
// Telemetry & User Action Tracking (Safe with guards)
// ----------------------------------------------------------------------

export function trackMovieView(movie) {
  if (!movie) return
  if (typeof window !== 'undefined' && window.cinescope) {
    if (typeof window.cinescope.trackMovieView === 'function') {
      window.cinescope.trackMovieView(movie.id || movie.tmdbId, movie.title || movie.name)
    } else if (typeof window.cinescope.track === 'function') {
      window.cinescope.track('movie_view', { movieId: movie.id || movie.tmdbId, title: movie.title || movie.name })
    }
  }
}

export function trackTVView(show) {
  if (!show) return
  if (typeof window !== 'undefined' && window.cinescope) {
    if (typeof window.cinescope.trackTVView === 'function') {
      window.cinescope.trackTVView(show.id || show.tmdbId, show.name || show.title)
    } else if (typeof window.cinescope.track === 'function') {
      window.cinescope.track('tv_view', { showId: show.id || show.tmdbId, title: show.name || show.title })
    }
  }
}

export function trackSearch(query) {
  if (!query || !query.trim()) return
  if (typeof window !== 'undefined' && window.cinescope) {
    if (typeof window.cinescope.trackSearch === 'function') {
      window.cinescope.trackSearch(query.trim())
    } else if (typeof window.cinescope.track === 'function') {
      window.cinescope.track('search', { query: query.trim() })
    }
  }
}

export function trackTrailerClick(movie) {
  if (!movie) return
  if (typeof window !== 'undefined' && window.cinescope && typeof window.cinescope.track === 'function') {
    window.cinescope.track('trailer_click', {
      movieId: movie.id || movie.tmdbId,
      title: movie.title || movie.name,
    })
  }
}
