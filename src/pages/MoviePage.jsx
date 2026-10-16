import React, { useEffect, useState } from 'react'
import { api, apiErrorMessage, movieEmbedUrl, formatRating, getYear } from '../lib/api.js'
import { recordContinueWatching } from '../lib/profile.js'
import { trackMovieView } from '../lib/cinescopeApi.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import Player from '../components/Player.jsx'
import PersonalControls from '../components/PersonalControls.jsx'
import WatchOptions from '../components/WatchOptions.jsx'
import TitleDetails from '../components/TitleDetails.jsx'
import CommunityReviews from '../components/CommunityReviews.jsx'
import styles from './MoviePage.module.css'

export default function MoviePage({ tmdbId, profile, onBack, onSelectMovie, onSelectTV }) {
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { isPremium, isUnlocked } = usePremium()

  useEffect(() => {
    if (!tmdbId) return
    let active = true
    setLoading(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    api.movieDetails(tmdbId)
      .then(data => {
        if (!active) return
        setMovie(data)
        const year = getYear(data.release_date)
        document.title = `${data.title}${year ? ` (${year})` : ''} — Watch Free on Max Cinema`

        const libraryItem = { ...data, media_type: 'movie' }
        recordContinueWatching(profile?.id, libraryItem)
        trackMovieView(data)
      })
      .catch(err => {
        if (!active) return
        setError(apiErrorMessage(err, 'Movie'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tmdbId, profile?.id])

  if (loading) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.topBar}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            ← Back
          </button>
        </div>
        <div className={styles.stateBox}>
          <div className={styles.spinner} />
          <p style={{ color: 'var(--gold, #c8a96e)', fontWeight: 500 }}>Loading movie details…</p>
        </div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.topBar}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            ← Back to Movies
          </button>
        </div>
        <div className={styles.stateBox}>
          <h2 className={styles.errorTitle}>Could Not Load Movie</h2>
          <p className={styles.errorDesc}>{error || 'The requested movie was not found.'}</p>
          <button type="button" className={styles.backBtn} onClick={onBack} style={{ marginTop: '1rem' }}>
            Browse Movies
          </button>
        </div>
      </div>
    )
  }

  const year = getYear(movie.release_date)
  const rating = formatRating(movie.vote_average)
  const embedUrl = movieEmbedUrl(tmdbId, isPremium || isUnlocked(tmdbId))
  const movieItem = { ...movie, media_type: 'movie' }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back to Movies
        </button>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>Home</button>
          <span>/</span>
          <button type="button" onClick={onBack}>Movies</button>
          <span>/</span>
          <span className={styles.breadcrumbCurrent}>{movie.title}</span>
        </nav>
      </div>

      <div className={styles.playerSection}>
        <Player
          src={embedUrl}
          title={movie.title}
          year={year}
          rating={rating}
          overview={movie.overview}
          tmdbId={tmdbId}
          mediaType="movie"
          onClose={onBack}
        />
        <PersonalControls profile={profile} item={movieItem} />
        <WatchOptions id={tmdbId} mediaType="movie" />
        <TitleDetails
          id={tmdbId}
          mediaType="movie"
          onSelect={item => {
            const nextId = item.id || item.tmdbId
            if (item.media_type === 'tv' || item.name) {
              onSelectTV ? onSelectTV(nextId) : (window.location.href = `/tvshow/${nextId}`)
            } else {
              onSelectMovie ? onSelectMovie(nextId) : (window.location.href = `/mov/${nextId}`)
            }
          }}
        />
        <CommunityReviews mediaId={tmdbId} title={movie.title} profile={profile} />
      </div>
    </div>
  )
}

