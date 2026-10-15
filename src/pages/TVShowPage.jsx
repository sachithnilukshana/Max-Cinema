import React, { useEffect, useState, useRef } from 'react'
import { api, apiErrorMessage, tvEmbedUrl, formatRating, getYear } from '../lib/api.js'
import { recordContinueWatching, loadLibrary, setEpisodeWatched, markEpisodeWatched } from '../lib/profile.js'
import { trackTVView } from '../lib/cinescopeApi.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import Player from '../components/Player.jsx'
import SeasonPicker from '../components/SeasonPicker.jsx'
import PersonalControls from '../components/PersonalControls.jsx'
import WatchOptions from '../components/WatchOptions.jsx'
import TitleDetails from '../components/TitleDetails.jsx'
import CommunityReviews from '../components/CommunityReviews.jsx'
import styles from './TVShowPage.module.css'

export default function TVShowPage({
  tmdbId,
  initialSeason,
  initialEpisode,
  profile,
  onBack,
  onSelectMovie,
  onSelectTV,
  onNavigate,
}) {
  const [show, setShow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [season, setSeason] = useState(initialSeason || 1)
  const [episode, setEpisode] = useState(initialEpisode || 1)
  const [isPlaying, setIsPlaying] = useState(true)
  const [episodeProgress, setEpisodeProgress] = useState({})
  const { isPremium } = usePremium()
  const playerAnchorRef = useRef(null)

  useEffect(() => {
    if (profile?.id) {
      const lib = loadLibrary(profile.id)
      setEpisodeProgress(lib.episodeProgress || {})
    }
  }, [profile?.id])

  useEffect(() => {
    if (!tmdbId) return
    let active = true
    setLoading(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })

    api.tvDetails(tmdbId)
      .then(data => {
        if (!active) return
        setShow(data)
        const s = initialSeason || 1
        const e = initialEpisode || 1
        setSeason(s)
        setEpisode(e)
        setIsPlaying(true)
        document.title = `${data.name} S${s}E${e} — Watch on Max Cinema`

        const libraryItem = { ...data, media_type: 'tv', season: s, episode: e }
        recordContinueWatching(profile?.id, libraryItem)
        trackTVView(data)
      })
      .catch(err => {
        if (!active) return
        setError(apiErrorMessage(err, 'TV Series'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [tmdbId, profile?.id])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  function handlePlay(s, ep) {
    if (!show) return
    setSeason(s)
    setEpisode(ep)
    setIsPlaying(true)
    document.title = `${show.name} S${s}E${ep} — Watch on Max Cinema`

    const newPath = `/tvshow/${tmdbId}/${s}/${ep}`
    if (onNavigate) {
      onNavigate(newPath)
    } else {
      try {
        window.history.replaceState({}, '', newPath)
      } catch {}
    }

    const libraryItem = { ...show, media_type: 'tv', season: s, episode: ep }
    recordContinueWatching(profile?.id, libraryItem)
    trackTVView(show)

    setTimeout(() => {
      playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function toggleEpisode(s, ep) {
    if (!show) return
    const next = setEpisodeWatched(profile?.id, show.id, s, ep)
    setEpisodeProgress(next.episodeProgress)
  }

  async function nextEpisode() {
    if (!show || !season || !episode) return
    try {
      const seasonDetails = await api.seasonDetails(show.id, season)
      const next = (seasonDetails.episodes || []).find(epItem => epItem.episode_number === episode + 1)
      if (!next) {
        setNotice('You have reached the end of this season.')
        return
      }
      const library = markEpisodeWatched(profile?.id, show.id, season, episode)
      setEpisodeProgress(library.episodeProgress)
      handlePlay(season, next.episode_number)
    } catch {
      setNotice('The next episode could not be loaded.')
    }
  }

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
          <p style={{ color: 'var(--gold, #c8a96e)', fontWeight: 500 }}>Loading TV show details…</p>
        </div>
      </div>
    )
  }

  if (error || !show) {
    return (
      <div className={styles.pageWrap}>
        <div className={styles.topBar}>
          <button type="button" className={styles.backBtn} onClick={onBack}>
            ← Back to TV Shows
          </button>
        </div>
        <div className={styles.stateBox}>
          <h2 className={styles.errorTitle}>Could Not Load TV Show</h2>
          <p className={styles.errorDesc}>{error || 'The requested TV show was not found.'}</p>
          <button type="button" className={styles.backBtn} onClick={onBack} style={{ marginTop: '1rem' }}>
            Browse TV Shows
          </button>
        </div>
      </div>
    )
  }

  const year = getYear(show.first_air_date)
  const rating = formatRating(show.vote_average)
  const embedUrl = tvEmbedUrl(tmdbId, season, episode, isPremium)
  const currentItem = { ...show, media_type: 'tv', season, episode }

  return (
    <div className={styles.pageWrap}>
      <div className={styles.topBar}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back to TV Shows
        </button>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>Home</button>
          <span>/</span>
          <button type="button" onClick={onBack}>TV Shows</button>
          <span>/</span>
          <span className={styles.breadcrumbCurrent}>{show.name}</span>
        </nav>
      </div>

      {notice && <p className={styles.notice} role="status">{notice}</p>}

      {isPlaying && (
        <div className={styles.playerSection} ref={playerAnchorRef}>
          <Player
            src={embedUrl}
            title={show.name}
            year={year}
            rating={rating}
            overview={show.overview}
            badge={`S${season} · E${episode}`}
            tmdbId={tmdbId}
            mediaType="tv"
            onClose={() => setIsPlaying(false)}
            onNextEpisode={nextEpisode}
          />
          <PersonalControls profile={profile} item={currentItem} />
        </div>
      )}

      <div className={styles.pickerSection}>
        <SeasonPicker
          show={{ ...show, season }}
          onPlay={handlePlay}
          episodeProgress={episodeProgress}
          onToggleEpisode={toggleEpisode}
        />
      </div>

      <WatchOptions id={tmdbId} mediaType="tv" />
      <TitleDetails
        id={tmdbId}
        mediaType="tv"
        onSelect={item => {
          const nextId = item.id || item.tmdbId
          if (item.media_type === 'tv' || item.name) {
            onSelectTV ? onSelectTV(nextId) : (window.location.href = `/tvshow/${nextId}`)
          } else {
            onSelectMovie ? onSelectMovie(nextId) : (window.location.href = `/mov/${nextId}`)
          }
        }}
      />
      <CommunityReviews mediaId={tmdbId} title={show.name} profile={profile} />
    </div>
  )
}
