import React, { useEffect, useState, useCallback, useRef } from 'react'
import { posterUrl } from '../lib/api.js'
import styles from './HeroCarousel.module.css'

const FAV_KEY = 'cs_favorites'
function getFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] } }
function isFav(item) { if (!item) return false; const id = item.tmdbId || item.id; return getFavs().includes(String(id)) }
function toggleFav(item) {
  if (!item) return
  const id = String(item.tmdbId || item.id)
  const favs = getFavs()
  const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]
  localStorage.setItem(FAV_KEY, JSON.stringify(next))
}

const INTERVAL_MS = 7000

/**
 * HeroCarousel — auto-rotating full-width hero banner.
 *
 * Props:
 *   items      – array of normalised media items (top 5 used)
 *   onPlay     – callback(item) to open the player
 *   onTrailer  – callback(item) to open the trailer modal
 *   onSelect   – callback(item) to open the title details panel
 */
export default function HeroCarousel({ items = [], onPlay, onTrailer, onSelect }) {
  const [index, setIndex] = useState(0)
  const [fav, setFav] = useState(false)
  const timerRef = useRef(null)

  const slides = items.slice(0, 5)

  const goTo = useCallback((i) => {
    setIndex(i)
    setFav(isFav(slides[i]))
  }, [slides])

  const next = useCallback(() => {
    if (!slides.length) return
    goTo((index + 1) % slides.length)
  }, [index, slides, goTo])

  const prev = useCallback(() => {
    if (!slides.length) return
    goTo((index - 1 + slides.length) % slides.length)
  }, [index, slides, goTo])

  // Auto-rotate
  useEffect(() => {
    if (slides.length < 2) return
    timerRef.current = setInterval(next, INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [next, slides.length])

  // Pause on hover
  const pause = () => clearInterval(timerRef.current)
  const resume = () => {
    if (slides.length < 2) return
    timerRef.current = setInterval(next, INTERVAL_MS)
  }

  // Update fav state when slide changes
  useEffect(() => {
    if (slides[index]) setFav(isFav(slides[index]))
  }, [index, slides])

  if (!slides.length) return null

  const current = slides[index]
  const backdrop = current.backdrop_path
    ? `https://image.tmdb.org/t/p/w1280${current.backdrop_path}`
    : (current.backdropUrl || null)
  const poster = current.poster_path
    ? posterUrl(current.poster_path)
    : (current.posterUrl || null)
  const title = current.title || current.name || 'Untitled'
  const overview = current.overview || current.description || ''
  const rating = current.vote_average ? current.vote_average.toFixed(1) : null
  const year = (current.release_date || current.first_air_date || '').slice(0, 4)
  const isTV = current.media_type === 'tv'

  function handleFav() {
    toggleFav(current)
    setFav(isFav(current))
  }

  return (
    <section
      className={styles.hero}
      aria-label="Featured content"
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {/* Backdrop */}
      <div className={styles.backdrop}>
        {backdrop
          ? <img src={backdrop} alt="" className={styles.backdropImg} loading="eager" />
          : <div className={styles.backdropFallback} />
        }
        <div className={styles.backdropGrad} />
      </div>

      {/* Content */}
      <div className={styles.content}>
        {poster && (
          <img src={poster} alt="" className={styles.poster} loading="eager" />
        )}

        <div className={styles.meta}>
          <div className={styles.badges}>
            {isTV && <span className={styles.badge}>Series</span>}
            {rating && <span className={styles.badgeGold}>★ {rating}</span>}
            {year && <span className={styles.badge}>{year}</span>}
          </div>

          <h1 className={styles.title}>{title}</h1>

          {overview && (
            <p className={styles.overview}>{overview.slice(0, 180)}{overview.length > 180 ? '…' : ''}</p>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.btnPlay} onClick={() => onPlay?.(current)}>
              ▶ Watch Now
            </button>
            {onTrailer && (
              <button type="button" className={styles.btnTrailer} onClick={() => onTrailer?.(current)}>
                ▷ Trailer
              </button>
            )}
            <button
              type="button"
              className={`${styles.btnFav} ${fav ? styles.favActive : ''}`}
              onClick={handleFav}
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
            >
              {fav ? '★' : '☆'}
            </button>
            <button type="button" className={styles.btnInfo} onClick={() => onSelect?.(current)}>
              ⓘ More Info
            </button>
          </div>
        </div>
      </div>

      {/* Prev / Next chevrons */}
      {slides.length > 1 && (
        <>
          <button type="button" className={`${styles.nav} ${styles.navPrev}`} onClick={prev} aria-label="Previous">‹</button>
          <button type="button" className={`${styles.nav} ${styles.navNext}`} onClick={next} aria-label="Next">›</button>
        </>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className={styles.dots} role="tablist" aria-label="Slide indicators">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
