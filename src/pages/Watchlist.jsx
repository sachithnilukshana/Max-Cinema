import React, { useEffect, useState, useCallback } from 'react'
import { getWatchlist, removeFromWatchlist } from '../lib/watchlist.js'
import { posterUrl, formatRating, getYear } from '../lib/api.js'
import styles from './Watchlist.module.css'

// ── Sorting helpers ───────────────────────────────────────────────────────────

function sortItems(items, sort) {
  const copy = [...items]
  if (sort === 'az') {
    copy.sort((a, b) => {
      const ta = (a.title || a.name || '').toLowerCase()
      const tb = (b.title || b.name || '').toLowerCase()
      return ta.localeCompare(tb)
    })
  } else if (sort === 'rating') {
    copy.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0))
  } else {
    // recently added (default) — savedAt desc
    copy.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
  }
  return copy
}

// ── Main Component ────────────────────────────────────────────────────────────

/**
 * Watchlist page.
 * @param {{ profile: object, onBrowse: () => void, onSelect: (item: object) => void }} props
 */
export default function Watchlist({ profile, onBrowse, onSelect }) {
  const uid = profile?.id || profile?.uid || 'guest'

  const [items, setItems] = useState([])
  const [tab, setTab] = useState('all')     // 'all' | 'movie' | 'tv'
  const [sort, setSort] = useState('recent') // 'recent' | 'az' | 'rating'

  const load = useCallback(() => {
    setItems(getWatchlist(uid))
  }, [uid])

  useEffect(() => {
    load()
    window.addEventListener('Max Cinema:watchlistchange', load)
    return () => window.removeEventListener('Max Cinema:watchlistchange', load)
  }, [load])

  function handleRemove(item, e) {
    e.stopPropagation()
    removeFromWatchlist(uid, item)
    // state is updated via the event listener above
  }

  // Apply tab filter then sort
  const filtered = sortItems(
    items.filter((item) => {
      if (tab === 'all') return true
      return (item.media_type || 'movie') === tab
    }),
    sort,
  )

  const movieCount = items.filter((i) => (i.media_type || 'movie') === 'movie').length
  const tvCount = items.filter((i) => (i.media_type || 'movie') === 'tv').length

  return (
    <div className={styles.wrap}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>My Watchlist</h1>
          <p className={styles.subtitle}>
            {items.length > 0
              ? `${items.length} title${items.length === 1 ? '' : 's'} saved`
              : 'Save titles to watch later'}
          </p>
        </div>
      </div>

      {/* ── Tabs + Sort (only when there are items) ───────────── */}
      {items.length > 0 && (
        <div className={styles.controls}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${tab === 'all' ? styles.activeTab : ''}`}
              onClick={() => setTab('all')}
            >
              All <span className={styles.badge}>{items.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${tab === 'movie' ? styles.activeTab : ''}`}
              onClick={() => setTab('movie')}
            >
              Movies <span className={styles.badge}>{movieCount}</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${tab === 'tv' ? styles.activeTab : ''}`}
              onClick={() => setTab('tv')}
            >
              TV Series <span className={styles.badge}>{tvCount}</span>
            </button>
          </div>

          <div className={styles.sortWrap}>
            <label htmlFor="wl-sort" className={styles.sortLabel}>Sort:</label>
            <select
              id="wl-sort"
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Recently Added</option>
              <option value="az">A – Z</option>
              <option value="rating">Rating</option>
            </select>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <EmptyState tab={tab} onBrowse={onBrowse} />
      ) : (
        <div className={styles.grid}>
          {filtered.map((item) => (
            <WatchlistCard
              key={`${item.media_type || 'movie'}:${item.id}`}
              item={item}
              onSelect={onSelect}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── WatchlistCard ─────────────────────────────────────────────────────────────

function WatchlistCard({ item, onSelect, onRemove }) {
  const mediaType = item.media_type || 'movie'
  const title = item.title || item.name || 'Untitled'
  const date = mediaType === 'movie' ? item.release_date : item.first_air_date
  const year = getYear(date)
  const rating = formatRating(item.vote_average)
  const poster = posterUrl(item.poster_path)

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.posterBtn}
        onClick={() => onSelect && onSelect(item)}
        aria-label={`Watch ${title}`}
      >
        <div className={styles.posterWrap}>
          {poster ? (
            <img src={poster} alt="" loading="lazy" className={styles.poster} />
          ) : (
            <div className={styles.noPoster} aria-hidden="true">
              {title.slice(0, 2)}
            </div>
          )}
          <div className={styles.overlay} aria-hidden="true">
            <span className={styles.playIcon}>▶</span>
          </div>
          {rating && <span className={styles.ratingBadge}>★ {rating}</span>}
          <span className={styles.typeBadge}>{mediaType === 'tv' ? 'Series' : 'Movie'}</span>
        </div>
      </button>

      {/* Remove (heart) button */}
      <button
        type="button"
        className={styles.removeBtn}
        onClick={(e) => onRemove(item, e)}
        aria-label={`Remove ${title} from watchlist`}
        title="Remove from watchlist"
      >
        ❤️
      </button>

      <div className={styles.info}>
        <div className={styles.cardTitle} title={title}>{title}</div>
        <div className={styles.cardMeta}>
          {year && <span>{year}</span>}
          {rating && <span>· ★ {rating}</span>}
        </div>
      </div>
    </article>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ tab, onBrowse }) {
  const msgs = {
    all: { icon: '🎬', heading: 'Your watchlist is empty', body: 'Browse movies and TV shows, then tap the bookmark icon to save them here for later.' },
    movie: { icon: '🎥', heading: 'No movies saved yet', body: 'Browse the movie catalogue and add titles to your watchlist.' },
    tv: { icon: '📺', heading: 'No TV series saved yet', body: 'Browse TV shows and add series you want to watch.' },
  }
  const { icon, heading, body } = msgs[tab] || msgs.all
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{icon}</span>
      <h2>{heading}</h2>
      <p>{body}</p>
      {onBrowse && (
        <button type="button" className={styles.browseBtn} onClick={onBrowse}>
          Browse Movies &amp; Shows
        </button>
      )}
    </div>
  )
}
