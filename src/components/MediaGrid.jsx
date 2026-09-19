import React from 'react'
import MediaCard from './MediaCard.jsx'
import styles from './MediaGrid.module.css'

export default function MediaGrid({ items, type, onSelect, selectedId, loading, emptyAction, emptyActionLabel = 'Browse titles' }) {
  if (loading) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={styles.skeleton}>
            <div className={styles.skeletonPoster} />
            <div className={styles.skeletonLine} />
            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
          </div>
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <div className={styles.empty}>
        <span aria-hidden="true">✦</span>
        <p>No titles found here yet.</p>
        <small>Your next great watch is one search away.</small>
        {emptyAction && <button type="button" onClick={emptyAction}>{emptyActionLabel}</button>}
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {items.map(item => (
        <MediaCard
          key={`${item.media_type || type}:${item.id}`}
          item={item}
          type={type}
          onClick={onSelect}
          selected={item.id === selectedId}
        />
      ))}
    </div>
  )
}
