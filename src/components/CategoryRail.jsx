import React, { useRef } from 'react'
import MediaCard from './MediaCard.jsx'
import styles from './CategoryRail.module.css'

export default function CategoryRail({
  title,
  subtitle,
  items = [],
  type = 'movie',
  top10 = false,
  onSelect,
  selectedId,
  loading = false,
}) {
  const scrollRef = useRef(null)

  function scroll(direction) {
    if (!scrollRef.current) return
    const offset = direction === 'left' ? -550 : 550
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  const displayItems = top10 ? items.slice(0, 10) : items

  return (
    <section className={styles.railWrap} aria-label={title}>
      <div className={styles.railHeader}>
        <div>
          <div className={styles.titleRow}>
            {top10 && <span className={styles.top10Badge}>TOP 10</span>}
            <h2 className={styles.title}>{title}</h2>
          </div>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        <div className={styles.controls}>
          <button
            type="button"
            className={styles.scrollBtn}
            onClick={() => scroll('left')}
            aria-label={`Scroll ${title} left`}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.scrollBtn}
            onClick={() => scroll('right')}
            aria-label={`Scroll ${title} right`}
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.railTrack} ref={scrollRef}>
        {loading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonPoster} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonSub} />
            </div>
          ))
        ) : (
          displayItems.map((item, index) => (
            <div
              key={`${item.media_type || type}:${item.id}:${index}`}
              className={styles.cardItem}
            >
              <MediaCard
                item={item}
                type={type}
                rank={top10 ? index + 1 : undefined}
                onClick={onSelect}
                selected={item.id === selectedId}
              />
            </div>
          ))
        )}
      </div>
    </section>
  )
}
