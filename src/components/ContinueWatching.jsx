import React, { useEffect, useState } from 'react'
import { loadLibrary } from '../lib/profile.js'
import { posterUrl } from '../lib/api.js'
import styles from './ContinueWatching.module.css'

export default function ContinueWatching({ profile, onSelect, mediaType }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    const refresh = event => {
      if (!event || event.detail?.profileId === profile.id) setItems(loadLibrary(profile.id).continueWatching)
    }
    refresh()
    window.addEventListener('Max Cinema:librarychange', refresh)
    return () => window.removeEventListener('Max Cinema:librarychange', refresh)
  }, [profile.id])

  const visibleItems = mediaType ? items.filter(item => item.media_type === mediaType) : items

  if (!visibleItems.length) return null

  return (
    <section className={styles.wrap} aria-label="Continue watching">
      <div className={styles.heading}>
        <p>Continue watching</p>
        <span>{visibleItems.length} recently opened</span>
      </div>
      <div className={styles.row}>
        {visibleItems.map(item => {
          const title = item.title || item.name
          return (
            <button key={`${item.media_type}:${item.id}:${item.season || ''}:${item.episode || ''}`} type="button" className={styles.card} onClick={() => onSelect(item)}>
              {item.poster_path ? <img src={posterUrl(item.poster_path)} alt="" loading="lazy" /> : <div className={styles.noPoster} />}
              <span>{title}</span>
              {item.season && <small>S{item.season} · E{item.episode}</small>}
              <div className={styles.progress} aria-label={`${item.progress || 12}% watched`}>
                <i style={{ width: `${Math.max(4, Math.min(100, item.progress || 12))}%` }} />
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
