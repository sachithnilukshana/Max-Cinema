export const CINESCOPE_API_BASE = import.meta.env.VITE_CINESCOPE_API_URL || 'https://cinescope-api-9ukz.onrender.com'

/**
 * Perform a safe GET request to the CineScope backend with timeout and graceful fallback
 */
async function cinescopeFetch(endpoint) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`${CINESCOPE_API_BASE}${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.success ? json.data : null
  } catch (err) {
    console.warn(`[CineScope API] Failed to fetch ${endpoint}:`, err.message)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export const cinescopeApi = {
  getHomepage: () => cinescopeFetch('/api/public/homepage'),
  getFeatured: () => cinescopeFetch('/api/public/featured'),
  getTrending: () => cinescopeFetch('/api/public/trending'),
  getCollections: () => cinescopeFetch('/api/public/collections'),
  getAds: (placement = 'HOMEPAGE') => cinescopeFetch(`/api/public/ads?placement=${encodeURIComponent(placement)}`),
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
// Telemetry & User Action Tracking
// ----------------------------------------------------------------------

export function trackMovieView(movie) {
  if (!movie) return
  if (typeof window !== 'undefined' && window.cinescope) {
    window.cinescope.trackMovieView(movie.id || movie.tmdbId, movie.title || movie.name)
  }
}

export function trackTVView(show) {
  if (!show) return
  if (typeof window !== 'undefined' && window.cinescope) {
    window.cinescope.trackTVView(show.id || show.tmdbId, show.name || show.title)
  }
}

export function trackSearch(query) {
  if (!query || !query.trim()) return
  if (typeof window !== 'undefined' && window.cinescope) {
    window.cinescope.trackSearch(query.trim())
  }
}

export function trackTrailerClick(movie) {
  if (!movie) return
  if (typeof window !== 'undefined' && window.cinescope) {
    window.cinescope.track('trailer_click', {
      movieId: movie.id || movie.tmdbId,
      title: movie.title || movie.name,
    })
  }
}

