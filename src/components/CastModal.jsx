import React, { useState, useEffect } from 'react'
import {
  getActiveCastCode,
  connectToReceiver,
  disconnectCast,
  castMediaToReceiver,
  isCastConnected,
} from '../lib/castSync.js'
import styles from './CastModal.module.css'

export default function CastModal({ isOpen, onClose, currentMedia }) {
  const [tab, setTab] = useState('firetv')
  const [code, setCode] = useState('')
  const [connectedCode, setConnectedCode] = useState(() => getActiveCastCode())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const handleCastChange = event => {
      setConnectedCode(event.detail?.code || null)
    }
    window.addEventListener('Max Cinema:castchange', handleCastChange)
    return () => window.removeEventListener('Max Cinema:castchange', handleCastChange)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setError('')
      setSuccess('')
      setConnectedCode(getActiveCastCode())
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleConnect(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const res = await connectToReceiver(code)
      setConnectedCode(res.code)
      setSuccess('Connected to Fire TV successfully!')
      setCode('')
      if (currentMedia) {
        await castMediaToReceiver(currentMedia)
        setSuccess('Connected! Title sent to Fire TV.')
      }
    } catch (err) {
      setError(err.message || 'Could not connect to Fire TV.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCastCurrent() {
    if (!currentMedia) return
    setError('')
    setSuccess('')
    try {
      await castMediaToReceiver(currentMedia)
      setSuccess(`Casting "${currentMedia.title}" to Fire TV!`)
      setTimeout(() => onClose(), 1500)
    } catch {
      setError('Could not send media to Fire TV.')
    }
  }

  async function handleDisconnect() {
    await disconnectCast()
    setConnectedCode(null)
    setSuccess('Disconnected from Fire TV.')
  }

  async function handleBrowserCast() {
    setError('')
    if (window.PresentationRequest) {
      try {
        const presentation = new window.PresentationRequest(['/firetv', window.location.href])
        await presentation.start()
        onClose()
      } catch (err) {
        if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          setError('Browser cast cancelled or no Cast device selected.')
        }
      }
    } else {
      setError('Native Cast API is not supported in this browser. Use the Fire TV Code method or Screen Mirroring.')
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={onClose} role="presentation">
      <div
        className={styles.modal}
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cast to Fire TV"
      >
        <div className={styles.header}>
          <h3 className={styles.headerTitle}>
            <span>📺</span> Cast to Fire TV / Smart TV
          </h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'firetv'}
            className={`${styles.tabBtn} ${tab === 'firetv' ? styles.tabActive : ''}`}
            onClick={() => setTab('firetv')}
          >
            Pair with Code
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mirror'}
            className={`${styles.tabBtn} ${tab === 'mirror' ? styles.tabActive : ''}`}
            onClick={() => setTab('mirror')}
          >
            Screen Mirroring
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chromecast'}
            className={`${styles.tabBtn} ${tab === 'chromecast' ? styles.tabActive : ''}`}
            onClick={() => setTab('chromecast')}
          >
            AirScreen / Cast
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.fireTvHelpBanner}>
            <strong>💡 Seeing &quot;Available for specific video sites&quot; in Chrome?</strong>
            <p>
              Amazon Fire TV restricts direct Chrome tab casting. Connect Max Cinema to your TV instantly:
            </p>
            <ul>
              <li><strong>Method 1:</strong> Open <em>Silk Browser</em> on Fire TV &rarr; go to <span className={styles.urlPill}>max-cinema.vercel.app/firetv</span> &rarr; enter code below.</li>
              <li><strong>Method 2:</strong> Install free <em>AirScreen</em> app on your Fire TV from Amazon Appstore to enable native Chrome tab casting!</li>
            </ul>
          </div>

          {tab === 'firetv' && (
            <div>
              {connectedCode ? (
                <div className={styles.connectedBox}>
                  <div className={styles.connectedHeader}>
                    <span>●</span> Connected to Fire TV (#{connectedCode})
                  </div>
                  <p className={styles.connectedDesc}>
                    Any movie or TV series you play will stream straight to your Fire TV.
                  </p>
                  {currentMedia && (
                    <button type="button" className={styles.castNowBtn} onClick={handleCastCurrent}>
                      ▶ Cast "{currentMedia.title}" to TV Now
                    </button>
                  )}
                  <button type="button" className={styles.disconnectBtn} onClick={handleDisconnect}>
                    Disconnect Fire TV
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnect}>
                  <label htmlFor="firetv-code-input" className={styles.label}>
                    1. On your Fire TV, open the <strong>Silk Browser</strong> and visit:
                    <br />
                    <span className={styles.highlight}>max-cinema.vercel.app/firetv</span>
                    <br />
                    2. Enter the 6-digit code shown on your TV screen:
                  </label>
                  <div className={styles.codeInputs}>
                    <input
                      id="firetv-code-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="123456"
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={styles.codeInput}
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className={styles.connectBtn}
                    disabled={loading || code.length !== 6}
                  >
                    {loading ? 'Connecting…' : 'Connect to Fire TV'}
                  </button>
                </form>
              )}

              {error && <p className={styles.errorNotice} role="alert">{error}</p>}
              {success && <p className={styles.successNotice} role="status">{success}</p>}

              <div className={styles.instructionBox}>
                <strong>Tip:</strong> You can also scan the QR code on your Fire TV screen with your phone camera to pair instantly without typing!
              </div>
            </div>
          )}

          {tab === 'mirror' && (
            <div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: '#ccc', lineHeight: 1.5 }}>
                Cast your entire screen directly to Fire TV without typing any codes:
              </p>
              <div className={styles.instructionBox}>
                <strong style={{ color: 'var(--gold, #c8a96e)' }}>On your Fire TV:</strong>
                <ol>
                  <li>Hold the <strong>Home button (⌂)</strong> on your Fire TV remote for 3 seconds.</li>
                  <li>Select <strong>Mirroring</strong> from the quick menu.</li>
                </ol>
              </div>
              <div className={styles.instructionBox} style={{ marginTop: '0.75rem' }}>
                <strong style={{ color: 'var(--gold, #c8a96e)' }}>On your Phone / PC:</strong>
                <ol>
                  <li><strong>Android:</strong> Swipe down notification shade → tap <strong>Smart View</strong> or <strong>Screen Cast</strong> → select your Fire TV.</li>
                  <li><strong>Windows PC:</strong> Press <kbd>Win + K</kbd> on your keyboard → click your Fire TV.</li>
                  <li><strong>iPhone / iPad:</strong> Open Control Center → tap <strong>Screen Mirroring</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {tab === 'chromecast' && (
            <div>
              <p style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: '#ccc', lineHeight: 1.5 }}>
                Cast directly using Google Cast / AirPlay:
              </p>
              <button
                type="button"
                className={styles.castNowBtn}
                onClick={handleBrowserCast}
              >
                📺 Start Browser Cast…
              </button>
              {error && <p className={styles.errorNotice} role="alert">{error}</p>}
              <div className={styles.instructionBox}>
                <strong style={{ color: 'var(--gold, #c8a96e)' }}>How to enable Google Cast on Fire TV:</strong>
                <p style={{ margin: '0.5rem 0' }}>
                  Install the free <strong>AirScreen</strong> app from the Amazon Fire TV Appstore. It turns your Fire TV into a native Google Cast (Chromecast) and AirPlay receiver.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

