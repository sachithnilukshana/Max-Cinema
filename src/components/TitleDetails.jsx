import React, { useEffect, useState } from 'react'
import { api, formatRating, getYear, posterUrl } from '../lib/api.js'
import WatchOptions from './WatchOptions.jsx'
import styles from './TitleDetails.module.css'

function runtimeLabel(details, mediaType) {
  if (mediaType === 'tv') return `${details.number_of_seasons || 1} season${details.number_of_seasons === 1 ? '' : 's'}`
  if (!details.runtime) return null
  const hours = Math.floor(details.runtime / 60)
  const minutes = details.runtime % 60
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

export default function TitleDetails({ id, mediaType, onSelect }) {
  const [details, setDetails] = useState(null)
  const [credits, setCredits] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [trailer, setTrailer] = useState(null)
  const [trailerOpen, setTrailerOpen] = useState(false)
  const [fullPageOpen, setFullPageOpen] = useState(false)

  useEffect(() => {
    if (!trailerOpen && !fullPageOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setTrailerOpen(false)
        setFullPageOpen(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [trailerOpen, fullPageOpen])

  useEffect(() => {
    let active = true
    setDetails(null)
    setCredits([])
    setRecommendations([])
    setTrailer(null)
    const methods = mediaType === 'tv'
      ? [api.tvDetails, api.tvCredits, api.tvVideos, api.tvRecommendations]
      : [api.movieDetails, api.movieCredits, api.movieVideos, api.movieRecommendations]

    Promise.all(methods.map(method => method(id)))
      .then(([title, creditData, videoData, recommendedData]) => {
        if (!active) return
        setDetails(title)
        setCredits((creditData.cast || []).slice(0, 6))
        setRecommendations((recommendedData.results || []).slice(0, 6))
        setTrailer((videoData.results || []).find(video => video.site === 'YouTube' && video.type === 'Trailer') || null)

        if (window.cinescope) {
          if (mediaType === 'tv') {
            window.cinescope.trackTVView(title.id || title.tmdbId, title.name || title.title)
          } else {
            window.cinescope.trackMovieView(title.id || title.tmdbId, title.title)
          }
        }
      })
      .catch(() => {
        if (!active) setDetails(null)
      })
    return () => { active = false }
  }, [id, mediaType])

  if (!details) return null

  const title = mediaType === 'tv' ? details.name : details.title
  const date = mediaType === 'tv' ? details.first_air_date : details.release_date
  const facts = [
    getYear(date),
    runtimeLabel(details, mediaType),
    formatRating(details.vote_average) && `★ ${formatRating(details.vote_average)}`,
  ].filter(Boolean)

  return (
    <section className={`${styles.wrap} ${details.backdrop_path ? styles.withBackdrop : ''}`} style={details.backdrop_path ? { '--detail-backdrop': `url(https://image.tmdb.org/t/p/w1280${details.backdrop_path})` } : undefined} aria-label={`${title} details`}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>About this title</p>
          <h3>{title}</h3>
        </div>
        <div className={styles.headingActions}>
          {trailer && (
            <button
              type="button"
              className={styles.trailer}
              onClick={() => {
                if (window.cinescope) {
                  window.cinescope.track('trailer_click', { movieId: details.id || details.tmdbId || id, title })
                }
                setTrailerOpen(true)
              }}
            >
              Watch trailer
            </button>
          )}
          <button type="button" className={styles.fullDetails} onClick={() => setFullPageOpen(true)}>Full details</button>
        </div>
      </div>
      <p className={styles.facts}>{facts.join(' · ')}</p>
      {details.overview && <p className={styles.overview}>{details.overview}</p>}
      {!!details.genres?.length && <div className={styles.genres}>{details.genres.slice(0, 5).map(genre => <span key={genre.id}>{genre.name}</span>)}</div>}

      {!!credits.length && (
        <div className={styles.block}>
          <h4>Cast</h4>
          <div className={styles.cast}>
            {credits.map(person => (
              <div key={person.credit_id || person.id} className={styles.person}>
                {person.profile_path
                  ? <img src={posterUrl(person.profile_path)} alt="" loading="lazy" />
                  : <div className={styles.personFallback} aria-hidden="true">{person.name?.slice(0, 1)}</div>}
                <span>{person.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!recommendations.length && (
        <div className={styles.block}>
          <h4>You may also like</h4>
          <div className={styles.recommendations}>
            {recommendations.map(item => {
              const name = mediaType === 'tv' ? item.name : item.title
              return (
                <button key={item.id} type="button" className={styles.recommendation} onClick={() => onSelect?.(item)}>
                  {item.poster_path && <img src={posterUrl(item.poster_path)} alt="" loading="lazy" />}
                  <span title={name}>{name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      {trailerOpen && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setTrailerOpen(false)}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-label={`${title} trailer`} onMouseDown={event => event.stopPropagation()}>
            <button type="button" className={styles.close} aria-label="Close trailer" onClick={() => setTrailerOpen(false)}>×</button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${trailer.key}?autoplay=1`}
              title={`${title} official trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </section>
        </div>
      )}
      {fullPageOpen && (
        <div className={styles.fullBackdrop} role="presentation" onMouseDown={() => setFullPageOpen(false)}>
          <section className={styles.fullPage} role="dialog" aria-modal="true" aria-label={`${title} full details`} onMouseDown={event => event.stopPropagation()}>
            <button type="button" className={styles.close} aria-label="Close details" onClick={() => setFullPageOpen(false)}>x</button>
            <div className={styles.fullHero} style={details.backdrop_path ? { backgroundImage: `url(https://image.tmdb.org/t/p/w1280${details.backdrop_path})` } : undefined}>
              <div>
                <p className={styles.eyebrow}>Full title details</p>
                <h2>{title}</h2>
                <p className={styles.facts}>{facts.join(' · ')}</p>
                {details.overview && <p className={styles.overview}>{details.overview}</p>}
                {trailer && (
                  <button
                    type="button"
                    className={styles.trailer}
                    onClick={() => {
                      if (window.cinescope) {
                        window.cinescope.track('trailer_click', { movieId: details.id || details.tmdbId || id, title })
                      }
                      setTrailerOpen(true)
                    }}
                  >
                    Play official trailer
                  </button>
                )}
              </div>
            </div>
            <div className={styles.fullBody}>
              <WatchOptions id={id} mediaType={mediaType} />
              {!!credits.length && <div className={styles.block}><h4>Cast</h4><div className={styles.cast}>{credits.map(person => <div key={person.credit_id || person.id} className={styles.person}>{person.profile_path ? <img src={posterUrl(person.profile_path)} alt="" loading="lazy" /> : <div className={styles.personFallback}>{person.name?.slice(0, 1)}</div>}<span>{person.name}</span></div>)}</div></div>}
              {!!recommendations.length && <div className={styles.block}><h4>Related titles</h4><div className={styles.recommendations}>{recommendations.map(item => { const name = mediaType === 'tv' ? item.name : item.title; return <button key={item.id} type="button" className={styles.recommendation} onClick={() => { setFullPageOpen(false); onSelect?.(item) }}>{item.poster_path && <img src={posterUrl(item.poster_path)} alt="" loading="lazy" />}<span title={name}>{name}</span></button> })}</div></div>}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
