import React, { useEffect, useState } from 'react'
import { api, posterUrl } from '../lib/api.js'
import styles from './SeasonPicker.module.css'

export default function SeasonPicker({ show, onPlay, episodeProgress = {}, onToggleEpisode }) {
  const [seasons, setSeasons] = useState([])
  const [activeSeason, setActiveSeason] = useState(1)
  const [episodes, setEpisodes] = useState([])
  const [epLoading, setEpLoading] = useState(false)

  useEffect(() => {
    if (!show) return
    let active = true
    api.tvDetails(show.id).then(details => {
      if (!active) return
      const list = (details.seasons || []).filter(season => season.season_number > 0)
      const fallback = list.length ? list : Array.from({ length: details.number_of_seasons || 1 }, (_, index) => ({ season_number: index + 1 }))
      setSeasons(fallback)
      setActiveSeason(fallback.find(season => season.season_number === show.season)?.season_number || fallback[0]?.season_number || 1)
    }).catch(() => {
      if (!active) return
      setSeasons([{ season_number: 1 }])
      setActiveSeason(1)
    })
    return () => { active = false }
  }, [show?.id])

  useEffect(() => {
    if (!show || !activeSeason) return
    let active = true
    setEpLoading(true)
    setEpisodes([])
    api.seasonDetails(show.id, activeSeason)
      .then(data => { if (active) setEpisodes(data.episodes || []) })
      .catch(() => { if (active) setEpisodes([]) })
      .finally(() => { if (active) setEpLoading(false) })
    return () => { active = false }
  }, [show?.id, activeSeason])

  if (!show) return null
  const poster = posterUrl(show.poster_path)

  return (
    <div className={styles.wrap}>
      <div className={styles.showHeader}>
        {poster && <img src={poster} alt={show.name} className={styles.showPoster} />}
        <div className={styles.showMeta}>
          <h3 className={styles.showName}>{show.name}</h3>
          {show.first_air_date && <span className={styles.showYear}>{show.first_air_date.slice(0, 4)}</span>}
          {show.vote_average > 0 && <span className={styles.showRating}>★ {parseFloat(show.vote_average).toFixed(1)}</span>}
        </div>
      </div>

      <div className={styles.seasonTabs} aria-label="Seasons">
        {seasons.map(season => (
          <button
            key={season.season_number}
            type="button"
            className={`${styles.seasonTab} ${activeSeason === season.season_number ? styles.seasonActive : ''}`}
            onClick={() => setActiveSeason(season.season_number)}
          >
            S{season.season_number}
          </button>
        ))}
      </div>

      <div className={styles.episodesWrap}>
        {epLoading ? (
          <div className={styles.epGrid}>{Array.from({ length: 8 }).map((_, index) => <div key={index} className={styles.epSkeleton} />)}</div>
        ) : episodes.length ? (
          <div className={styles.epGrid}>
            {episodes.map(episode => {
              const episodeKey = `${show.id}:${activeSeason}:${episode.episode_number}`
              const watched = episodeProgress[episodeKey]
              return (
                <div key={episode.episode_number} className={`${styles.epCard} ${watched ? styles.watched : ''}`}>
                  <button type="button" className={styles.epPlay} onClick={() => onPlay(activeSeason, episode.episode_number)} title={`Play ${episode.name}`}>
                    <div className={styles.epThumb}>
                      {episode.still_path
                        ? <img src={`https://image.tmdb.org/t/p/w300${episode.still_path}`} alt={episode.name} loading="lazy" />
                        : <div className={styles.epThumbFallback}>▶</div>}
                      <div className={styles.epPlayOverlay}>▶</div>
                    </div>
                    <div className={styles.epInfo}>
                      <span className={styles.epNum}>E{episode.episode_number}</span>
                      <span className={styles.epName}>{episode.name}</span>
                      {episode.vote_average > 0 && <span className={styles.epRating}>★ {episode.vote_average.toFixed(1)}</span>}
                    </div>
                  </button>
                  {onToggleEpisode && <button type="button" className={styles.epMark} aria-pressed={watched} onClick={() => onToggleEpisode(activeSeason, episode.episode_number)}>{watched ? 'Watched' : 'Mark watched'}</button>}
                </div>
              )
            })}
          </div>
        ) : <p className={styles.noEps}>No episode data available.</p>}
      </div>
    </div>
  )
}
