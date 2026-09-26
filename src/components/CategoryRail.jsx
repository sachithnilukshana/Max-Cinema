import React, { useRef, useState } from 'react'
import MediaCard from './MediaCard.jsx'
import styles from './CategoryRail.module.css'

/**
 * Netflix-style horizontal scrollable rail.
 *
 * Props:
 *   title       – section heading (string)
 *   subtitle    – optional sub-heading (string)
 *   items       – array of normalised media items
 *   onSelect    – callback(item) when a card is clicked
 *   selectedId  – currently selected item id (highlights the card)
 *   top10       – if true, shows #1–#10 rank badges on the first 10 cards
 *   loading     – if true, renders skeleton cards instead of real content
 *   skeletonCount – how many skeleton cards to render while loading (default 8)
 */
export default function CategoryRail({
  title,
  subtitle,
  items = [],
  onSelect,
  selectedId,
  top10 = false,
  loading = false,
  skeletonCount = 8,
}) {
  const trackRef = useRef(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(true)

  function scroll(direction) {
    const track = trackRef.current
    if (!track) return
    const amount = track.clientWidth * 0.75
    track.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    setShowLeft(track.scrollLeft > 10)
    setShowRight(track.scrollLeft < track.scrollWidth - track.clientWidth - 10)
  }

  const hasContent = loading ? true : items.length > 0
  if (!hasContent && !loading) return null

  return (
    <section className={styles.rail} aria-label={title || 'Content rail'}>
      {(title || subtitle) && (
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      )}

      <div className={styles.trackWrap}>
        {/* Left chevron */}
        {showLeft && (
          <button
            type="button"
            className={`${styles.chevron} ${styles.chevronLeft}`}
            onClick={() => scroll('left')}
            aria-label="Scroll left"
          >
            ‹
          </button>
        )}

        {/* Scrollable track */}
        <div
          ref={trackRef}
          className={styles.track}
          onScroll={handleScroll}
        >
          {loading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <div key={i} className={styles.skeleton} aria-hidden="true" />
              ))
            : items.map((item, i) => (
                <div key={item.id ?? i} className={styles.cardWrap}>
                  {top10 && i < 10 && (
                    <span className={styles.rankBadge}>{i + 1}</span>
                  )}
                  <MediaCard
                    item={item}
                    type={item.media_type || 'movie'}
                    onClick={() => onSelect?.(item)}
                    selected={selectedId !== undefined && (item.id === selectedId || item.tmdbId === selectedId)}
                  />
                </div>
              ))
          }
        </div>

        {/* Right chevron */}
        {showRight && items.length > 3 && (
          <button
            type="button"
            className={`${styles.chevron} ${styles.chevronRight}`}
            onClick={() => scroll('right')}
            aria-label="Scroll right"
          >
            ›
          </button>
        )}
      </div>
    </section>
  )
}
