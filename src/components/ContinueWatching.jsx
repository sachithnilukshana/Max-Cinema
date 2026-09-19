import React, { useEffect, useState } from 'react'
import { loadLibrary, removeFromContinueWatching, clearContinueWatching } from '../lib/profile.js'
import { posterUrl } from '../lib/api.js'
import styles from './ContinueWatching.module.css'

export default function ContinueWatching({ profile, onSelect, mediaType }) {
  const [items, setItems] = useState([])

  const refresh = () => {
    setItems(loadLibrary(profile.id).continueWatching || [])
  }

  useEffect(() => {
    refresh()
    window.addEventListener('Max Cinema:librarychange', refresh)
    return () => window.removeEventListener('Max Cinema:librarychange', refresh)
  }, [profile.id])

  const visibleItems = mediaType
    ? items.filter(item => (item.media_type || (item.name ? 'tv' : 'movie')) === mediaType)
    : items

  if (!visibleItems.length) return null

  function handleRemove(item, event) {
    event.stopPropagation()
    removeFromContinueWatching(profile.id, item)
    refresh()
  }

  function handleClear() {
    clearContinueWatching(profile.id, mediaType)
    refresh()
  }

  return (
    <section className={styles.wrap} aria-label="Continue watching">
      <div className={styles.heading}>
        <div className={styles.titleGroup}>
          <p>Continue watching</p>
          <span>{visibleItems.length} recently opened</span>
        </div>
        <button type="button" className={styles.clearBtn} onClick={handleClear} title="Clear recently watched">
          Clear
        </button>
      </div>
      <div className={styles.row}>
        {visibleItems.map(item => {
          const title = item.title || item.name || 'Untitled'
          return (
            <div
              key={`${item.media_type}:${item.id}:${item.season || ''}:${item.episode || ''}`}
              className={styles.card}
              onClick={() => onSelect(item)}
            >
              <div className={styles.posterBox}>
                {item.poster_path ? (
                  <img src={posterUrl(item.poster_path)} alt="" loading="lazy" />
                ) : (
                  <div className={styles.noPoster}>{title.slice(0, 2)}</div>
                )}
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={(e) => handleRemove(item, e)}
                  aria-label={`Remove ${title} from continue watching`}
                  title="Remove"
                >
                  ✕
                </button>
                <div className={styles.overlay}>
                  <span>▶</span>
                </div>
              </div>
              <span className={styles.cardTitle} title={title}>{title}</span>
              {item.season && <small className={styles.badge}>S{item.season} · E{item.episode}</small>}
              <div className={styles.progress} aria-label={`${item.progress || 12}% watched`}>
                <i style={{ width: `${Math.max(4, Math.min(100, item.progress || 12))}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
