import React, { useEffect, useState, useMemo } from 'react'
import { getWatchlist } from '../lib/watchlist.js'
import { loadLibrary } from '../lib/profile.js'
import { posterUrl } from '../lib/api.js'
import BadgesDisplay from '../components/BadgesDisplay.jsx'
import LoginStreak from '../components/LoginStreak.jsx'
import styles from './Stats.module.css'

// ── TMDB genre map ────────────────────────────────────────────────────────────
const GENRE_MAP = {
  28: 'Action',
  35: 'Comedy',
  18: 'Drama',
  27: 'Horror',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  16: 'Animation',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive stats from the watch history (continueWatching) array */
function computeStats(history, watchlistItems) {
  const movies = history.filter((i) => (i.media_type || (i.name ? 'tv' : 'movie')) === 'movie')
  const episodes = history.filter((i) => (i.media_type || (i.name ? 'tv' : 'movie')) === 'tv')

  // Favourite genre from genre_ids stored on history items
  const genreCounts = {}
  history.forEach((item) => {
    if (Array.isArray(item.genre_ids)) {
      item.genre_ids.forEach((gid) => {
        if (GENRE_MAP[gid]) genreCounts[gid] = (genreCounts[gid] || 0) + 1
      })
    }
  })
  let favouriteGenre = '—'
  if (Object.keys(genreCounts).length > 0) {
    const topId = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0][0]
    favouriteGenre = GENRE_MAP[topId] || '—'
  }

  // Most active day of week
  const dayCounts = Array(7).fill(0)
  history.forEach((item) => {
    if (item.lastPlayedAt) {
      try {
        const d = new Date(item.lastPlayedAt).getDay()
        if (d >= 0 && d <= 6) dayCounts[d]++
      } catch {}
    }
  })
  const maxDayIdx = dayCounts.indexOf(Math.max(...dayCounts))
  const mostActiveDay = dayCounts[maxDayIdx] > 0 ? DAYS[maxDayIdx] : '—'

  // Watch streak (consecutive calendar days with at least one play, counting back from today)
  const playDays = new Set(
    history
      .filter((i) => i.lastPlayedAt)
      .map((i) => {
        try {
          return new Date(i.lastPlayedAt).toISOString().slice(0, 10)
        } catch {
          return null
        }
      })
      .filter(Boolean),
  )
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
    if (playDays.has(ds)) {
      streak++
    } else if (i > 0) {
      break // streak broken
    }
  }

  // Last 5 watched (sorted by lastPlayedAt desc)
  const recentItems = [...history]
    .filter((i) => i.lastPlayedAt)
    .sort((a, b) => new Date(b.lastPlayedAt) - new Date(a.lastPlayedAt))
    .slice(0, 5)

  return {
    totalMovies: movies.length,
    totalEpisodes: episodes.length,
    totalWatchlist: watchlistItems.length,
    favouriteGenre,
    mostActiveDay,
    streak,
    recentItems,
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Personal stats page.
 * @param {{ profile: object, user: object }} props
 */
export default function Stats({ profile, user }) {
  const uid = user?.uid || profile?.id || 'guest'
  const profileId = profile?.id || uid

  const [history, setHistory] = useState([])
  const [watchlistItems, setWatchlistItems] = useState([])

  function loadData() {
    const lib = loadLibrary(profileId)
    setHistory(lib.continueWatching || [])
    setWatchlistItems(getWatchlist(uid))
  }

  useEffect(() => {
    loadData()
    window.addEventListener('Max Cinema:librarychange', loadData)
    window.addEventListener('Max Cinema:watchlistchange', loadData)
    return () => {
      window.removeEventListener('Max Cinema:librarychange', loadData)
      window.removeEventListener('Max Cinema:watchlistchange', loadData)
    }
  }, [uid, profileId])

  const stats = useMemo(
    () => computeStats(history, watchlistItems),
    [history, watchlistItems],
  )

  const displayName = profile?.name || user?.displayName || user?.email || 'You'

  return (
    <div className={styles.wrap}>
      {/* ── Page header ──────────────────────────────────── */}
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Your Stats</h1>
        <p className={styles.subtitle}>
          A look at {displayName}&apos;s viewing journey on Max Cinema
        </p>
      </div>

      {/* ── Stat cards grid ──────────────────────────────── */}
      <div className={styles.statsGrid}>
        <StatCard
          icon="🎬"
          value={stats.totalMovies}
          label="Movies Watched"
          accent="gold"
        />
        <StatCard
          icon="📺"
          value={stats.totalEpisodes}
          label="TV Episodes"
          accent="blue"
        />
        <StatCard
          icon="🔖"
          value={stats.totalWatchlist}
          label="In Watchlist"
          accent="purple"
        />
        <StatCard
          icon="🎭"
          value={stats.favouriteGenre}
          label="Fav. Genre"
          accent="green"
          isText
        />
        <StatCard
          icon="📅"
          value={stats.mostActiveDay}
          label="Most Active Day"
          accent="orange"
          isText
        />
        <StatCard
          icon="🔥"
          value={stats.streak > 0 ? `${stats.streak}d` : '—'}
          label="Watch Streak"
          accent="red"
          isText={stats.streak === 0}
        />
      </div>

      {/* ── Recently Active section ───────────────────────── */}
      {stats.recentItems.length > 0 && (
        <section className={styles.recentSection}>
          <h2 className={styles.sectionTitle}>Recently Active</h2>
          <div className={styles.recentGrid}>
            {stats.recentItems.map((item) => (
              <RecentItem key={`${item.media_type || 'movie'}:${item.id}:${item.lastPlayedAt}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── Badges & Achievements Section ────────────────── */}
      <section style={{ marginTop: '36px' }}>
        <BadgesDisplay uid={uid} isPremium={user?.isPremium} />
      </section>

      {/* ── Empty hint ───────────────────────────────────── */}
      {history.length === 0 && watchlistItems.length === 0 && (
        <div className={styles.emptyHint}>
          <span className={styles.emptyIcon}>📊</span>
          <p>Start watching movies and shows to see your stats here!</p>
        </div>
      )}
    </div>
  )
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label, accent = 'gold', isText = false }) {
  return (
    <div className={`${styles.statCard} ${styles[`accent_${accent}`]}`}>
      <div className={styles.statIcon} aria-hidden="true">{icon}</div>
      <div className={`${styles.statValue} ${isText ? styles.statValueText : ''}`}>
        {value ?? '—'}
      </div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}

// ── RecentItem ────────────────────────────────────────────────────────────────

function RecentItem({ item }) {
  const mediaType = item.media_type || (item.name ? 'tv' : 'movie')
  const title = item.title || item.name || 'Untitled'
  const poster = posterUrl(item.poster_path)

  function formatTimeAgo(iso) {
    if (!iso) return ''
    try {
      const diffMs = Date.now() - new Date(iso).getTime()
      const mins = Math.floor(diffMs / 60000)
      if (mins < 1) return 'Just now'
      if (mins < 60) return `${mins}m ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs}h ago`
      const days = Math.floor(hrs / 24)
      if (days < 7) return `${days}d ago`
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <div className={styles.recentCard}>
      <div className={styles.recentPosterWrap}>
        {poster ? (
          <img src={poster} alt="" loading="lazy" className={styles.recentPoster} />
        ) : (
          <div className={styles.recentNoPoster} aria-hidden="true">
            {title.slice(0, 2)}
          </div>
        )}
        <span className={styles.recentTypeBadge}>{mediaType === 'tv' ? 'TV' : 'Film'}</span>
      </div>
      <div className={styles.recentInfo}>
        <div className={styles.recentTitle} title={title}>{title}</div>
        {item.season && item.episode && (
          <div className={styles.recentEp}>S{item.season} · E{item.episode}</div>
        )}
        <div className={styles.recentTime}>{formatTimeAgo(item.lastPlayedAt)}</div>
      </div>
    </div>
  )
}
