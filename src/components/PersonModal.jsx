import React, { useEffect, useState } from 'react'
import { api, posterUrl } from '../lib/api.js'
import styles from './PersonModal.module.css'

/**
 * PersonModal — Actor / Director filmography explorer.
 *
 * Props:
 *   personId   – TMDB person id
 *   onClose    – callback to close the modal
 *   onSelect   – callback(item) to open a title from the filmography
 */
export default function PersonModal({ personId, onClose, onSelect }) {
  const [person, setPerson] = useState(null)
  const [credits, setCredits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!personId) return
    let active = true
    setLoading(true)

    Promise.all([api.personDetails(personId), api.personCredits(personId)])
      .then(([details, creditData]) => {
        if (!active) return
        setPerson(details)
        // Combine cast + crew, deduplicate, sort by popularity
        const all = [
          ...(creditData.cast || []),
          ...(creditData.crew || []).filter(c => c.job === 'Director'),
        ]
        const seen = new Set()
        const unique = all.filter(item => {
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })
        unique.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        setCredits(unique.slice(0, 24))
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [personId])

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onClose?.() }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={person ? `${person.name} — Filmography` : 'Filmography'}
      >
        <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>×</button>

        {loading && <div className={styles.spinner} aria-label="Loading…" />}

        {!loading && person && (
          <>
            <div className={styles.header}>
              {person.profile_path && (
                <img
                  src={posterUrl(person.profile_path)}
                  alt=""
                  className={styles.avatar}
                  loading="eager"
                />
              )}
              <div>
                <h2 className={styles.name}>{person.name}</h2>
                {person.known_for_department && (
                  <p className={styles.dept}>{person.known_for_department}</p>
                )}
                {person.biography && (
                  <p className={styles.bio}>{person.biography.slice(0, 280)}{person.biography.length > 280 ? '…' : ''}</p>
                )}
              </div>
            </div>

            {credits.length > 0 && (
              <>
                <h3 className={styles.creditsTitle}>Filmography</h3>
                <div className={styles.grid}>
                  {credits.map(item => {
                    const t = item.title || item.name || 'Untitled'
                    const year = (item.release_date || item.first_air_date || '').slice(0, 4)
                    const p = item.poster_path ? posterUrl(item.poster_path) : null
                    return (
                      <button
                        key={`${item.id}-${item.credit_id || ''}`}
                        type="button"
                        className={styles.creditCard}
                        onClick={() => {
                          onSelect?.({ ...item, media_type: item.media_type || (item.first_air_date ? 'tv' : 'movie') })
                          onClose?.()
                        }}
                      >
                        <div className={styles.creditPoster}>
                          {p
                            ? <img src={p} alt="" loading="lazy" />
                            : <div className={styles.creditNoPoster}>{t.slice(0, 2)}</div>
                          }
                        </div>
                        <span className={styles.creditTitle}>{t}</span>
                        {year && <span className={styles.creditYear}>{year}</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </div>
  )
}
