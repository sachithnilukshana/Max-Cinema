/**
 * badges.js — Max Cinema gamification badge system
 * Reads from existing cs_watchlist_ / cs_library_ localStorage keys (profile.js schema)
 * Persists badge-seen state in 'cs_badges_{uid}'
 */

// ---------------------------------------------------------------------------
// Badge definitions
// ---------------------------------------------------------------------------

export const BADGE_DEFINITIONS = [
  {
    id: 'first_watch',
    name: 'First Watch',
    icon: '🎬',
    desc: 'Watched your first title',
    condition: (stats) => stats.totalWatched >= 1,
  },
  {
    id: 'binge_king',
    name: 'Binge King',
    icon: '👑',
    desc: 'Watched 5+ episodes in one day',
    condition: (stats) => stats.maxEpisodesInDay >= 5,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    icon: '🦉',
    desc: 'Watched after midnight 3 times',
    condition: (stats) => stats.midnightWatches >= 3,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    icon: '🗺️',
    desc: 'Watched titles from 5 different genres',
    condition: (stats) => stats.uniqueGenres >= 5,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    icon: '💯',
    desc: 'Watched 100+ titles total',
    condition: (stats) => stats.totalWatched >= 100,
  },
  {
    id: 'critic',
    name: 'Critic',
    icon: '⭐',
    desc: 'Left 10+ community reviews',
    condition: (stats) => stats.reviewCount >= 10,
  },
  {
    id: 'social_star',
    name: 'Social Star',
    icon: '🌟',
    desc: 'Referred 3+ friends',
    condition: (stats) => stats.referralCount >= 3,
  },
  {
    id: 'streak_7',
    name: '7-Day Streak',
    icon: '🔥',
    desc: 'Active 7 days in a row',
    condition: (stats) => stats.currentStreak >= 7,
  },
  {
    id: 'watchlist_10',
    name: 'Curator',
    icon: '📋',
    desc: 'Added 10+ items to your Watchlist',
    condition: (stats) => stats.watchlistCount >= 10,
  },
  {
    id: 'vip',
    name: 'VIP Member',
    icon: '💎',
    desc: 'Active premium subscriber',
    condition: (stats) => stats.isPremium === true,
  },
]

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function safeGet(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function badgesKey(uid) {
  return `cs_badges_${uid}`
}

// ---------------------------------------------------------------------------
// Stats computation
// ---------------------------------------------------------------------------

/**
 * Derives gamification stats from localStorage data written by profile.js.
 * @param {string} uid  - user/profile id used as part of the storage key
 * @returns {object} stats
 */
export function computeStats(uid) {
  // -- continueWatching + episodeProgress live under cs_library_{uid}
  const library = safeGet(`cs_library_${uid}`) || {}
  const continueWatching = Array.isArray(library.continueWatching) ? library.continueWatching : []
  const episodeProgress = library.episodeProgress && typeof library.episodeProgress === 'object'
    ? library.episodeProgress
    : {}
  const ratings = library.ratings && typeof library.ratings === 'object' ? library.ratings : {}
  const notes = library.notes && typeof library.notes === 'object' ? library.notes : {}

  // -- watchlist lives under cs_watchlist_{uid}
  const watchlist = safeGet(`cs_watchlist_${uid}`)
  const watchlistItems = Array.isArray(watchlist) ? watchlist : []

  // totalWatched = continueWatching entries + fully-marked episodes
  const watchedEpisodes = Object.values(episodeProgress).filter(Boolean).length
  const totalWatched = continueWatching.length + watchedEpisodes

  // maxEpisodesInDay — group continueWatching by date, find max
  const byDay = {}
  for (const entry of continueWatching) {
    if (entry.lastPlayedAt) {
      const day = entry.lastPlayedAt.slice(0, 10)
      byDay[day] = (byDay[day] || 0) + 1
    }
  }
  const maxEpisodesInDay = Object.values(byDay).reduce((max, v) => Math.max(max, v), 0)

  // midnightWatches — entries watched between 00:00 and 03:59 local time
  let midnightWatches = 0
  for (const entry of continueWatching) {
    if (entry.lastPlayedAt) {
      const hour = new Date(entry.lastPlayedAt).getHours()
      if (hour >= 0 && hour < 4) midnightWatches++
    }
  }

  // uniqueGenres — collect genre_ids arrays from continueWatching items
  const genreSet = new Set()
  for (const entry of continueWatching) {
    const gids = Array.isArray(entry.genre_ids) ? entry.genre_ids : []
    gids.forEach((g) => genreSet.add(g))
  }
  const uniqueGenres = genreSet.size

  // reviewCount — keys that have both a rating and a note
  const reviewCount = Object.keys(ratings).filter(
    (k) => ratings[k] != null && notes[k] != null && String(notes[k]).trim().length > 0
  ).length

  // referralCount — stored separately in cs_referrals_{uid}
  const referralData = safeGet(`cs_referrals_${uid}`) || {}
  const referralCount = typeof referralData.count === 'number' ? referralData.count : 0

  // currentStreak — read from cs_streak (LoginStreak component writes this)
  const streakData = safeGet('cs_streak') || {}
  const currentStreak = typeof streakData.streak === 'number' ? streakData.streak : 0

  // watchlistCount
  const watchlistCount = watchlistItems.length

  return {
    totalWatched,
    maxEpisodesInDay,
    midnightWatches,
    uniqueGenres,
    reviewCount,
    referralCount,
    currentStreak,
    watchlistCount,
    isPremium: false, // caller overrides with actual value
  }
}

// ---------------------------------------------------------------------------
// Badge queries
// ---------------------------------------------------------------------------

/**
 * Returns only earned badge objects (with earned:true).
 * @param {string}  uid
 * @param {boolean} isPremium
 * @returns {Array<object>}
 */
export function getEarnedBadges(uid, isPremium = false) {
  const stats = { ...computeStats(uid), isPremium }
  return BADGE_DEFINITIONS.filter((b) => b.condition(stats)).map((b) => ({ ...b, earned: true }))
}

/**
 * Returns every badge with earned:true/false.
 * @param {string}  uid
 * @param {boolean} isPremium
 * @returns {Array<object>}
 */
export function getUnlockedBadges(uid, isPremium = false) {
  const stats = { ...computeStats(uid), isPremium }
  return BADGE_DEFINITIONS.map((b) => ({ ...b, earned: b.condition(stats) }))
}

// ---------------------------------------------------------------------------
// Seen / new badge management
// ---------------------------------------------------------------------------

function loadBadgeStore(uid) {
  const stored = safeGet(badgesKey(uid))
  return {
    seen: Array.isArray(stored?.seen) ? stored.seen : [],
  }
}

function saveBadgeStore(uid, store) {
  safeSet(badgesKey(uid), store)
}

/**
 * Marks the given badge IDs as seen (already displayed to user).
 * @param {string}   uid
 * @param {string[]} badgeIds
 */
export function saveBadgesSeen(uid, badgeIds) {
  const store = loadBadgeStore(uid)
  const nextSeen = [...new Set([...store.seen, ...badgeIds])]
  saveBadgeStore(uid, { ...store, seen: nextSeen })
}

/**
 * Returns badges that are earned but have NOT yet been shown to the user.
 * @param {string}  uid
 * @param {boolean} isPremium
 * @returns {Array<object>}
 */
export function getNewBadges(uid, isPremium = false) {
  const store = loadBadgeStore(uid)
  const earned = getEarnedBadges(uid, isPremium)
  return earned.filter((b) => !store.seen.includes(b.id))
}
