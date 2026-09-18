const PROFILE_KEY = 'cs_active_profile'
const WATCHLIST_PREFIX = 'cs_watchlist_'
const LIBRARY_PREFIX = 'cs_library_'

function notifyLibraryChange(profileId) {
  try {
    window.dispatchEvent(new CustomEvent('Max Cinema:librarychange', { detail: { profileId } }))
  } catch {}
}

function notifyProfileDataChange(profileId) {
  try {
    window.dispatchEvent(new CustomEvent('Max Cinema:profiledatachange', { detail: { profileId } }))
  } catch {}
}

function storageSet(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function titleKey(item) {
  const mediaType = item.media_type || item.mediaType || (item.name ? 'tv' : 'movie')
  return `${mediaType}:${item.id}`
}

function defaultLibrary() {
  return {
    collections: [],
    continueWatching: [],
    episodeProgress: {},
    favorites: [],
    notes: {},
    ratings: {},
    reports: [],
    remindersEnabled: false,
    notifiedReleases: [],
  }
}

function normalizeLibrary(saved) {
  const fallback = defaultLibrary()
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return fallback
  return {
    ...fallback,
    ...saved,
    collections: Array.isArray(saved.collections) ? saved.collections.filter(item => item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string' && Array.isArray(item.itemKeys)) : [],
    continueWatching: Array.isArray(saved.continueWatching) ? saved.continueWatching.filter(item => item && typeof item === 'object' && Number.isFinite(Number(item.id))) : [],
    episodeProgress: saved.episodeProgress && typeof saved.episodeProgress === 'object' && !Array.isArray(saved.episodeProgress) ? saved.episodeProgress : {},
    favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(item => typeof item === 'string') : [],
    notes: saved.notes && typeof saved.notes === 'object' && !Array.isArray(saved.notes) ? saved.notes : {},
    ratings: saved.ratings && typeof saved.ratings === 'object' && !Array.isArray(saved.ratings) ? saved.ratings : {},
    reports: Array.isArray(saved.reports) ? saved.reports.filter(item => item && typeof item === 'object') : [],
    remindersEnabled: Boolean(saved.remindersEnabled),
    notifiedReleases: Array.isArray(saved.notifiedReleases) ? saved.notifiedReleases.filter(item => typeof item === 'string') : [],
  }
}

export function getActiveProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY))
    if (saved?.id && saved?.name) return saved
  } catch {}
  return { id: 'guest', name: 'Guest' }
}

export function saveActiveProfile(name) {
  return saveActiveProfileRecord({
    id: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'guest',
    name: name.trim() || 'Guest',
  })
}

export function saveActiveProfileRecord(profile) {
  const next = {
    id: String(profile?.id || 'guest').slice(0, 160),
    name: String(profile?.name || 'Guest').trim().slice(0, 32) || 'Guest',
  }
  storageSet(PROFILE_KEY, JSON.stringify(next))
  return next
}

export function loadWatchlist(profileId, defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(WATCHLIST_PREFIX + profileId))
    if (Array.isArray(saved)) return saved.filter(item => item && typeof item === 'object' && Number.isFinite(Number(item.id)))
  } catch {}
  return (Array.isArray(defaults) ? defaults : []).map(item => ({ ...item, watched: false }))
}

export function saveWatchlist(profileId, items) {
  storageSet(WATCHLIST_PREFIX + profileId, JSON.stringify(Array.isArray(items) ? items : []))
  notifyProfileDataChange(profileId)
}

export function addToWatchlist(profileId, item, defaults) {
  const items = loadWatchlist(profileId, defaults)
  const mediaType = item.media_type || (item.name ? 'tv' : 'movie')
  const exists = items.some(entry => entry.id === item.id && (entry.media_type || (entry.name ? 'tv' : 'movie')) === mediaType)
  if (exists) return { added: false, items }

  const nextItems = [{ ...item, media_type: mediaType, watched: false }, ...items]
  saveWatchlist(profileId, nextItems)
  return { added: true, items: nextItems }
}

export function loadLibrary(profileId) {
  try {
    const saved = JSON.parse(localStorage.getItem(LIBRARY_PREFIX + profileId))
    return normalizeLibrary(saved)
  } catch {}
  return defaultLibrary()
}

export function saveLibrary(profileId, library) {
  const saved = storageSet(LIBRARY_PREFIX + profileId, JSON.stringify(normalizeLibrary(library)))
  if (saved) {
    notifyLibraryChange(profileId)
    notifyProfileDataChange(profileId)
  }
}

export function getProfileSnapshot(profileId) {
  return {
    schemaVersion: 1,
    watchlist: loadWatchlist(profileId, []),
    library: loadLibrary(profileId),
  }
}

export function restoreProfileSnapshot(profileId, snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return false
  const watchlist = Array.isArray(snapshot.watchlist)
    ? snapshot.watchlist.filter(item => item && typeof item === 'object' && Number.isFinite(Number(item.id)))
    : []
  const library = normalizeLibrary(snapshot.library)
  const watchlistSaved = storageSet(WATCHLIST_PREFIX + profileId, JSON.stringify(watchlist))
  const librarySaved = storageSet(LIBRARY_PREFIX + profileId, JSON.stringify(library))
  if (watchlistSaved || librarySaved) {
    notifyLibraryChange(profileId)
    notifyProfileDataChange(profileId)
  }
  return watchlistSaved || librarySaved
}

export function updateLibrary(profileId, callback) {
  const next = callback(loadLibrary(profileId))
  saveLibrary(profileId, next)
  return next
}

export function getTitleKey(item) {
  return titleKey(item)
}

export function recordContinueWatching(profileId, item) {
  return updateLibrary(profileId, library => {
    const entry = {
      ...item,
      media_type: item.media_type || item.mediaType || (item.name ? 'tv' : 'movie'),
      // Cross-origin embeds do not expose a reliable playhead. Preserve a useful
      // local resume marker until a first-party player is connected.
      progress: Number.isFinite(item.progress) ? item.progress : 12,
      lastPlayedAt: new Date().toISOString(),
    }
    const key = titleKey(entry) + (entry.season && entry.episode ? `:${entry.season}:${entry.episode}` : '')
    const entries = [entry, ...library.continueWatching.filter(existing => {
      const existingKey = titleKey(existing) + (existing.season && existing.episode ? `:${existing.season}:${existing.episode}` : '')
      return existingKey !== key
    })].slice(0, 12)
    return { ...library, continueWatching: entries }
  })
}

export function toggleFavorite(profileId, item) {
  return updateLibrary(profileId, library => {
    const key = titleKey(item)
    const favorites = library.favorites.includes(key)
      ? library.favorites.filter(value => value !== key)
      : [...library.favorites, key]
    return { ...library, favorites }
  })
}

export function saveTitleReview(profileId, item, { rating, note }) {
  return updateLibrary(profileId, library => {
    const key = titleKey(item)
    return {
      ...library,
      notes: { ...library.notes, [key]: note },
      ratings: { ...library.ratings, [key]: rating },
    }
  })
}

export function createCollection(profileId, name) {
  const trimmed = name.trim()
  if (!trimmed) return loadLibrary(profileId)
  return updateLibrary(profileId, library => ({
    ...library,
    collections: [...library.collections, { id: createId(), name: trimmed, itemKeys: [] }],
  }))
}

export function addToCollection(profileId, collectionId, item) {
  return updateLibrary(profileId, library => ({
    ...library,
    collections: library.collections.map(collection => collection.id !== collectionId ? collection : {
      ...collection,
      itemKeys: collection.itemKeys.includes(titleKey(item)) ? collection.itemKeys : [...collection.itemKeys, titleKey(item)],
    }),
  }))
}

export function setEpisodeWatched(profileId, showId, season, episode) {
  return updateLibrary(profileId, library => {
    const key = `${showId}:${season}:${episode}`
    return { ...library, episodeProgress: { ...library.episodeProgress, [key]: !library.episodeProgress[key] } }
  })
}

export function markEpisodeWatched(profileId, showId, season, episode) {
  return updateLibrary(profileId, library => {
    const key = `${showId}:${season}:${episode}`
    return { ...library, episodeProgress: { ...library.episodeProgress, [key]: true } }
  })
}

export function toggleReleaseReminders(profileId) {
  return updateLibrary(profileId, library => ({ ...library, remindersEnabled: !library.remindersEnabled }))
}

export function markReleaseNotified(profileId, titleKeys) {
  return updateLibrary(profileId, library => ({
    ...library,
    notifiedReleases: [...new Set([...library.notifiedReleases, ...titleKeys])].slice(-200),
  }))
}

export function addReport(profileId, report) {
  return updateLibrary(profileId, library => ({
    ...library,
    reports: [{ id: createId(), createdAt: new Date().toISOString(), ...report }, ...library.reports].slice(0, 50),
  }))
}
