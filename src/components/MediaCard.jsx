import React, { useState } from 'react'
import { posterUrl, posterSrcSet, formatRating, getYear } from '../lib/api.js'
import styles from './MediaCard.module.css'

// Watchlist storage helper
function getWatchlistKey(uid) { return `cs_watchlist_${uid || 'guest'}` }
function readWL(uid) {
  try { return JSON.parse(localStorage.getItem(getWatchlistKey(uid)) || '[]') } catch { return [] }
}
function isWL(uid, id) { return readWL(uid).some(i => String(i.id) === String(id)) }
function toggleWL(uid, item) {
  const key = getWatchlistKey(uid)
  const list = readWL(uid)
  const idx = list.findIndex(i => String(i.id) === String(item.id))
  if (idx >= 0) list.splice(idx, 1)
  else list.unshift({ ...item, savedAt: Date.now() })
  try {
    localStorage.setItem(key, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent('Max Cinema:watchlistchange', { detail: { uid } }))
  } catch {}
  return idx < 0
}

export default function MediaCard({ item, type = 'movie', onClick, selected, uid }) {
  const mediaType = item.media_type || type
  const title     = mediaType === 'movie' ? item.title : item.name
  const date      = mediaType === 'movie' ? item.release_date : item.first_air_date
  const year      = getYear(date)
  const rating    = formatRating(item.vote_average)
  const poster    = posterUrl(item.poster_path)
  const srcSet    = posterSrcSet(item.poster_path)

  const [inWL, setInWL] = useState(() => isWL(uid, item.id))
  const [loaded, setLoaded] = useState(false)

  function handleWatchlist(e) {
    e.stopPropagation()
    const added = toggleWL(uid, item)
    setInWL(added)
  }

  return (
    <article
      className={`${styles.card} ${selected ? styles.selected : ''}`}
    >
      {/* ── Watchlist ❤️ button (floats in top-right of poster) ── */}
      <button
        type="button"
        className={`${styles.heartBtn} ${inWL ? styles.heartActive : ''}`}
        onClick={handleWatchlist}
        aria-label={inWL ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
        aria-pressed={inWL}
        title={inWL ? 'Remove from Watchlist' : 'Add to Watchlist'}
      >
        {inWL ? '❤️' : '🤍'}
      </button>

      {/* ── Main card face ── */}
      <button
        type="button"
        className={styles.cardOpen}
        onClick={() => onClick(item)}
        aria-label={`Watch ${title}`}
      >
        <div className={styles.poster}>
          {poster
            ? (
              <img
                src={poster}
                srcSet={srcSet}
                sizes="(max-width: 600px) 140px, 185px"
                alt=""
                loading="lazy"
                decoding="async"
                draggable="false"
                onLoad={() => setLoaded(true)}
                className={`${styles.posterImg} ${loaded ? styles.loaded : ''}`}
              />
            )
            : <div className={styles.noPoster} aria-hidden="true">{title?.slice(0, 2)}</div>}
          <div className={styles.posterOverlay} aria-hidden="true">
            <span>▶</span>
            <small>{year || 'Explore'}</small>
          </div>
          {item.featured && <span className={styles.pinnedBadge}>Featured</span>}
        </div>
        <div className={styles.info}>
          {rating && <span className={styles.rating}>★ {rating}</span>}
          <div className={styles.title}>{title}</div>
          {year && <div className={styles.year}>{year}</div>}
          {rating && <div className={styles.cardMeta}>{mediaType === 'tv' ? 'Series' : 'Movie'} · ★ {rating}</div>}
        </div>
      </button>
    </article>
  )
}
