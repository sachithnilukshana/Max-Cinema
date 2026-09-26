import React, { useState, useEffect, useRef } from 'react'
import { api, apiErrorMessage, tvEmbedUrl, formatRating, getYear } from '../lib/api.js'
import { loadLibrary, markEpisodeWatched, recordContinueWatching, setEpisodeWatched } from '../lib/profile.js'
import { trackSearch, trackTVView } from '../lib/cinescopeApi.js'
import MediaGrid from '../components/MediaGrid.jsx'
import Player from '../components/Player.jsx'
import SeasonPicker from '../components/SeasonPicker.jsx'
import WatchOptions from '../components/WatchOptions.jsx'
import TitleDetails from '../components/TitleDetails.jsx'
import PersonalControls from '../components/PersonalControls.jsx'
import ContinueWatching from '../components/ContinueWatching.jsx'
import SearchSuggestions from '../components/SearchSuggestions.jsx'
import CategoryRail from '../components/CategoryRail.jsx'
import FilterBar from '../components/FilterBar.jsx'
import styles from './TV.module.css'

function persist(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)) } catch {} }
function hydrate(key) { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null } }

export default function TV({ profile }) {
  const [query, setQuery] = useState(() => hydrate('tv_query') || '')
  const [results, setResults] = useState([])
  const [trendingTV, setTrendingTV] = useState([])
  const [popularShows, setPopularShows] = useState([])
  const [topRatedShows, setTopRatedShows] = useState([])
  const [koreanShows, setKoreanShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(() => hydrate('tv_selected'))
  const [player, setPlayer] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [episodeProgress, setEpisodeProgress] = useState(() => loadLibrary(profile.id).episodeProgress)

  // Advanced Filters
  const [filterYear, setFilterYear] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterSort, setFilterSort] = useState('popularity.desc')
  const [filterGenre, setFilterGenre] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)

  const playerAnchorRef = useRef(null)
  const didRestore = useRef(false)

  // Load trending, rails, or restore last search
  useEffect(() => {
    // Fetch rails
    api.popularTV()
      .then(d => setPopularShows(d.results || []))
      .catch(() => {})

    api.topRatedTV()
      .then(d => setTopRatedShows(d.results || []))
      .catch(() => {})

    api.koreanDramas()
      .then(d => setKoreanShows(d.results || []))
      .catch(() => {})

    const savedQuery = hydrate('tv_query') || ''
    if (savedQuery) {
      api.searchTV(savedQuery)
        .then(d => setResults(d.results || []))
        .catch(err => setError(apiErrorMessage(err, 'TV series')))
        .finally(() => setLoading(false))
    } else {
      api.trendingTV()
        .then(d => {
          const list = d.results || []
          setTrendingTV(list)
          setResults(list)
        })
        .catch(err => setError(apiErrorMessage(err, 'Trending series')))
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
    setIsFiltering(false)
    persist('tv_query', q)
    try {
      const d = await api.searchTV(q)
      setResults(d.results || [])
    } catch (err) {
      setError(apiErrorMessage(err, 'Search results'))
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange({ year = filterYear, minRating = filterRating, sortBy = filterSort, genre = filterGenre }) {
    setFilterYear(year)
    setFilterRating(minRating)
    setFilterSort(sortBy)
    setFilterGenre(genre)

    const hasFilters = Boolean(year || minRating || genre || (sortBy && sortBy !== 'popularity.desc'))
    if (!hasFilters) {
      handleResetFilter()
      return
    }

    setIsFiltering(true)
    setLoading(true)
    setError('')

    api.discoverTV({ year, minRating, sortBy, genre })
      .then(d => setResults(d.results || []))
      .catch(err => setError(apiErrorMessage(err, 'Filtered TV series')))
      .finally(() => setLoading(false))
  }

  function handleResetFilter() {
    setFilterYear('')
    setFilterRating('')
    setFilterSort('popularity.desc')
    setFilterGenre('')
    setIsFiltering(false)
    setResults(trendingTV.length > 0 ? trendingTV : results)
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
      src: tvEmbedUrl(show.id, season, episode),
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
      <form className={styles.searchRow} onSubmit={search}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search TV series…"
          className={styles.input}
        />
        <button type="submit" className={styles.btn}>Search</button>
      </form>
      <SearchSuggestions query={query} type="tv" onSelect={selectSuggestion} />

      {/* Advanced Filter and Sorting Bar */}
      <FilterBar
        year={filterYear}
        onYearChange={year => handleFilterChange({ year })}
        minRating={filterRating}
        onRatingChange={minRating => handleFilterChange({ minRating })}
        sortBy={filterSort}
        onSortChange={sortBy => handleFilterChange({ sortBy })}
        genre={filterGenre}
        onGenreChange={genre => handleFilterChange({ genre })}
        onReset={handleResetFilter}
      />

      {player && (
        <div ref={playerAnchorRef}>
          <Player
            {...player}
            onClose={() => { setPlayer(null); persist('tv_player', null) }}
            onNextEpisode={nextEpisode}
          />
          <PersonalControls profile={profile} item={player.item || { id: player.selectedId, name: player.title, media_type: 'tv' }} />
          <WatchOptions id={player.selectedId} mediaType={player.mediaType || 'tv'} />
          <TitleDetails id={player.selectedId} mediaType={player.mediaType || 'tv'} onSelect={selectShow} />
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

      {/* Category Rails for TV Series (Netflix Style) */}
      {!query && !isFiltering && (
        <>
          {/* Top 10 Trending TV Rail */}
          <CategoryRail
            title="Top 10 TV Shows This Week"
            subtitle="The most-watched series streaming right now"
            items={trendingTV.length > 0 ? trendingTV : results}
            type="tv"
            top10={true}
            onSelect={selectShow}
            selectedId={selected?.id}
            loading={loading && trendingTV.length === 0}
          />

          {/* Popular TV Series Rail */}
          {popularShows.length > 0 && (
            <CategoryRail
              title="Popular TV Series"
              subtitle="Audience favorites and fan-favorite shows"
              items={popularShows}
              type="tv"
              onSelect={selectShow}
              selectedId={selected?.id}
            />
          )}

          {/* Top Rated TV Series Rail */}
          {topRatedShows.length > 0 && (
            <CategoryRail
              title="Top Rated TV Series (★ 8.0+)"
              subtitle="Iconic television series with top critical acclaim"
              items={topRatedShows}
              type="tv"
              onSelect={selectShow}
              selectedId={selected?.id}
            />
          )}

          {/* Korean Dramas Rail */}
          {koreanShows.length > 0 && (
            <CategoryRail
              title="Korean Dramas &amp; Asian Series"
              subtitle="Binge-worthy K-dramas with captivating stories"
              items={koreanShows}
              type="tv"
              onSelect={selectShow}
              selectedId={selected?.id}
            />
          )}
        </>
      )}

      <p className={styles.sectionLabel}>
        {query || isFiltering ? (query ? 'Search Results' : 'Filtered TV Series') : 'Explore All Series'}
      </p>
      <MediaGrid
        items={results}
        type="tv"
        loading={loading}
        onSelect={selectShow}
        selectedId={selected?.id}
        emptyAction={() => {
          setQuery('')
          persist('tv_query', null)
          handleResetFilter()
        }}
        emptyActionLabel="Browse all TV shows"
      />
    </div>
  )
}
