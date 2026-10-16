import React, { useEffect, useState, useRef } from 'react'
import { generateCastCode, createReceiverSession } from '../lib/castSync.js'
import { movieEmbedUrl, tvEmbedUrl } from '../lib/api.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import styles from './FireTVReceiver.module.css'

export default function FireTVReceiver() {
  const [code, setCode] = useState(() => generateCastCode())
  const [senderConnected, setSenderConnected] = useState(false)
  const [activeMedia, setActiveMedia] = useState(null)
  const [showTopBar, setShowTopBar] = useState(true)
  const { isPremium } = usePremium()
  const topBarTimer = useRef(null)

  useEffect(() => {
    document.title = `Fire TV Cast Receiver (${code}) — Max Cinema`
  }, [code])

  // Setup receiver session on Firebase RTDB
  useEffect(() => {
    const cleanup = createReceiverSession(code, {
      onMediaChange: media => {
        setActiveMedia(media)
        setShowTopBar(true)
        if (topBarTimer.current) clearTimeout(topBarTimer.current)
        topBarTimer.current = setTimeout(() => setShowTopBar(false), 5000)
      },
      onCommand: cmd => {
        if (cmd?.type === 'stop') {
          setActiveMedia(null)
        }
      },
      onStatusChange: status => {
        setSenderConnected(Boolean(status.connectedSender))
      },
    })

    return () => {
      cleanup()
      if (topBarTimer.current) clearTimeout(topBarTimer.current)
    }
  }, [code])

  // Handle remote control keys (Back key to exit player)
  useEffect(() => {
    const handleKey = event => {
      if (event.key === 'Escape' || event.key === 'Backspace' || event.keyCode === 10009 || event.keyCode === 27) {
        if (activeMedia) {
          event.preventDefault()
          setActiveMedia(null)
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [activeMedia])

  // QR Code URL for phone scanning
  const pairUrl = `${window.location.origin}/?cast=${code}`
  const qrCodeSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(pairUrl)}`

  // Render Fullscreen Cinema Player if media is streaming
  if (activeMedia) {
    const isTV = activeMedia.mediaType === 'tv'
    const embedSrc = isTV
      ? tvEmbedUrl(activeMedia.tmdbId, activeMedia.season || 1, activeMedia.episode || 1, isPremium)
      : movieEmbedUrl(activeMedia.tmdbId, isPremium)

    return (
      <div
        className={styles.activePlayerWrapper}
        onMouseMove={() => {
          setShowTopBar(true)
          if (topBarTimer.current) clearTimeout(topBarTimer.current)
          topBarTimer.current = setTimeout(() => setShowTopBar(false), 4000)
        }}
      >
        <div
          className={styles.playerTopBar}
          style={{ opacity: showTopBar ? 1 : 0, pointerEvents: showTopBar ? 'auto' : 'none' }}
        >
          <div className={styles.playerMeta}>
            <span className={styles.castBadge}>📺 Fire TV Cast</span>
            <h2 className={styles.playingTitle}>
              {activeMedia.title}
              {isTV && ` (S${activeMedia.season || 1} · E${activeMedia.episode || 1})`}
            </h2>
          </div>
          <button
            type="button"
            className={styles.exitButton}
            onClick={() => setActiveMedia(null)}
          >
            ✕ Exit to Code Screen (Back)
          </button>
        </div>

        <div className={styles.iframeWrapper}>
          <iframe
            src={embedSrc}
            title={activeMedia.title || 'Max Cinema Player'}
            className={styles.playerFrame}
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  // Split code into individual digits
  const digits = code.split('')

  return (
    <div className={styles.tvContainer}>
      <header className={styles.tvHeader}>
        <img src="/max-cinema-logo.png" alt="Max Cinema" className={styles.tvLogo} />
        <h1 className={styles.tvTitle}>Max Cinema</h1>
        <span className={styles.tvBadge}>Fire TV Leanback</span>
      </header>

      <main className={styles.tvCard}>
        <div className={styles.codeLabel}>Pair with your Phone or Computer</div>

        <div className={styles.codeDigits} aria-label={`Pairing code ${code}`}>
          {digits.map((digit, index) => (
            <div key={index} className={styles.digitBox}>
              {digit}
            </div>
          ))}
        </div>

        <div className={styles.instructionsRow}>
          <div className={styles.qrBox}>
            <img src={qrCodeSrc} alt="Scan QR code to pair" className={styles.qrImage} />
            <span className={styles.qrHint}>Scan to auto-pair</span>
          </div>

          <div className={styles.stepsList}>
            <div className={stepItemClass(styles)}>
              <span className={styles.stepNum}>1</span>
              <div>
                Open <strong>max-cinema.vercel.app</strong> on your phone or computer.
              </div>
            </div>
            <div className={stepItemClass(styles)}>
              <span className={styles.stepNum}>2</span>
              <div>
                Tap the <strong>📺 Cast to TV</strong> button in the top menu.
              </div>
            </div>
            <div className={stepItemClass(styles)}>
              <span className={styles.stepNum}>3</span>
              <div>
                Enter the 6-digit code above or scan the QR code.
              </div>
            </div>
          </div>
        </div>

        <div className={styles.connectionStatus}>
          <div className={senderConnected ? styles.pulseDotGreen : styles.pulseDot} />
          <span>
            {senderConnected
              ? '🟢 Phone connected! Pick any movie or TV show to play.'
              : 'Waiting for device to connect…'}
          </span>
        </div>
      </main>
    </div>
  )
}

function stepItemClass(styles) {
  return styles.stepItem
}

