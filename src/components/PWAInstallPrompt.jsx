import { useState, useEffect } from 'react'
import styles from './PWAInstallPrompt.module.css'

const DISMISS_KEY = 'cs_pwa_dismissed'
const DISMISS_DAYS = 7

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [isHiding, setIsHiding] = useState(false)

  useEffect(() => {
    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (dismissed) {
        const time = parseInt(dismissed, 10)
        if (Date.now() - time < DISMISS_DAYS * 24 * 60 * 60 * 1000) {
          return
        }
      }
    } catch {
      // ignore
    }

    // Check if already in standalone mode (PWA installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (isStandalone) return

    // iOS check
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    if (isIos && !isStandalone) {
      // Delay showing iOS hint
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // Standard beforeinstallprompt for Android / Chrome / Edge
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  const handleInstallClick = async () => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
    if (isIos) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setIsHiding(true)
    setTimeout(() => {
      setShowPrompt(false)
      setIsHiding(false)
      try {
        localStorage.setItem(DISMISS_KEY, Date.now().toString())
      } catch {
        // ignore
      }
    }, 350)
  }

  if (!showPrompt) return null

  return (
    <>
      <div className={`${styles.banner} ${isHiding ? styles.bannerHide : ''}`} role="dialog" aria-label="Install App">
        <span className={styles.icon}>📱</span>
        <div className={styles.content}>
          <div className={styles.title}>Install Max Cinema</div>
          <p className={styles.sub}>Watch movies & TV anywhere with zero lag. Fast, fullscreen & ad-free experience.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.installBtn} onClick={handleInstallClick}>
            Install App
          </button>
          <button className={styles.dismissBtn} onClick={handleDismiss} aria-label="Dismiss">
            Later
          </button>
        </div>
      </div>

      {showIosGuide && (
        <div className={styles.iosPanel}>
          <div className={styles.iosPanelHeader}>
            <div className={styles.iosTitle}>Install on iPhone / iPad</div>
            <button className={styles.closeBtn} onClick={() => setShowIosGuide(false)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className={styles.iosStep}>
            <span>1</span>
            <div>Tap the <strong>Share</strong> button in Safari's bottom toolbar.</div>
          </div>
          <div className={styles.iosStep}>
            <span>2</span>
            <div>Scroll down and select <strong>Add to Home Screen</strong>.</div>
          </div>
          <div className={styles.iosStep}>
            <span>3</span>
            <div>Tap <strong>Add</strong> in the top-right corner to finish.</div>
          </div>
          <div className={styles.iosArrow} />
        </div>
      )}
    </>
  )
}

