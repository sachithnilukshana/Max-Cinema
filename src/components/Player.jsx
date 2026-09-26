import React, { useEffect, useRef, useState } from 'react'
import styles from './Player.module.css'

export default function Player({ src, title, year, rating, overview, badge, onClose, onNextEpisode }) {
  const playerBoxRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const countdownTimerRef = useRef(null)

  // Compute next episode label if badge is present
  const nextEpisodeLabel = (() => {
    if (!badge) return 'Next Episode'
    const match = badge.match(/S(\d+)\s*[·•\-]\s*E(\d+)/i)
    if (match) {
      return `S${match[1]} · E${Number(match[2]) + 1}`
    }
    return 'Next Episode'
  })()

  // Reset countdown when src changes
  useEffect(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    setCountdown(null)
  }, [src])

  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
      setCountdown(null)
      onNextEpisode?.()
      return
    }

    countdownTimerRef.current = setTimeout(() => {
      setCountdown(prev => (prev !== null && prev > 0 ? prev - 1 : null))
    }, 1000)

    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    }
  }, [countdown, onNextEpisode])

  function startCountdown() {
    setCountdown(10)
  }

  function cancelCountdown() {
    if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current)
    setCountdown(null)
  }

  function handlePlayNow() {
    cancelCountdown()
    onNextEpisode?.()
  }

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
        {onNextEpisode && (
          <div className={styles.episodeControls}>
            <button
              type="button"
              className={styles.nextEpisode}
              onClick={handlePlayNow}
              title="Play next episode immediately"
            >
              ▶ Next: {nextEpisodeLabel}
            </button>
            <button
              type="button"
              className={styles.countdownTrigger}
              onClick={startCountdown}
              title="Start 10-second auto-play countdown"
            >
              ⏱ 10s Auto-Countdown
            </button>
          </div>
        )}
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

        {/* Floating Auto-Play Next Episode overlay for TV series */}
        {onNextEpisode && (
          <div className={styles.floatingNextDock}>
            {countdown !== null ? (
              <div className={styles.countdownCard}>
                <div className={styles.countdownRingWrap}>
                  <svg className={styles.ringSvg} viewBox="0 0 36 36">
                    <path
                      className={styles.ringBg}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className={styles.ringFill}
                      strokeDasharray={`${(countdown / 10) * 100}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className={styles.countdownNumber}>{countdown}</span>
                </div>
                <div className={styles.countdownText}>
                  <span className={styles.countdownEyebrow}>Up Next</span>
                  <strong className={styles.countdownLabel}>{nextEpisodeLabel}</strong>
                </div>
                <button
                  type="button"
                  className={styles.playNowBtn}
                  onClick={handlePlayNow}
                  title="Play now"
                >
                  ▶ Play
                </button>
                <button
                  type="button"
                  className={styles.cancelCountdownBtn}
                  onClick={cancelCountdown}
                  aria-label="Cancel auto-play"
                  title="Cancel"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.floatingUpNextBtn}
                onClick={startCountdown}
                title="Start 10-second next episode countdown"
              >
                <span>Up Next: {nextEpisodeLabel}</span>
                <span className={styles.pulseDot} />
              </button>
            )}
          </div>
        )}

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
