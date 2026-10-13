import React, { useEffect, useRef, useState, useCallback } from 'react'
import styles from './Player.module.css'

// Keyboard shortcut help overlay
const SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause (click inside player)' },
  { key: 'F', action: 'Fullscreen toggle' },
  { key: 'Esc', action: 'Exit fullscreen / Close' },
  { key: 'N', action: 'Next episode' },
  { key: 'M', action: 'Mute toggle (iframe only)' },
  { key: '?', action: 'Show / hide this help' },
]

export default function Player({
  src, title, year, rating, overview, badge,
  onClose, onNextEpisode,
  tmdbId, mediaType,  // for share + report buttons
}) {
  const playerBoxRef  = useRef(null)
  const iframeRef     = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  // ── Fullscreen sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === playerBoxRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const handleKey = useCallback(event => {
    const editable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
    if (editable) return

    switch (event.key) {
      case 'f':
      case 'F':
        event.preventDefault()
        toggleFullscreen()
        break
      case 'n':
      case 'N':
        event.preventDefault()
        onNextEpisode?.()
        break
      case 'Escape':
        if (isFullscreen) { document.exitFullscreen().catch(() => {}) }
        else if (showShortcuts) { setShowShortcuts(false) }
        else if (reportOpen) { setReportOpen(false) }
        break
      case '?':
        event.preventDefault()
        setShowShortcuts(v => !v)
        break
      default:
        break
    }
  }, [isFullscreen, showShortcuts, reportOpen, onNextEpisode])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // ── Fullscreen toggle ───────────────────────────────────────────────────
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === playerBoxRef.current) {
        await document.exitFullscreen()
      } else {
        await playerBoxRef.current?.requestFullscreen()
      }
    } catch (e) {
      console.warn('Fullscreen unavailable:', e)
    }
  }

  if (!src) return null

  async function closePlayer() {
    if (document.fullscreenElement === playerBoxRef.current) {
      try { await document.exitFullscreen() } catch {}
    }
    onClose?.()
  }

  // ── Share ───────────────────────────────────────────────────────────────
  async function handleShare() {
    const base = window.location.origin
    const url  = tmdbId
      ? (mediaType === 'tv'
          ? `${base}/tv/${tmdbId}`
          : `${base}/movie/${tmdbId}`)
      : window.location.href

    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setShareCopied(true)
        setTimeout(() => setShareCopied(false), 2000)
      }
    } catch {}
  }

  // ── Report ──────────────────────────────────────────────────────────────
  async function submitReport(e) {
    e.preventDefault()
    if (!reportReason) return
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, tmdbId, mediaType, reason: reportReason, details: reportDetails }),
      })
    } catch {}
    setReportSent(true)
    setTimeout(() => { setReportOpen(false); setReportSent(false); setReportReason(''); setReportDetails('') }, 2500)
  }

  return (
    <div className={styles.wrap}>
      {/* ── Meta ─────────────────────────────────────────────────────────── */}
      <div className={styles.meta}>
        <div className={styles.metaTop}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.metaActions}>
            {/* Share button */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={handleShare}
              title="Share"
              aria-label="Share this title"
            >
              {shareCopied ? '✓' : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              )}
            </button>

            {/* Keyboard shortcuts help */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setShowShortcuts(v => !v)}
              title="Keyboard shortcuts (?)"
              aria-label="Show keyboard shortcuts"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="2" y="6" width="20" height="13" rx="2"/>
                <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h.01M12 14h.01M16 14h.01M6 14h.01M18 14h.01"/>
              </svg>
            </button>

            {/* Report button */}
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setReportOpen(v => !v)}
              title="Report an issue"
              aria-label="Report content issue"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                <line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </button>

            {onClose && (
              <button className={styles.closeBtn} onClick={closePlayer} aria-label="Close player">✕</button>
            )}
          </div>
        </div>

        <div className={styles.pills}>
          {year   && <span className={styles.pill}>{year}</span>}
          {rating && <span className={`${styles.pill} ${styles.gold}`}>★ {rating}</span>}
          {badge  && <span className={`${styles.pill} ${styles.badge}`}>{badge}</span>}
          <span className={styles.pill} style={{ opacity: 0.5, fontSize: 9 }}>? = shortcuts</span>
        </div>

        {overview && <p className={styles.overview}>{overview}</p>}
        {onNextEpisode && (
          <button type="button" className={styles.nextEpisode} onClick={onNextEpisode}>
            Next episode →
          </button>
        )}
      </div>

      {/* ── Player box ──────────────────────────────────────────────────── */}
      <div className={styles.playerBox} ref={playerBoxRef}>
        <button
          type="button"
          className={styles.fullscreenBtn}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen (F)'}
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
          ref={iframeRef}
          src={src}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          title={title}
        />
      </div>

      {/* ── Keyboard shortcuts overlay ───────────────────────────────────── */}
      {showShortcuts && (
        <div className={styles.shortcutsOverlay} onClick={() => setShowShortcuts(false)}>
          <div className={styles.shortcutsBox} onClick={e => e.stopPropagation()}>
            <div className={styles.shortcutsHeader}>
              <span>⌨️ Keyboard Shortcuts</span>
              <button onClick={() => setShowShortcuts(false)} aria-label="Close">✕</button>
            </div>
            <ul className={styles.shortcutsList}>
              {SHORTCUTS.map(s => (
                <li key={s.key}>
                  <kbd className={styles.kbd}>{s.key}</kbd>
                  <span>{s.action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Report modal ────────────────────────────────────────────────── */}
      {reportOpen && (
        <div className={styles.reportOverlay} onClick={() => setReportOpen(false)}>
          <div className={styles.reportBox} onClick={e => e.stopPropagation()}>
            {reportSent ? (
              <p className={styles.reportThanks}>✅ Report received — thanks for helping improve Max Cinema!</p>
            ) : (
              <form onSubmit={submitReport}>
                <div className={styles.reportHeader}>
                  <span>⚑ Report an Issue</span>
                  <button type="button" onClick={() => setReportOpen(false)} aria-label="Close">✕</button>
                </div>
                <p className={styles.reportTitle}>{title}</p>
                <div className={styles.reportOptions}>
                  {[
                    ['broken', '🔗 Broken / wrong video'],
                    ['subtitles', '🔤 Wrong subtitles'],
                    ['inappropriate', '🚫 Inappropriate content'],
                    ['other', '📝 Other'],
                  ].map(([val, label]) => (
                    <label key={val} className={`${styles.reportOption} ${reportReason === val ? styles.reportSelected : ''}`}>
                      <input
                        type="radio"
                        name="reason"
                        value={val}
                        checked={reportReason === val}
                        onChange={() => setReportReason(val)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {reportReason === 'other' && (
                  <textarea
                    className={styles.reportDetails}
                    value={reportDetails}
                    onChange={e => setReportDetails(e.target.value)}
                    placeholder="Describe the issue…"
                    rows={3}
                  />
                )}
                <button type="submit" className={styles.reportSubmit} disabled={!reportReason}>
                  Submit Report
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
