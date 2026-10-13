/**
 * Watchlist management library for Max Cinema.
 * Persists to localStorage (key: cs_watchlist) and fire-and-forget syncs to Firestore.
 */

const STORAGE_KEY = 'cs_watchlist'
const FIREBASE_API_KEY = 'AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg'
const PROJECT_ID = 'login-6a0e1'

// ── Internal helpers ──────────────────────────────────────────────────────────

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

function notify() {
  try {
    window.dispatchEvent(new CustomEvent('Max Cinema:watchlistchange'))
  } catch {}
}

/**
 * Fire-and-forget Firestore REST sync for a single watchlist item.
 * On any failure, logs a warning but never throws.
 */
async function syncToFirestore(uid, itemId, payload) {
  if (!uid || uid === 'guest') return
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/watchlist/${itemId}?key=${FIREBASE_API_KEY}`
  try {
    // Convert payload to Firestore field format
    const fields = {}
    for (const [key, val] of Object.entries(payload)) {
      if (val === null || val === undefined) {
        fields[key] = { nullValue: null }
      } else if (typeof val === 'boolean') {
        fields[key] = { booleanValue: val }
      } else if (typeof val === 'number') {
        fields[key] = { doubleValue: val }
      } else {
        fields[key] = { stringValue: String(val) }
      }
    }
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    })
  } catch (err) {
    console.warn('[watchlist] Firestore sync failed:', err)
  }
}

/**
 * Fire-and-forget Firestore DELETE for removing a watchlist item.
 */
async function deleteFromFirestore(uid, itemId) {
  if (!uid || uid === 'guest') return
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}/watchlist/${itemId}?key=${FIREBASE_API_KEY}`
  try {
    await fetch(url, { method: 'DELETE' })
  } catch (err) {
    console.warn('[watchlist] Firestore delete failed:', err)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add an item to the user's watchlist.
 * @param {string} uid  - Firebase UID (or profile id)
 * @param {object} item - Media item object
 */
export function addToWatchlist(uid, item) {
  if (!uid || !item) return
  const store = readStore()
  const userList = Array.isArray(store[uid]) ? store[uid] : []

  const itemId = String(item.id)
  const mediaType = item.media_type || (item.name && !item.title ? 'tv' : 'movie')

  // Prevent duplicates
  const exists = userList.some(
    (e) => String(e.id) === itemId && (e.media_type || 'movie') === mediaType,
  )
  if (exists) return

  const entry = {
    id: item.id,
    tmdbId: item.tmdbId || item.id,
    title: item.title || null,
    name: item.name || null,
    poster_path: item.poster_path || null,
    vote_average: item.vote_average || null,
    release_date: item.release_date || null,
    first_air_date: item.first_air_date || null,
    media_type: mediaType,
    overview: item.overview || null,
    savedAt: Date.now(),
  }

  store[uid] = [entry, ...userList]
  writeStore(store)
  notify()

  // Fire-and-forget Firestore sync
  syncToFirestore(uid, `${mediaType}_${itemId}`, entry)
}

/**
 * Remove an item from the user's watchlist.
 * @param {string} uid  - Firebase UID
 * @param {object} item - Media item (must have id + media_type)
 */
export function removeFromWatchlist(uid, item) {
  if (!uid || !item) return
  const store = readStore()
  const userList = Array.isArray(store[uid]) ? store[uid] : []

  const itemId = String(item.id)
  const mediaType = item.media_type || (item.name && !item.title ? 'tv' : 'movie')

  store[uid] = userList.filter(
    (e) => !(String(e.id) === itemId && (e.media_type || 'movie') === mediaType),
  )
  writeStore(store)
  notify()

  // Fire-and-forget Firestore delete
  deleteFromFirestore(uid, `${mediaType}_${itemId}`)
}

/**
 * Check whether an item is already in the watchlist.
 * @param {string} uid    - Firebase UID
 * @param {string|number} itemId - TMDB id
 * @param {string} [mediaType]  - 'movie' | 'tv' (optional, falls back to any match)
 * @returns {boolean}
 */
export function isInWatchlist(uid, itemId, mediaType) {
  if (!uid) return false
  const store = readStore()
  const userList = Array.isArray(store[uid]) ? store[uid] : []
  const id = String(itemId)
  if (mediaType) {
    return userList.some((e) => String(e.id) === id && (e.media_type || 'movie') === mediaType)
  }
  return userList.some((e) => String(e.id) === id)
}

/**
 * Get all watchlist items for a user.
 * @param {string} uid
 * @returns {Array}
 */
export function getWatchlist(uid) {
  if (!uid) return []
  const store = readStore()
  const userList = store[uid]
  return Array.isArray(userList) ? [...userList] : []
}

/**
 * Clear the entire watchlist for a user.
 * @param {string} uid
 */
export function clearWatchlist(uid) {
  if (!uid) return
  const store = readStore()
  store[uid] = []
  writeStore(store)
  notify()
}
