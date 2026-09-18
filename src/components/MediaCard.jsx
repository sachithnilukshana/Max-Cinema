import React from 'react'
import { posterUrl, formatRating, getYear } from '../lib/api.js'
import styles from './MediaCard.module.css'

export default function MediaCard({ item, type = 'movie', onClick, selected, pinned, watched, onToggleWatched, onRemove, onAddToWatchlist }) {
  const mediaType = item.media_type || type
  const title = mediaType === 'movie' ? item.title : item.name
  const date = mediaType === 'movie' ? item.release_date : item.first_air_date
  const year = getYear(date)
  const rating = formatRating(item.vote_average)
  const poster = posterUrl(item.poster_path)

  return (
    <article className={`${styles.card} ${selected ? styles.selected : ''}`}>
      <button type="button" className={styles.cardOpen} onClick={() => onClick(item)} aria-label={`Open ${title}`}>
        <div className={styles.poster}>
          {poster
            ? <img src={poster} alt="" loading="lazy" />
            : <div className={styles.noPoster} aria-hidden="true">{title?.slice(0, 2)}</div>}
          {pinned && <span className={styles.pinnedBadge}>Pinned</span>}
          <div className={styles.posterOverlay} aria-hidden="true"><span>▶</span><small>{year || 'Explore'}</small></div>
        </div>
        <div className={styles.info}>
          {rating && <span className={styles.rating}>★ {rating}</span>}
          <div className={styles.title}>{title}</div>
          {year && <div className={styles.year}>{year}</div>}
          {rating && <div className={styles.cardMeta}>{mediaType === 'tv' ? 'Series' : 'Movie'} · ★ {rating}</div>}
        </div>
      </button>
      {onToggleWatched && (
        <div className={styles.actions}>
          <button type="button" className={styles.watchStatus} aria-pressed={watched} onClick={() => onToggleWatched(item)}>
            {watched ? 'Watched' : 'Need watch'}
          </button>
          <button type="button" className={styles.remove} aria-label={`Remove ${title} from Need Watch`} onClick={() => onRemove(item)}>×</button>
        </div>
      )}
      {onAddToWatchlist && <button type="button" className={styles.addToList} onClick={() => onAddToWatchlist(item)}>+ Need Watch</button>}
    </article>
  )
}
