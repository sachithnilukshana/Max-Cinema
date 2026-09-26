import React, { useState, useEffect, useRef } from 'react'
import { api, apiErrorMessage, movieEmbedUrl, formatRating, getYear } from '../lib/api.js'
import { recordContinueWatching } from '../lib/profile.js'
import { cinescopeApi, normalizeCinescopeItem, trackMovieView, trackSearch } from '../lib/cinescopeApi.js'
import MediaGrid from '../components/MediaGrid.jsx'
import Player from '../components/Player.jsx'
import WatchOptions from '../components/WatchOptions.jsx'
import TitleDetails from '../components/TitleDetails.jsx'
import PersonalControls from '../components/PersonalControls.jsx'
import ContinueWatching from '../components/ContinueWatching.jsx'
import SearchSuggestions from '../components/SearchSuggestions.jsx'
import CuratedCollections from '../components/CuratedCollections.jsx'
import HeroCarousel from '../components/HeroCarousel.jsx'
import CategoryRail from '../components/CategoryRail.jsx'
import FilterBar from '../components/FilterBar.jsx'
import CineScopeAd from '../components/CineScopeAd.jsx'
import styles from './Movies.module.css'

function persist(key, val) {
  try { sessionStorage.setItem(key, JSON.stringify(val)) } catch {}
}
function hydrate(key) {
  try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null }
}

export default function Movies({ profile, adminConfig }) {
  const savedQuery = hydrate('mv_query') || ''
  const savedPlayer = hydrate('mv_player')

  const [query, setQuery] = useState(savedQuery)
  const [results, setResults] = useState([])
  const [trendingMovies, setTrendingMovies] = useState([])
  const [topRated, setTopRated] = useState([])
  const [latestMovies, setLatestMovies] = useState([])
  const [koreanShows, setKoreanShows] = useState([])
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState(savedQuery ? 'Results' : 'Trending Now')
  const [player, setPlayer] = useState(savedPlayer)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [homepageConfig, setHomepageConfig] = useState(null)
  const [apiFeatured, setApiFeatured] = useState([])

  // Advanced Filters
  const [filterYear, setFilterYear] = useState('')
  const [filterRating, setFilterRating] = useState('')
  const [filterSort, setFilterSort] = useState('popularity.desc')
  const [filterGenre, setFilterGenre] = useState('')
  const [isFiltering, setIsFiltering] = useState(false)

  const playerAnchorRef = useRef(null)

  // Primary data fetch
  useEffect(() => {
    cinescopeApi.getHomepage()
      .then(config => { if (config) setHomepageConfig(config) })
      .catch(() => {})

    cinescopeApi.getFeatured()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setApiFeatured(data.map(normalizeCinescopeItem).filter(Boolean))
        }
      })
      .catch(() => {})

    // Fetch Rails: Top Rated, Latest Releases (2025/2026), Korean Dramas
    api.topRatedMovies()
      .then(d => setTopRated(d.results || []))
      .catch(() => {})

    api.discoverMovies({ year: '2025', sortBy: 'popularity.desc' })
      .then(d => setLatestMovies(d.results || []))
      .catch(() => {})

    api.koreanDramas()
      .then(d => setKoreanShows(d.results || []))
      .catch(() => {})

    // Search or Trending
    if (savedQuery) {
      api.searchMovies(savedQuery)
        .then(d => setResults(d.results || []))
        .catch(err => setError(apiErrorMessage(err, 'Movies')))
        .finally(() => setLoading(false))
    } else {
      cinescopeApi.getTrending()
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const normalized = data.map(normalizeCinescopeItem).filter(Boolean)
            setTrendingMovies(normalized)
            setResults(normalized)
            setLoading(false)
          } else {
            return api.trendingMovies()
              .then(d => {
                const list = d.results || []
                setTrendingMovies(list)
                setResults(list)
              })
              .catch(err => setError(apiErrorMessage(err, 'Trending movies')))
              .finally(() => setLoading(false))
          }
        })
        .catch(() => {
          api.trendingMovies()
            .then(d => {
              const list = d.results || []
              setTrendingMovies(list)
              setResults(list)
            })
            .catch(err => setError(apiErrorMessage(err, 'Trending movies')))
            .finally(() => setLoading(false))
        })
    }
  }, [savedQuery])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  async function search(e) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    trackSearch(q)
    setLoading(true)
    setError('')
    setNotice('')
    setLabel('Results')
    setResults([])
    setIsFiltering(false)
    persist('mv_query', q)

    try {
      const d = await api.searchMovies(q)
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
    setLabel('Filtered Movies')

    api.discoverMovies({ year, minRating, sortBy, genre })
      .then(d => setResults(d.results || []))
      .catch(err => setError(apiErrorMessage(err, 'Filtered movies')))
      .finally(() => setLoading(false))
  }

  function handleResetFilter() {
    setFilterYear('')
    setFilterRating('')
    setFilterSort('popularity.desc')
    setFilterGenre('')
    setIsFiltering(false)
    setLabel('Trending Now')
    setResults(trendingMovies.length > 0 ? trendingMovies : results)
  }

  function select(item) {
    trackMovieView(item)

    const mediaType = item.media_type || (item.name ? 'tv' : 'movie')
    const libraryItem = { ...item, media_type: mediaType }
    const p = {
      src: movieEmbedUrl(item.tmdbId || item.id),
      title: item.title || item.name,
      year: getYear(item.release_date || item.first_air_date),
      rating: formatRating(item.vote_average),
      overview: item.overview?.slice(0, 220),
      selectedId: item.id || item.tmdbId,
      mediaType,
      item: libraryItem,
    }
    recordContinueWatching(profile.id, libraryItem)
    setPlayer(p)
    persist('mv_player', p)
    setTimeout(() => {
      playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  function closePlayer() {
    setPlayer(null)
    persist('mv_player', null)
  }

  function selectSuggestion(item) {
    setQuery(item.title || item.name || '')
    select(item)
  }

  const carouselItems = apiFeatured.length > 0 ? apiFeatured : (trendingMovies.length > 0 ? trendingMovies : results)

  return (
    <div>
      <form className={styles.searchRow} onSubmit={search}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search movies…"
          className={styles.input}
        />
        <button type="submit" className={styles.btn}>Search</button>
      </form>
      <SearchSuggestions query={query} type="movie" onSelect={selectSuggestion} />

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

      {adminConfig?.announcement && <p className={styles.announcement}>{adminConfig.announcement}</p>}

      {/* Hero Banner Carousel (Shown on default non-search view) */}
      {!query && !isFiltering && carouselItems.length > 0 && (
        <HeroCarousel items={carouselItems} onSelect={select} />
      )}

      {/* CineScope Dynamic Advertisement */}
      <CineScopeAd placement="HOMEPAGE" />

      <ContinueWatching profile={profile} mediaType="movie" onSelect={select} />

      {player && (
        <div ref={playerAnchorRef}>
          <Player {...player} onClose={closePlayer} />
          <PersonalControls profile={profile} item={player.item || { id: player.selectedId, title: player.title, media_type: 'movie' }} />
          <WatchOptions id={player.selectedId} mediaType={player.mediaType || 'movie'} />
          <TitleDetails id={player.selectedId} mediaType={player.mediaType || 'movie'} onSelect={select} />
        </div>
      )}

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* Category Rails (Netflix-Style Horizontal Scroll) */}
      {!query && !isFiltering && (
        <>
          {/* Rail 1: Top 10 Trending Now with stylized badges */}
          <CategoryRail
            title="Trending Now"
            subtitle="The 10 most popular movies streaming this week"
            items={trendingMovies.length > 0 ? trendingMovies : results}
            top10={true}
            onSelect={select}
            selectedId={player?.selectedId}
            loading={loading && trendingMovies.length === 0}
          />

          {/* Rail 2: Top Rated Movies */}
          {topRated.length > 0 && (
            <CategoryRail
              title="Top Rated Movies (★ 8.0+)"
              subtitle="Critically acclaimed masterpieces of all time"
              items={topRated}
              onSelect={select}
              selectedId={player?.selectedId}
            />
          )}

          {/* Rail 3: Latest Releases (2025/2026) */}
          {latestMovies.length > 0 && (
            <CategoryRail
              title="Latest Releases"
              subtitle="New films and fresh cinema debuts"
              items={latestMovies}
              onSelect={select}
              selectedId={player?.selectedId}
            />
          )}

          {/* Rail 4: Korean Dramas & Asian Cinema */}
          {koreanShows.length > 0 && (
            <CategoryRail
              title="Korean Dramas &amp; Asian Hits"
              subtitle="Phenomenal Korean dramas and Asian series"
              items={koreanShows}
              type="tv"
              onSelect={select}
              selectedId={player?.selectedId}
            />
          )}

          {/* CineScope Curated Collections Section */}
          <CuratedCollections
            onSelectTitle={select}
            selectedId={player?.selectedId}
          />
        </>
      )}

      {/* Grid: Always shown for Search or Filtering, or as Explore All at the bottom */}
      <p className={styles.sectionLabel}>
        {query || isFiltering ? label : 'Explore All Movies'}
      </p>
      <MediaGrid
        items={results}
        type="movie"
        loading={loading}
        onSelect={select}
        selectedId={player?.selectedId}
        emptyAction={() => {
          setQuery('')
          persist('mv_query', null)
          handleResetFilter()
        }}
        emptyActionLabel="Browse all movies"
      />
    </div>
  )
}
