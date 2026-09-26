import React, { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import styles from './TrailerModal.module.css'

export default function TrailerModal({ title, id, mediaType = 'movie', onClose }) {
  const [trailerKey, setTrailerKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    const fetchVideos = mediaType === 'tv' ? api.tvVideos(id) : api.movieVideos(id)
    fetchVideos
      .then(res => {
        if (!active) return
        const videos = res?.results || []
        const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
          || videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')
          || videos.find(v => v.site === 'YouTube')
        if (trailer?.key) {
          setTrailerKey(trailer.key)
        } else {
          setError('No trailer is currently available for this title.')
        }
      })
      .catch(() => {
        if (active) setError('Could not load trailer at this moment.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [id, mediaType])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.backdrop} onMouseDown={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} Trailer`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.titleWrap}>
            <span className={styles.badge}>Official Trailer</span>
            <h3 className={styles.title}>{title}</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close trailer"
          >
            ✕
          </button>
        </div>

        <div className={styles.videoWrap}>
          {loading && (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Loading trailer…</p>
            </div>
          )}

          {error && (
            <div className={styles.errorWrap}>
              <span className={styles.errorIcon}>🎬</span>
              <p>{error}</p>
            </div>
          )}

          {trailerKey && !loading && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
              title={`${title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.iframe}
            />
          )}
        </div>
      </div>
    </div>
  )
}
