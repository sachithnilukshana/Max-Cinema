import React, { useState, useEffect } from 'react'
import { posterUrl, formatRating, getYear } from '../lib/api.js'
import { getActiveProfile, isFavorite, toggleFavorite } from '../lib/profile.js'
import TrailerModal from './TrailerModal.jsx'
import styles from './MediaCard.module.css'

const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Doc',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
  10759: 'Action',
  10765: 'Sci-Fi',
  10768: 'Politics',
}

export default function MediaCard({ item, type = 'movie', onClick, selected, rank }) {
  const [profile] = useState(getActiveProfile)
  const [favorite, setFavorite] = useState(false)
  const [showTrailer, setShowTrailer] = useState(false)

  const mediaType = item.media_type || type
  const title = mediaType === 'movie' ? item.title : item.name
  const date = mediaType === 'movie' ? item.release_date : item.first_air_date
  const year = getYear(date)
  const rating = formatRating(item.vote_average)
  const poster = posterUrl(item.poster_path)

  const genreNames = Array.isArray(item.genre_ids)
    ? item.genre_ids.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 2)
    : (Array.isArray(item.genres) ? item.genres.map(g => g.name).slice(0, 2) : [])

  useEffect(() => {
    setFavorite(isFavorite(profile.id, item))
    const handleLibChange = () => setFavorite(isFavorite(profile.id, item))
    window.addEventListener('Max Cinema:librarychange', handleLibChange)
    return () => window.removeEventListener('Max Cinema:librarychange', handleLibChange)
  }, [profile.id, item])

  function handleFavoriteToggle(e) {
    e.stopPropagation()
    e.preventDefault()
    toggleFavorite(profile.id, item)
    setFavorite(prev => !prev)
  }

  function handleTrailerClick(e) {
    e.stopPropagation()
    e.preventDefault()
    setShowTrailer(true)
  }

  function handleCardClick() {
    onClick?.(item)
  }

  return (
    <>
      <article
        className={`${styles.card} ${selected ? styles.selected : ''} ${rank ? styles.rankedCard : ''}`}
        onClick={handleCardClick}
      >
        {/* Netflix-style Top 10 Large Stylized Number */}
        {rank && (
          <div className={styles.rankContainer} aria-hidden="true">
            <span className={styles.rankNumber}>{rank}</span>
          </div>
        )}

        <div className={styles.cardInner}>
          <div className={styles.poster}>
            {poster ? (
              <img src={poster} alt="" loading="lazy" />
            ) : (
              <div className={styles.noPoster} aria-hidden="true">
                {title?.slice(0, 2)}
              </div>
            )}

            {/* Quick 1-Click Favorite Toggle Button */}
            <button
              type="button"
              className={`${styles.favoriteBtn} ${favorite ? styles.isFavorite : ''}`}
              onClick={handleFavoriteToggle}
              title={favorite ? 'Remove from favorites' : 'Add to favorites'}
              aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {favorite ? '★' : '☆'}
            </button>

            {/* Hover Card Preview Overlay */}
            <div className={styles.hoverPreview}>
              <div className={styles.hoverActions}>
                <button
                  type="button"
                  className={styles.hoverPlayBtn}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClick?.(item)
                  }}
                  title="Play Title"
                >
                  ▶ Play
                </button>
                <button
                  type="button"
                  className={styles.hoverTrailerBtn}
                  onClick={handleTrailerClick}
                  title="Watch Trailer"
                >
                  🎬 Trailer
                </button>
              </div>

              {item.overview && (
                <p className={styles.hoverOverview}>
                  {item.overview.slice(0, 95)}
                  {item.overview.length > 95 ? '…' : ''}
                </p>
              )}

              {genreNames.length > 0 && (
                <div className={styles.hoverGenres}>
                  {genreNames.map(name => (
                    <span key={name} className={styles.genrePill}>{name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.info}>
            <div className={styles.infoTop}>
              {rating && <span className={styles.rating}>★ {rating}</span>}
              {year && <span className={styles.year}>{year}</span>}
            </div>
            <div className={styles.title} title={title}>{title}</div>
            <div className={styles.cardMeta}>
              {mediaType === 'tv' ? 'Series' : 'Movie'}
              {genreNames.length > 0 && ` · ${genreNames[0]}`}
            </div>
          </div>
        </div>
      </article>

      {showTrailer && (
        <TrailerModal
          title={title}
          id={item.id}
          mediaType={mediaType}
          onClose={() => setShowTrailer(false)}
        />
      )}
    </>
  )
}
