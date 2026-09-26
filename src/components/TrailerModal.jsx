import React, { useEffect, useRef } from 'react'
import styles from './TrailerModal.module.css'

/**
 * TrailerModal — fullscreen YouTube trailer overlay.
 *
 * Props:
 *   trailerKey  – YouTube video key (e.g. "dQw4w9WgXcQ")
 *   title       – movie/show title for aria-label
 *   onClose     – callback to close the modal
 */
export default function TrailerModal({ trailerKey, title = 'Trailer', onClose }) {
  const backdropRef = useRef(null)

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!trailerKey) return null

  return (
    <div
      ref={backdropRef}
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose?.() }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — Official Trailer`}
      >
        <button
          type="button"
          className={styles.close}
          aria-label="Close trailer"
          onClick={onClose}
        >
          ×
        </button>
        <div className={styles.iframeWrap}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
            title={`${title} official trailer`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className={styles.iframe}
          />
        </div>
      </section>
    </div>
  )
}
