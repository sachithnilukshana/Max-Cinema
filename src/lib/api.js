export const IMG_BASE_SM = 'https://image.tmdb.org/t/p/w185'
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

/** Build a URL-encoded query string from a params object, omitting falsy values */
function q(params = {}) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
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
  // ── Trending ─────────────────────────────────────────────────────────
  trendingMovies: () => tmdbFetch('/trending/movie/week'),
  trendingTV:     () => tmdbFetch('/trending/tv/week'),

  // ── Top Rated ────────────────────────────────────────────────────────
  topRatedMovies: (page = 1) => tmdbFetch(`/movie/top_rated${q({ page })}`),
  topRatedTV:     (page = 1) => tmdbFetch(`/tv/top_rated${q({ page })}`),

  // ── Popular ──────────────────────────────────────────────────────────
  popularMovies: (page = 1) => tmdbFetch(`/movie/popular${q({ page })}`),
  popularTV:     (page = 1) => tmdbFetch(`/tv/popular${q({ page })}`),

  // ── Search ───────────────────────────────────────────────────────────
  searchMovies: (query) => tmdbFetch(`/search/movie${q({ query })}`),
  searchTV:     (query) => tmdbFetch(`/search/tv${q({ query })}`),

  // ── Discover (filtered browsing) ─────────────────────────────────────
  discoverMovies: ({
    language, genre, sortBy = 'popularity.desc', year,
    minRating, page = 1, keywords,
  } = {}) => {
    const params = {
      sort_by: sortBy,
      page,
      with_original_language: language || undefined,
      with_genres: genre || undefined,
      primary_release_year: year || undefined,
      'vote_average.gte': minRating || undefined,
      'vote_count.gte': minRating ? 100 : undefined,
      with_keywords: keywords || undefined,
    }
    return tmdbFetch(`/discover/movie${q(params)}`)
  },

  discoverTV: ({
    language, genre, sortBy = 'popularity.desc', year,
    minRating, page = 1, keywords,
  } = {}) => {
    const params = {
      sort_by: sortBy,
      page,
      with_original_language: language || undefined,
      with_genres: genre || undefined,
      first_air_date_year: year || undefined,
      'vote_average.gte': minRating || undefined,
      'vote_count.gte': minRating ? 100 : undefined,
      with_keywords: keywords || undefined,
    }
    return tmdbFetch(`/discover/tv${q(params)}`)
  },

  // ── Details ──────────────────────────────────────────────────────────
  movieDetails: (id)         => tmdbFetch(`/movie/${id}`),
  tvDetails:    (id)         => tmdbFetch(`/tv/${id}`),
  seasonDetails:(id, season) => tmdbFetch(`/tv/${id}/season/${season}`),

  // ── Videos / Trailers ────────────────────────────────────────────────
  movieVideos: (id) => tmdbFetch(`/movie/${id}/videos`),
  tvVideos:    (id) => tmdbFetch(`/tv/${id}/videos`),

  // ── Watch Providers ──────────────────────────────────────────────────
  movieProviders: (id) => tmdbFetch(`/movie/${id}/watch/providers`),
  tvProviders:    (id) => tmdbFetch(`/tv/${id}/watch/providers`),

  // ── Credits ──────────────────────────────────────────────────────────
  movieCredits: (id) => tmdbFetch(`/movie/${id}/credits`),
  tvCredits:    (id) => tmdbFetch(`/tv/${id}/credits`),

  // ── Recommendations ──────────────────────────────────────────────────
  movieRecommendations: (id) => tmdbFetch(`/movie/${id}/recommendations`),
  tvRecommendations:    (id) => tmdbFetch(`/tv/${id}/recommendations`),

  // ── Person (Actor / Director) ─────────────────────────────────────────
  personDetails: (id) => tmdbFetch(`/person/${id}`),
  personCredits: (id) => tmdbFetch(`/person/${id}/combined_credits`),

  // ── Convenience: Korean dramas (language=ko, discover/tv) ────────────
  koreanDramas: (page = 1) =>
    tmdbFetch(`/discover/tv${q({ with_original_language: 'ko', sort_by: 'popularity.desc', page })}`),
}

const EMBED_BASE = 'https://embedmaster.link'

// Premium player (Admin + Premium subscribers) — cleaner UX, no extra ads
export const PREMIUM_PLAYER_ID = 'v23rgjijhbwlarnpf1'

// Free player (non-premium users)
export const FREE_PLAYER_ID = 'v2acgdm2adzyn2pr4d'

// Legacy aliases kept for compatibility
export const ADMIN_PLAYER_ID   = PREMIUM_PLAYER_ID
export const CUSTOMER_PLAYER_ID = FREE_PLAYER_ID

export const ADMIN_EMAIL      = 'sachithnilukshana64@gmail.com'
export const ADMIN_UID_PREFIX = 's5q2j8XcSqWz'

export function isAdminUser(user) {
  if (!user) return false
  const emailMatch = user.email && user.email.toLowerCase() === ADMIN_EMAIL
  const uidMatch   = user.uid   && user.uid.startsWith(ADMIN_UID_PREFIX)
  return Boolean(emailMatch || uidMatch)
}

/**
 * Pick the right player ID based on premium status.
 * isPremium=true → PREMIUM_PLAYER_ID (v23rgjijhbwlarnpf1)
 * isPremium=false → FREE_PLAYER_ID   (v2acgdm2adzyn2pr4d)
 * Admin users always get premium player regardless of isPremium flag.
 */
export function getActivePlayerId(isPremium = false) {
  try {
    const raw = localStorage.getItem('cs_firebase_user')
    if (raw) {
      const u = JSON.parse(raw)
      if (isAdminUser(u)) return PREMIUM_PLAYER_ID
    }
  } catch {}
  return isPremium ? PREMIUM_PLAYER_ID : FREE_PLAYER_ID
}

/**
 * Movie embed URL — format: https://embedmaster.link/{playerId}/movie/{id}
 */
export function movieEmbedUrl(tmdbId, isPremium = false, customPlayerId = null) {
  const pid = customPlayerId || getActivePlayerId(isPremium)
  return `${EMBED_BASE}/${pid}/movie/${tmdbId}`
}

/**
 * TV embed URL — format: https://embedmaster.link/{playerId}/tv/{id}/{season}/{episode}
 */
export function tvEmbedUrl(tmdbId, season, episode, isPremium = false, customPlayerId = null) {
  const pid = customPlayerId || getActivePlayerId(isPremium)
  return `${EMBED_BASE}/${pid}/tv/${tmdbId}/${season}/${episode}`
}

export function posterUrl(path, large = false) {
  if (!path) return null
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) return path
  return (large ? IMG_BASE_LG : IMG_BASE) + path
}

export function posterThumbnailUrl(path) {
  if (!path) return null
  if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) return path
  return IMG_BASE_SM + path
}

export function posterSrcSet(path) {
  if (!path || typeof path !== 'string' || path.startsWith('http://') || path.startsWith('https://')) return undefined
  return `${IMG_BASE_SM}${path} 185w, ${IMG_BASE}${path} 342w, ${IMG_BASE_LG}${path} 780w`
}

export function formatRating(rating) {
  if (!rating) return null
  return parseFloat(rating).toFixed(1)
}

export function getYear(dateStr) {
  return (dateStr || '').slice(0, 4)
}
