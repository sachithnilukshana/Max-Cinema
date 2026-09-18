export const IMG_BASE = 'https://image.tmdb.org/t/p/w342'
export const IMG_BASE_LG = 'https://image.tmdb.org/t/p/w780'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function tmdbFetch(path) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(`/api/tmdb?path=${encodeURIComponent(path)}`, { signal: controller.signal })
    if (!response.ok) {
      const message = await response.text()
      throw new ApiError(response.status, message || `TMDB error: ${response.status}`)
    }
    return response.json()
  } finally {
    window.clearTimeout(timeout)
  }
}

export function apiErrorMessage(error, title = 'Titles') {
  if (error?.status === 503 || /credentials are not configured/i.test(error?.message)) {
    return 'TMDB is not configured on this deployment. In Netlify → Project configuration → Environment variables, add TMDB_API_KEY, then redeploy.'
  }
  if (error?.status === 401) {
    return 'TMDB rejected the configured key. In Netlify, set TMDB_API_KEY to only the key value (not the variable name), then redeploy.'
  }
  if (error?.status === 429) return 'Too many catalogue requests. Please wait a minute and try again.'
  return `${title} could not be loaded. Please try again shortly.`
}

export const api = {
  trendingMovies: () => tmdbFetch('/trending/movie/week'),
  trendingTV: () => tmdbFetch('/trending/tv/week'),
  searchMovies: (q) => tmdbFetch(`/search/movie?query=${encodeURIComponent(q)}`),
  searchTV: (q) => tmdbFetch(`/search/tv?query=${encodeURIComponent(q)}`),
  discoverMovies: ({ language, genre }) => {
    const params = new URLSearchParams({ sort_by: 'popularity.desc' })
    if (language) params.set('with_original_language', language)
    if (genre) params.set('with_genres', genre)
    return tmdbFetch(`/discover/movie?${params}`)
  },
  movieDetails: (id) => tmdbFetch(`/movie/${id}`),
  tvDetails: (id) => tmdbFetch(`/tv/${id}`),
  seasonDetails: (id, season) => tmdbFetch(`/tv/${id}/season/${season}`),
  movieVideos: (id) => tmdbFetch(`/movie/${id}/videos`),
  tvVideos: (id) => tmdbFetch(`/tv/${id}/videos`),
  movieProviders: (id) => tmdbFetch(`/movie/${id}/watch/providers`),
  tvProviders: (id) => tmdbFetch(`/tv/${id}/watch/providers`),
  movieCredits: (id) => tmdbFetch(`/movie/${id}/credits`),
  tvCredits: (id) => tmdbFetch(`/tv/${id}/credits`),
  movieRecommendations: (id) => tmdbFetch(`/movie/${id}/recommendations`),
  tvRecommendations: (id) => tmdbFetch(`/tv/${id}/recommendations`),
}

export function movieEmbedUrl(tmdbId) {
  return `/api/play/movie/${tmdbId}`
}

export function tvEmbedUrl(tmdbId, season, episode) {
  return `/api/play/tv/${tmdbId}/${season}/${episode}`
}

export function posterUrl(path, large = false) {
  if (!path) return null
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) return path
  return (large ? IMG_BASE_LG : IMG_BASE) + path
}

export function formatRating(rating) {
  if (!rating) return null
  return parseFloat(rating).toFixed(1)
}

export function getYear(dateStr) {
  return (dateStr || '').slice(0, 4)
}
