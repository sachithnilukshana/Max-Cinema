import React, { useState, useEffect, useRef } from 'react'
import { api, apiErrorMessage, tvEmbedUrl, formatRating, getYear } from '../lib/api.js'
import { loadLibrary, markEpisodeWatched, recordContinueWatching, setEpisodeWatched } from '../lib/profile.js'
import { trackSearch, trackTVView } from '../lib/cinescopeApi.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import MediaGrid from '../components/MediaGrid.jsx'
import Player from '../components/Player.jsx'
import SeasonPicker from '../components/SeasonPicker.jsx'
import WatchOptions from '../components/WatchOptions.jsx'
import TitleDetails from '../components/TitleDetails.jsx'
import PersonalControls from '../components/PersonalControls.jsx'
import ContinueWatching from '../components/ContinueWatching.jsx'
import SearchSuggestions from '../components/SearchSuggestions.jsx'
import CommunityReviews from '../components/CommunityReviews.jsx'
import styles from './TV.module.css'

function persist(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)) } catch {} }
function hydrate(key) { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null } }

export default function TV({ profile }) {
  const [query, setQuery] = useState(() => hydrate('tv_query') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => hydrate('tv_selected'))
  const [player, setPlayer] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [episodeProgress, setEpisodeProgress] = useState(() => loadLibrary(profile.id).episodeProgress)
  const playerAnchorRef = useRef(null)
  const didRestore = useRef(false)
  const { isPremium } = usePremium()

  // Load trending (24 top TV series) or restore last search
  useEffect(() => {
    const savedQuery = hydrate('tv_query') || ''
    if (savedQuery) {
      api.searchTV(savedQuery, 24)
        .then(d => setResults(d.results || []))
        .catch(error => setError(apiErrorMessage(error, 'TV series')))
        .finally(() => setLoading(false))
    } else {
      api.trendingTV(24)
        .then(d => setResults(d.results || []))
        .catch(error => setError(apiErrorMessage(error, 'Trending series')))
        .finally(() => setLoading(false))
    }
  }, [])

  useEffect(() => {
    setEpisodeProgress(loadLibrary(profile.id).episodeProgress)
  }, [profile.id])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  // If user had a show selected + episode playing on last visit, restore it
  useEffect(() => {
    if (didRestore.current) return
    const savedPlayer = hydrate('tv_player')
    if (savedPlayer) {
      setPlayer(savedPlayer)
      setShowPicker(false)
      didRestore.current = true
    }
  }, [])

  async function search(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    trackSearch(q)
    setLoading(true)
    setError('')
    setNotice('')
    setResults([])
    persist('tv_query', q)
    try {
      const d = await api.searchTV(q)
      setResults(d.results || [])
    } catch (error) {
      setError(apiErrorMessage(error, 'Search results'))
    } finally {
      setLoading(false)
    }
  }

  function selectShow(item) {
    trackTVView(item)
    setSelected(item)
    persist('tv_selected', item)
    setShowPicker(true)
    setPlayer(null)
    setTimeout(() => {
      document.getElementById('season-picker-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function selectSuggestion(item) {
    setQuery(item.name || '')
    selectShow(item)
  }

  function playerFor(show, season, episode) {
    return {
      src: tvEmbedUrl(show.id, season, episode, isPremium),
      title: show.name,
      year: getYear(show.first_air_date),
      rating: formatRating(show.vote_average),
      overview: show.overview?.slice(0, 220),
      badge: `S${season} · E${episode}`,
      selectedId: show.id,
      mediaType: 'tv',
      item: { ...show, media_type: 'tv', season, episode },
    }
  }

  function handlePlay(season, episode) {
    if (!selected) return
    const p = playerFor(selected, season, episode)
    recordContinueWatching(profile.id, p.item)
    setPlayer(p)
    persist('tv_player', p)
    setTimeout(() => {
      playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function resumeShow(item) {
    if (!item.season || !item.episode) {
      selectShow(item)
      return
    }
    const show = { ...item, media_type: 'tv' }
    const p = playerFor(show, item.season, item.episode)
    setSelected(show)
    setShowPicker(true)
    setPlayer(p)
    persist('tv_selected', show)
    persist('tv_player', p)
    recordContinueWatching(profile.id, p.item)
    setTimeout(() => playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function toggleEpisode(season, episode) {
    if (!selected) return
    const next = setEpisodeWatched(profile.id, selected.id, season, episode)
    setEpisodeProgress(next.episodeProgress)
  }

  async function nextEpisode() {
    if (!player?.item?.season || !player?.item?.episode) return
    try {
      const season = await api.seasonDetails(player.item.id, player.item.season)
      const next = (season.episodes || []).find(episode => episode.episode_number === player.item.episode + 1)
      if (!next) {
        setNotice('You have reached the end of this season.')
        return
      }
      const library = markEpisodeWatched(profile.id, player.item.id, player.item.season, player.item.episode)
      setEpisodeProgress(library.episodeProgress)
      handlePlay(player.item.season, next.episode_number)
    } catch {
      setNotice('The next episode could not be loaded.')
    }
  }

  return (
    <div>
      <h1 className={styles.srOnly}>Max Cinema — Stream Top 24 TV Series & Episodes</h1>
      <form className={styles.searchRow} onSubmit={search} role="search" aria-label="Search TV Series">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search TV series…"
          className={styles.input}
          aria-label="Search TV series"
        />
        <button type="submit" className={styles.btn}>Search</button>
      </form>
      <SearchSuggestions query={query} type="tv" onSelect={selectSuggestion} />

      {player && (
        <div ref={playerAnchorRef}>
          <Player {...player} tmdbId={player.selectedId} mediaType={player.mediaType || 'tv'} onClose={() => { setPlayer(null); persist('tv_player', null) }} onNextEpisode={nextEpisode} />
          <PersonalControls profile={profile} item={player.item || { id: player.selectedId, name: player.title, media_type: 'tv' }} />
          <WatchOptions id={player.selectedId} mediaType={player.mediaType || 'tv'} />
          <TitleDetails id={player.selectedId} mediaType={player.mediaType || 'tv'} onSelect={selectShow} />
          <CommunityReviews mediaId={player.selectedId} title={player.title} profile={profile} />
        </div>
      )}

      <ContinueWatching profile={profile} mediaType="tv" onSelect={resumeShow} />

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {selected && showPicker && (
        <div id="season-picker-anchor">
          <SeasonPicker show={selected} onPlay={handlePlay} episodeProgress={episodeProgress} onToggleEpisode={toggleEpisode} />
        </div>
      )}

      <p className={styles.sectionLabel}>{hydrate('tv_query') ? 'Results' : 'Trending Now'}</p>
      <MediaGrid
        items={results}
        type="tv"
        loading={loading}
        onSelect={selectShow}
        selectedId={selected?.id}
        uid={profile?.id}
      />
    </div>
  )
}
