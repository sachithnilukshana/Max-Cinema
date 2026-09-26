import React, { useEffect, useState } from 'react'
import { api, posterUrl, formatRating, getYear } from '../lib/api.js'
import styles from './PersonModal.module.css'

export default function PersonModal({ personId, personName, onClose, onSelectTitle }) {
  const [details, setDetails] = useState(null)
  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all') // 'all' | 'movie' | 'tv'

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    Promise.all([
      api.personDetails(personId).catch(() => null),
      api.personCredits(personId).catch(() => null),
    ])
      .then(([personData, creditData]) => {
        if (!active) return
        if (!personData && !creditData) {
          setError('Could not load filmography information.')
          return
        }
        setDetails(personData)

        // Combine cast and directing crew
        const castCredits = creditData?.cast || []
        const directingCredits = (creditData?.crew || []).filter(c => c.job === 'Director')
        const allCredits = [...castCredits, ...directingCredits]

        // Deduplicate by mediaType:id and sort by vote_count / popularity
        const seen = new Set()
        const unique = []
        for (const item of allCredits) {
          const key = `${item.media_type || 'movie'}:${item.id}`
          if (!seen.has(key) && item.poster_path) {
            seen.add(key)
            unique.push(item)
          }
        }

        // Sort by popularity / vote count
        unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        setCredits(unique)
      })
      .catch(() => {
        if (active) setError('Failed to load details.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [personId])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const filteredCredits = credits.filter(c => {
    if (filter === 'all') return true
    return (c.media_type || 'movie') === filter
  })

  return (
    <div className={styles.backdrop} onMouseDown={onClose} role="presentation">
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`${personName || 'Person'} Filmography`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerBio}>
            {details?.profile_path ? (
              <img
                src={posterUrl(details.profile_path)}
                alt={details.name}
                className={styles.profileImg}
              />
            ) : (
              <div className={styles.profileFallback}>
                {(personName || details?.name || 'A').slice(0, 1)}
              </div>
            )}
            <div>
              <span className={styles.deptBadge}>
                {details?.known_for_department || 'Filmography'}
              </span>
              <h2 className={styles.name}>{details?.name || personName}</h2>
              {details?.place_of_birth && (
                <p className={styles.origin}>From {details.place_of_birth}</p>
              )}
              {details?.biography && (
                <p className={styles.bio}>
                  {details.biography.slice(0, 260)}
                  {details.biography.length > 260 ? '…' : ''}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Filter bar */}
        <div className={styles.navRow}>
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${filter === 'all' ? styles.activeTab : ''}`}
              onClick={() => setFilter('all')}
            >
              All Titles ({credits.length})
            </button>
            <button
              type="button"
              className={`${styles.tab} ${filter === 'movie' ? styles.activeTab : ''}`}
              onClick={() => setFilter('movie')}
            >
              Movies ({credits.filter(c => (c.media_type || 'movie') === 'movie').length})
            </button>
            <button
              type="button"
              className={`${styles.tab} ${filter === 'tv' ? styles.activeTab : ''}`}
              onClick={() => setFilter('tv')}
            >
              TV Series ({credits.filter(c => c.media_type === 'tv').length})
            </button>
          </div>
        </div>

        {/* Content body */}
        <div className={styles.body}>
          {loading && (
            <div className={styles.loadingWrap}>
              <div className={styles.spinner} />
              <p>Loading filmography…</p>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}

          {!loading && filteredCredits.length === 0 && (
            <p className={styles.empty}>No titles found in this category.</p>
          )}

          {!loading && filteredCredits.length > 0 && (
            <div className={styles.grid}>
              {filteredCredits.map(item => {
                const isTV = item.media_type === 'tv'
                const title = isTV ? item.name : item.title
                const year = getYear(isTV ? item.first_air_date : item.release_date)
                const rating = formatRating(item.vote_average)
                const role = item.character || item.job

                return (
                  <button
                    key={`${item.media_type || 'movie'}:${item.id}`}
                    type="button"
                    className={styles.titleCard}
                    onClick={() => {
                      onClose?.()
                      onSelectTitle?.(item)
                    }}
                  >
                    <div className={styles.posterWrap}>
                      {item.poster_path ? (
                        <img
                          src={posterUrl(item.poster_path)}
                          alt={title}
                          loading="lazy"
                        />
                      ) : (
                        <div className={styles.noPoster}>{title?.slice(0, 2)}</div>
                      )}
                      <div className={styles.playOverlay}>
                        <span>▶</span>
                      </div>
                      {rating && <span className={styles.ratingBadge}>★ {rating}</span>}
                    </div>
                    <div className={styles.titleMeta}>
                      <span className={styles.titleText}>{title}</span>
                      <div className={styles.subtitleRow}>
                        <span>{year || (isTV ? 'TV' : 'Movie')}</span>
                        {role && <span className={styles.role} title={role}>· {role}</span>}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
