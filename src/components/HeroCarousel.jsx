import React, { useState, useEffect, useRef } from 'react'
import { formatRating, getYear } from '../lib/api.js'
import { getActiveProfile, isFavorite, toggleFavorite } from '../lib/profile.js'
import TrailerModal from './TrailerModal.jsx'
import styles from './HeroCarousel.module.css'

export default function HeroCarousel({ items = [], onSelect }) {
  const [profile] = useState(getActiveProfile)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const timerRef = useRef(null)

  const featured = items.slice(0, 5)
  const current = featured[currentIndex] || featured[0]

  useEffect(() => {
    if (!current) return
    setFavorite(isFavorite(profile.id, current))
    const handleLibChange = () => setFavorite(isFavorite(profile.id, current))
    window.addEventListener('Max Cinema:librarychange', handleLibChange)
    return () => window.removeEventListener('Max Cinema:librarychange', handleLibChange)
  }, [profile.id, current])

  // Auto-advance every 7 seconds
  useEffect(() => {
    if (featured.length <= 1 || isPaused) return undefined

    timerRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % featured.length)
    }, 7000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [featured.length, isPaused])

  if (!current) return null

  const title = current.title || current.name
  const year = getYear(current.release_date || current.first_air_date)
  const rating = formatRating(current.vote_average)
  const mediaType = current.media_type || (current.name ? 'tv' : 'movie')

  let backdrop = current.backdrop_path
  if (backdrop && !backdrop.startsWith('http://') && !backdrop.startsWith('https://')) {
    backdrop = `https://image.tmdb.org/t/p/w1280${backdrop}`
  }

  function handlePrev() {
    setCurrentIndex(prev => (prev - 1 + featured.length) % featured.length)
  }

  function handleNext() {
    setCurrentIndex(prev => (prev + 1) % featured.length)
  }

  function handleFavoriteToggle(e) {
    e.stopPropagation()
    toggleFavorite(profile.id, current)
    setFavorite(prev => !prev)
  }

  return (
    <>
      <section
        className={styles.carousel}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-label="Featured titles carousel"
      >
        {/* Background images with crossfade */}
        {featured.map((item, index) => {
          let bg = item.backdrop_path
          if (bg && !bg.startsWith('http://') && !bg.startsWith('https://')) {
            bg = `https://image.tmdb.org/t/p/w1280${bg}`
          }
          return (
            <div
              key={item.id}
              className={`${styles.backdropSlide} ${index === currentIndex ? styles.activeSlide : ''}`}
              style={bg ? { backgroundImage: `url(${bg})` } : undefined}
            />
          )
        })}

        <div className={styles.overlayGradient} />

        {/* Hero Content */}
        <div className={styles.contentWrap}>
          <div className={styles.eyebrow}>
            <span className={styles.spotlightTag}>Featured Spotlight</span>
            {rating && <span className={styles.goldRating}>★ {rating}</span>}
            {year && <span className={styles.pill}>{year}</span>}
          </div>

          <h1 className={styles.title}>{title}</h1>

          <p className={styles.overview}>
            {current.overview || 'A standout cinematic pick on Max Cinema.'}
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.playButton}
              onClick={() => onSelect?.(current)}
            >
              ▶ Play Now
            </button>
            <button
              type="button"
              className={styles.trailerButton}
              onClick={() => setShowTrailer(true)}
            >
              🎬 Watch Trailer
            </button>
            <button
              type="button"
              className={`${styles.favButton} ${favorite ? styles.activeFav : ''}`}
              onClick={handleFavoriteToggle}
              title={favorite ? 'Saved in favorites' : 'Add to favorites'}
            >
              {favorite ? '★ In Favorites' : '☆ Add to List'}
            </button>
          </div>
        </div>

        {/* Carousel Chevrons */}
        {featured.length > 1 && (
          <>
            <button
              type="button"
              className={`${styles.navArrow} ${styles.prevArrow}`}
              onClick={handlePrev}
              aria-label="Previous featured title"
            >
              ‹
            </button>
            <button
              type="button"
              className={`${styles.navArrow} ${styles.nextArrow}`}
              onClick={handleNext}
              aria-label="Next featured title"
            >
              ›
            </button>
          </>
        )}

        {/* Carousel Dots */}
        {featured.length > 1 && (
          <div className={styles.dots}>
            {featured.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`Go to slide ${index + 1}: ${item.title || item.name}`}
              />
            ))}
          </div>
        )}
      </section>

      {showTrailer && (
        <TrailerModal
          title={title}
          id={current.id}
          mediaType={mediaType}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </>
  )
}
