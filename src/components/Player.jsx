import React, { useEffect, useRef, useState, useCallback } from 'react'
import CastModal from './CastModal.jsx'
import { isCastConnected, castMediaToReceiver } from '../lib/castSync.js'
import { movieEmbedUrl, tvEmbedUrl } from '../lib/api.js'
import styles from './Player.module.css'

// Keyboard shortcut help overlay
const SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause (click inside player)' },
  { key: 'F', action: 'Fullscreen toggle' },
  { key: 'P', action: 'Picture-in-Picture (PiP) toggle' },
  { key: 'Esc', action: 'Exit fullscreen / Exit PiP / Close' },
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
  const [isPip, setIsPip] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const [castOpen, setCastOpen] = useState(false)
  const [isCasting, setIsCasting] = useState(() => isCastConnected())
  const [selectedServer, setSelectedServer] = useState('vidlink')
  const [pipPos, setPipPos] = useState(null) // { x, y }

  const s = badge?.match(/S(\d+)/)?.[1]
  const e = badge?.match(/E(\d+)/)?.[1]

  const activeSrc = tmdbId
    ? (mediaType === 'tv'
        ? tvEmbedUrl(tmdbId, s ? Number(s) : 1, e ? Number(e) : 1, false, selectedServer)
        : movieEmbedUrl(tmdbId, false, selectedServer))
    : src

  useEffect(() => {
    const handleCastChange = event => {
      setIsCasting(Boolean(event.detail?.connected))
    }
    window.addEventListener('Max Cinema:castchange', handleCastChange)
    return () => window.removeEventListener('Max Cinema:castchange', handleCastChange)
  }, [])

  // Auto-sync to connected Fire TV if already paired
  useEffect(() => {
    if (isCastConnected() && tmdbId) {
      const s = badge?.match(/S(\d+)/)?.[1]
      const e = badge?.match(/E(\d+)/)?.[1]
      castMediaToReceiver({
        tmdbId,
        mediaType: mediaType || 'movie',
        title,
        season: s ? Number(s) : 1,
        episode: e ? Number(e) : 1,
      }).catch(() => {})
    }
  }, [tmdbId, badge, mediaType, title])

  // ── Fullscreen sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === playerBoxRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  // ── PiP toggle ───────────────────────────────────────────────────────────
  const togglePip = useCallback(async () => {
    if (isPip) {
      setIsPip(false)
      setPipPos(null)
      return
    }

    if (document.fullscreenElement) {
      try { await document.exitFullscreen() } catch {}
    }
    setIsPip(true)
  }, [isPip])

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
      case 'p':
      case 'P':
        event.preventDefault()
        togglePip()
        break
      case 'n':
      case 'N':
        event.preventDefault()
        onNextEpisode?.()
        break
      case 'Escape':
        if (isFullscreen) { document.exitFullscreen().catch(() => {}) }
        else if (isPip) { setIsPip(false); setPipPos(null) }
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
  }, [isFullscreen, isPip, togglePip, showShortcuts, reportOpen, onNextEpisode])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // ── Fullscreen toggle ───────────────────────────────────────────────────
  async function toggleFullscreen() {
    try {
      if (isPip) setIsPip(false)
      if (document.fullscreenElement === playerBoxRef.current) {
        await document.exitFullscreen()
      } else {
        await playerBoxRef.current?.requestFullscreen()
      }
    } catch (e) {
      console.warn('Fullscreen unavailable:', e)
    }
  }

  // ── PiP Dragging logic ───────────────────────────────────────────────────
  const dragRef = useRef(null)
  const onPointerDownBar = (e) => {
    if (!isPip) return
    const el = playerBoxRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      boxLeft: rect.left,
      boxTop: rect.top,
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY
    const newLeft = Math.max(10, Math.min(window.innerWidth - 300, dragRef.current.boxLeft + deltaX))
    const newTop = Math.max(10, Math.min(window.innerHeight - 180, dragRef.current.boxTop + deltaY))
    setPipPos({ x: newLeft, y: newTop })
  }

  const onPointerUp = () => {
    dragRef.current = null
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  if (!src) return null

  async function closePlayer() {
    if (document.fullscreenElement === playerBoxRef.current) {
      try { await document.exitFullscreen() } catch {}
    }
    setIsPip(false)
    onClose?.()
  }

  // ── Share ───────────────────────────────────────────────────────────────
  async function handleShare() {
    const base = window.location.origin
    const url  = tmdbId
      ? (mediaType === 'tv'
          ? `${base}/tvshow/${tmdbId}`
          : `${base}/mov/${tmdbId}`)
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

  const pipStyle = isPip && pipPos ? {
    left: `${pipPos.x}px`,
    top: `${pipPos.y}px`,
    right: 'auto',
    bottom: 'auto',
  } : undefined

  return (
    <div className={styles.wrap}>
      {/* ── Meta ─────────────────────────────────────────────────────────── */}
      <div className={styles.meta}>
        <div className={styles.metaTop}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.metaActions}>
            {/* Cast to TV button */}
            <button
              type="button"
              className={`${styles.iconBtn} ${isCasting ? styles.castActive : ''}`}
              onClick={() => setCastOpen(true)}
              title={isCasting ? 'Connected to Fire TV (click to manage)' : 'Cast to Fire TV / Smart TV'}
              aria-label="Cast to Fire TV or Smart TV"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
                <line x1="2" y1="20" x2="2.01" y2="20"/>
              </svg>
            </button>

            {/* Picture-in-Picture button */}
            <button
              type="button"
              className={`${styles.iconBtn} ${isPip ? styles.pipActive : ''}`}
              onClick={togglePip}
              title={isPip ? 'Exit Picture-in-Picture (P)' : 'Picture-in-Picture (P)'}
              aria-label="Picture-in-Picture"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <rect x="12" y="10" width="8" height="7" rx="1" fill={isPip ? 'var(--gold, #c8a96e)' : 'currentColor'} fillOpacity={isPip ? '0.7' : '0.2'}/>
              </svg>
            </button>

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
          <span className={styles.pill} style={{ opacity: 0.5, fontSize: 9 }}>P = PiP · ? = shortcuts</span>
        </div>

        {/* ── Video Stream Server Switcher ── */}
        <div className={styles.serverSwitcherRow}>
          <span className={styles.serverLabel}>Server:</span>
          <button
            type="button"
            className={`${styles.serverBtn} ${selectedServer === 'vidlink' ? styles.serverBtnActive : ''}`}
            onClick={() => setSelectedServer('vidlink')}
            title="VidLink PRO (https://vidlink.pro) — Fast HD Streaming"
          >
            ⚡ VidLink PRO
          </button>
          <button
            type="button"
            className={`${styles.serverBtn} ${selectedServer === 'vidsrc' ? styles.serverBtnActive : ''}`}
            onClick={() => setSelectedServer('vidsrc')}
            title="VidSrc TO (https://vidsrc.to) — Multi-Source Streaming"
          >
            🎬 VidSrc TO
          </button>
          <button
            type="button"
            className={`${styles.serverBtn} ${selectedServer === 'embedmaster' ? styles.serverBtnActive : ''}`}
            onClick={() => setSelectedServer('embedmaster')}
            title="EmbedMaster — High Quality Player"
          >
            🌐 EmbedMaster
          </button>
        </div>

        {overview && <p className={styles.overview}>{overview}</p>}
        {onNextEpisode && (
          <button type="button" className={styles.nextEpisode} onClick={onNextEpisode}>
            Next episode →
          </button>
        )}
      </div>

      {/* ── In-page placeholder when in PiP ──────────────────────────────── */}
      {isPip && (
        <div className={styles.pipPlaceholder}>
          <div className={styles.pipPlaceholderContent}>
            <span className={styles.pipPlaceholderIcon}>📺</span>
            <div>
              <p className={styles.pipPlaceholderTitle}>Playing in Picture-in-Picture</p>
              <p className={styles.pipPlaceholderSubtitle}>{title}</p>
            </div>
            <button
              type="button"
              className={styles.pipRestoreBtn}
              onClick={() => { setIsPip(false); setPipPos(null) }}
            >
              Restore Player
            </button>
          </div>
        </div>
      )}

      {/* ── Player box ──────────────────────────────────────────────────── */}
      <div
        className={`${styles.playerBox} ${isPip ? styles.floatingPip : ''}`}
        ref={playerBoxRef}
        style={pipStyle}
      >
        {/* Floating PiP top bar with drag handle, restore, and close */}
        {isPip && (
          <div
            className={styles.floatingPipBar}
            onPointerDown={onPointerDownBar}
            title="Click and drag to move window"
          >
            <div className={styles.floatingPipTitle}>
              <span className={styles.floatingPipDragIcon}>⋮⋮</span> {title}
            </div>
            <div className={styles.floatingPipControls}>
              <button
                type="button"
                className={styles.floatingPipActionBtn}
                onClick={() => { setIsPip(false); setPipPos(null) }}
                title="Restore to page (P)"
                aria-label="Restore player"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
              <button
                type="button"
                className={styles.floatingPipActionBtn}
                onClick={closePlayer}
                title="Close player"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* PiP button overlay inside player */}
        <button
          type="button"
          className={styles.pipOverlayBtn}
          onClick={togglePip}
          aria-label={isPip ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
          title={isPip ? 'Exit Picture-in-Picture (P)' : 'Picture-in-Picture (P)'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <rect x="12" y="10" width="8" height="7" rx="1" fill="currentColor" fillOpacity="0.3" />
          </svg>
        </button>

        {/* Fullscreen button */}
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
          src={activeSrc}
          allowFullScreen
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="origin"
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

      <CastModal
        isOpen={castOpen}
        onClose={() => setCastOpen(false)}
        currentMedia={{
          tmdbId,
          mediaType: mediaType || 'movie',
          title,
          season: badge?.match(/S(\d+)/)?.[1],
          episode: badge?.match(/E(\d+)/)?.[1],
        }}
      />
    </div>
  )
}
