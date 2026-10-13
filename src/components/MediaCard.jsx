import React, { useState, useRef, useCallback } from 'react'
import { posterUrl, posterUrl as posterLg, formatRating, getYear } from '../lib/api.js'
import styles from './MediaCard.module.css'

// Extract dominant color from image via canvas (dynamic poster background)
function useColorExtract(posterSrc) {
  const [color, setColor] = useState(null)
  const extractRef = useRef(false)

  const onLoad = useCallback(e => {
    if (extractRef.current || !posterSrc) return
    extractRef.current = true
    try {
      const img = e.currentTarget
      const canvas = document.createElement('canvas')
      canvas.width = 4
      canvas.height = 6
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 4, 6)
      const data = ctx.getImageData(0, 0, 4, 6).data
      let r = 0, g = 0, b = 0
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i+1]; b += data[i+2] }
      const n = data.length / 4
      // Darken it significantly for subtle background use
      setColor(`rgba(${Math.round(r/n * 0.55)},${Math.round(g/n * 0.55)},${Math.round(b/n * 0.55)},0.45)`)
    } catch {}
  }, [posterSrc])

  return { color, onLoad }
}

// Watchlist helper (reads from localStorage without requiring a full lib import)
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
  return idx < 0 // true = added
}

export default function MediaCard({ item, type = 'movie', onClick, selected, uid }) {
  const mediaType = item.media_type || type
  const title     = mediaType === 'movie' ? item.title : item.name
  const date      = mediaType === 'movie' ? item.release_date : item.first_air_date
  const year      = getYear(date)
  const rating    = formatRating(item.vote_average)
  const poster    = posterUrl(item.poster_path)

  const [inWL, setInWL]       = useState(() => isWL(uid, item.id))
  const [hoverOpen, setHoverOpen] = useState(false)
  const hoverTimer = useRef(null)
  const { color, onLoad } = useColorExtract(poster)

  function handleWatchlist(e) {
    e.stopPropagation()
    const added = toggleWL(uid, item)
    setInWL(added)
  }

  function handleMouseEnter() {
    hoverTimer.current = setTimeout(() => setHoverOpen(true), 300)
  }

  function handleMouseLeave() {
    clearTimeout(hoverTimer.current)
    setHoverOpen(false)
  }

  return (
    <article
      className={`${styles.card} ${selected ? styles.selected : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={color ? { '--card-accent': color } : undefined}
    >
      {/* ── Main card face ─────────────────────────────────────────────── */}
      <button
        type="button"
        className={styles.cardOpen}
        onClick={() => onClick(item)}
        aria-label={`Watch ${title}`}
      >
        <div className={styles.poster} style={color ? { background: color } : undefined}>
          {poster
            ? <img src={poster} alt="" loading="lazy" crossOrigin="anonymous" onLoad={onLoad} />
            : <div className={styles.noPoster} aria-hidden="true">{title?.slice(0, 2)}</div>}
          <div className={styles.posterOverlay} aria-hidden="true">
            <span>▶</span>
            <small>{year || 'Explore'}</small>
          </div>
          {/* Pinned badge */}
          {item.featured && <span className={styles.pinnedBadge}>Featured</span>}
        </div>
        <div className={styles.info}>
          {rating && <span className={styles.rating}>★ {rating}</span>}
          <div className={styles.title}>{title}</div>
          {year && <div className={styles.year}>{year}</div>}
          {rating && <div className={styles.cardMeta}>{mediaType === 'tv' ? 'Series' : 'Movie'} · ★ {rating}</div>}
        </div>
      </button>

      {/* ── Watchlist ❤️ button ─────────────────────────────────────────── */}
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

      {/* ── Hover Preview Card ──────────────────────────────────────────── */}
      {hoverOpen && (
        <div
          className={styles.hoverCard}
          style={color ? { borderColor: color } : undefined}
          aria-hidden="true"
        >
          <div className={styles.hoverPoster} style={color ? { background: color } : undefined}>
            {poster
              ? <img src={poster} alt="" crossOrigin="anonymous" />
              : <div className={styles.hoverNoPoster}>{title?.slice(0, 2)}</div>}
          </div>
          <div className={styles.hoverInfo}>
            <div className={styles.hoverTitle}>{title}</div>
            <div className={styles.hoverMeta}>
              {year && <span>{year}</span>}
              {rating && <span className={styles.hoverRating}>★ {rating}</span>}
              <span className={styles.hoverType}>{mediaType === 'tv' ? 'TV Series' : 'Movie'}</span>
            </div>
            {item.overview && (
              <p className={styles.hoverOverview}>
                {item.overview.slice(0, 120)}{item.overview.length > 120 ? '…' : ''}
              </p>
            )}
            {item.genre_ids?.length > 0 && (
              <div className={styles.hoverGenres}>
                {item.genre_ids.slice(0, 3).map(gid => (
                  <span key={gid} className={styles.genreTag}>{GENRE_MAP[gid] || gid}</span>
                ))}
              </div>
            )}
            <div className={styles.hoverActions}>
              <span className={styles.hoverPlayBtn}>▶ Watch Now</span>
              <button
                type="button"
                className={`${styles.hoverWLBtn} ${inWL ? styles.hoverWLActive : ''}`}
                onClick={handleWatchlist}
              >
                {inWL ? '❤️ Saved' : '🤍 Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}
