import React, { useEffect, useRef, useState } from 'react'
import styles from './Player.module.css'

export default function Player({ src, title, year, rating, overview, badge, onClose, onNextEpisode }) {
  const playerBoxRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const updateFullscreenState = () => {
      setIsFullscreen(document.fullscreenElement === playerBoxRef.current)
    }

    document.addEventListener('fullscreenchange', updateFullscreenState)
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState)
  }, [])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === playerBoxRef.current) {
        await document.exitFullscreen()
      } else {
        await playerBoxRef.current?.requestFullscreen()
      }
    } catch (error) {
      // Browsers can reject fullscreen requests when the feature is disabled.
      console.error('Unable to toggle fullscreen mode.', error)
    }
  }

  if (!src) return null

  async function closePlayer() {
    if (document.fullscreenElement === playerBoxRef.current) {
      try { await document.exitFullscreen() } catch {}
    }
    onClose?.()
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.meta}>
        <div className={styles.metaTop}>
          <h2 className={styles.title}>{title}</h2>
          {onClose && (
            <button className={styles.closeBtn} onClick={closePlayer} aria-label="Close player">✕</button>
          )}
        </div>
        <div className={styles.pills}>
          {year && <span className={styles.pill}>{year}</span>}
          {rating && <span className={`${styles.pill} ${styles.gold}`}>★ {rating}</span>}
          {badge && <span className={`${styles.pill} ${styles.badge}`}>{badge}</span>}
        </div>
        {overview && <p className={styles.overview}>{overview}</p>}
        {onNextEpisode && <button type="button" className={styles.nextEpisode} onClick={onNextEpisode}>Next episode</button>}
      </div>
      <div className={styles.playerBox} ref={playerBoxRef}>
        <button
          type="button"
          className={styles.fullscreenBtn}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3v6H3M3 3l6 6m6-6v6h6m0-6-6 6M9 21v-6H3m0 6 6-6m6 6v-6h6m0 6-6-6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 3H3v6m0-6 7 7m5-7h6v6m0-6-7 7M9 21H3v-6m0 6 7-7m5 7h6v-6m0 6-7-7" />
            </svg>
          )}
        </button>
        <iframe
          src={src}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          title={title}
        />
      </div>
    </div>
  )
}
