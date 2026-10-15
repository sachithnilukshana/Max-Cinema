import React, { useState, useEffect, useRef } from 'react'
import { api, apiErrorMessage, movieEmbedUrl, formatRating, getYear, posterUrl } from '../lib/api.js'
import { recordContinueWatching } from '../lib/profile.js'
import { cinescopeApi, normalizeCinescopeItem, trackMovieView, trackSearch, trackTrailerClick } from '../lib/cinescopeApi.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import MediaGrid from '../components/MediaGrid.jsx'
import Player from '../components/Player.jsx'
import WatchOptions from '../components/WatchOptions.jsx'
import TitleDetails from '../components/TitleDetails.jsx'
import PersonalControls from '../components/PersonalControls.jsx'
import ContinueWatching from '../components/ContinueWatching.jsx'
import SearchSuggestions from '../components/SearchSuggestions.jsx'
import CuratedCollections from '../components/CuratedCollections.jsx'
import CineScopeAd from '../components/CineScopeAd.jsx'
import CommunityReviews from '../components/CommunityReviews.jsx'
import styles from './Movies.module.css'

const MOODS = [
  ['all', 'All moods'], ['35', 'Feel-good'], ['10749', 'Romance'], ['53', 'Thriller'],
  ['27', 'Horror'], ['18', 'Drama'], ['28', 'Action'],
]

const LANGUAGES = [
  ['', 'All languages'], ['ml', 'Malayalam'], ['ta', 'Tamil'], ['te', 'Telugu'],
  ['hi', 'Hindi'], ['ko', 'Korean'], ['en', 'English'],
]

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
  const [loading, setLoading] = useState(true)
  const [label, setLabel] = useState(savedQuery ? 'Results' : 'Trending Now')
  const [player, setPlayer] = useState(savedPlayer)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mood, setMood] = useState('all')
  const [language, setLanguage] = useState('')
  const [adminFeatured, setAdminFeatured] = useState(null)
  const [homepageConfig, setHomepageConfig] = useState(null)
  const [apiFeatured, setApiFeatured] = useState([])
  const [apiTrending, setApiTrending] = useState([])
  const playerAnchorRef = useRef(null)
  const { isPremium } = usePremium()

  // Primary data fetch
  useEffect(() => {
    // 1. Fetch CineScope dynamic homepage config
    cinescopeApi.getHomepage()
      .then(config => {
        if (config) setHomepageConfig(config)
      })
      .catch(() => {})

    // 2. Fetch CineScope dynamic featured titles
    cinescopeApi.getFeatured()
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setApiFeatured(data.map(normalizeCinescopeItem).filter(Boolean))
        }
      })
      .catch(() => {})

    // 3. Search or Trending (loads 24 top movies)
    if (savedQuery) {
      api.searchMovies(savedQuery, 24)
        .then(d => setResults(d.results || []))
        .catch(error => setError(apiErrorMessage(error, 'Movies')))
        .finally(() => setLoading(false))
    } else {
      // First try CineScope trending, backfill to 24 with TMDB
      cinescopeApi.getTrending()
        .then(async data => {
          let list = []
          if (Array.isArray(data) && data.length > 0) {
            list = data.map(normalizeCinescopeItem).filter(Boolean)
          }
          if (list.length < 24) {
            try {
              const tmdb = await api.trendingMovies(24)
              const tmdbList = tmdb.results || []
              const seen = new Set(list.map(x => x.id || x.tmdbId))
              for (const item of tmdbList) {
                if (!seen.has(item.id)) {
                  list.push(item)
                  seen.add(item.id)
                }
                if (list.length >= 24) break
              }
            } catch {}
          }
          const final24 = list.slice(0, 24)
          setApiTrending(final24)
          setResults(final24)
          setLoading(false)
        })
        .catch(() => {
          // Fallback to TMDB trending (24 items)
          api.trendingMovies(24)
            .then(d => setResults(d.results || []))
            .catch(error => setError(apiErrorMessage(error, 'Trending movies')))
            .finally(() => setLoading(false))
        })
    }
  }, [savedQuery])

  useEffect(() => {
    if (!adminConfig?.featuredMovieId) {
      setAdminFeatured(null)
      return
    }
    api.movieDetails(adminConfig.featuredMovieId).then(setAdminFeatured).catch(() => setAdminFeatured(null))
  }, [adminConfig?.featuredMovieId])

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
    persist('mv_query', q)
    try {
      const d = await api.searchMovies(q)
      setResults(d.results || [])
    } catch (error) {
      setError(apiErrorMessage(error, 'Search results'))
    } finally {
      setLoading(false)
    }
  }

  async function discover(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')
    setPlayer(null)
    setLabel('Curated picks')
    try {
      const data = await api.discoverMovies({ language, genre: mood === 'all' ? '' : mood })
      setResults(data.results || [])
    } catch (error) {
      setError(apiErrorMessage(error, 'Curated picks'))
    } finally {
      setLoading(false)
    }
  }

  function select(item) {
    trackMovieView(item)

    const mediaType = item.media_type || 'movie'
    const libraryItem = { ...item, media_type: mediaType }
    const p = {
      src: movieEmbedUrl(item.tmdbId || item.id, isPremium),
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
    setQuery(item.title || '')
    select(item)
  }

  // Hero calculation with graceful fallbacks
  const heroCandidate = adminFeatured || (apiFeatured.length > 0 ? apiFeatured[0] : null) || results[0]
  const heroMovie = homepageConfig?.heroMovie ? normalizeCinescopeItem(homepageConfig.heroMovie) : null
  const heroFeatured = heroMovie || heroCandidate

  const heroEnabled = homepageConfig ? homepageConfig.heroEnabled !== false : true
  const showHero = heroEnabled && label === 'Trending Now' && Boolean(heroFeatured || homepageConfig?.heroTitle)

  const heroTitle = homepageConfig?.heroTitle || heroFeatured?.title || 'Featured Film'
  const heroDescription = homepageConfig?.heroDescription || heroFeatured?.overview || 'A standout pick from this week’s movie conversation.'
  const heroCtaText = homepageConfig?.ctaText || 'Explore title'

  let heroBackdrop = homepageConfig?.heroBackgroundImage || heroFeatured?.backdrop_path
  if (heroBackdrop && !heroBackdrop.startsWith('http://') && !heroBackdrop.startsWith('https://')) {
    heroBackdrop = `https://image.tmdb.org/t/p/w1280${heroBackdrop}`
  }

  function handleHeroAction() {
    if (heroFeatured) {
      trackTrailerClick(heroFeatured)
      select(heroFeatured)
    }
  }

  return (
    <div>
      <h1 className={styles.srOnly}>Max Cinema — Stream Top 24 Movies & Discover New Releases</h1>
      <form className={styles.searchRow} onSubmit={search} role="search" aria-label="Search Movies">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search movies…"
          className={styles.input}
          aria-label="Search movies"
        />
        <button type="submit" className={styles.btn}>Search</button>
      </form>
      <SearchSuggestions query={query} type="movie" onSelect={selectSuggestion} />

      <form className={styles.discoveryControls} onSubmit={discover}>
        <label>
          Mood
          <select value={mood} onChange={event => setMood(event.target.value)}>
            {MOODS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
        <label>
          Language
          <select value={language} onChange={event => setLanguage(event.target.value)}>
            {LANGUAGES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
        <button type="submit">Find picks</button>
        <span>Audio and subtitle availability depends on the official provider.</span>
      </form>

      {adminConfig?.announcement && <p className={styles.announcement}>{adminConfig.announcement}</p>}

      {showHero && (
        <section
          className={styles.hero}
          style={heroBackdrop ? { backgroundImage: `url(${heroBackdrop})` } : undefined}
        >
          <div className={styles.heroContent}>
            <p className={styles.heroEyebrow}>{homepageConfig?.heroTitle ? 'CineScope Spotlight' : 'Featured this week'}</p>
            <h1>{heroTitle}</h1>
            <p>{heroDescription}</p>
            <button type="button" className={styles.heroButton} onClick={handleHeroAction}>
              {heroCtaText}
            </button>
          </div>
        </section>
      )}

      {/* CineScope Dynamic Advertisement */}
      <CineScopeAd placement="HOMEPAGE" />

      <ContinueWatching profile={profile} mediaType="movie" onSelect={select} />

      {player && (
        <div ref={playerAnchorRef}>
          <Player {...player} tmdbId={player.selectedId} mediaType={player.mediaType || 'movie'} onClose={closePlayer} />
          <PersonalControls profile={profile} item={player.item || { id: player.selectedId, title: player.title, media_type: 'movie' }} />
          <WatchOptions id={player.selectedId} mediaType={player.mediaType || 'movie'} />
          <TitleDetails id={player.selectedId} mediaType={player.mediaType || 'movie'} onSelect={select} />
          <CommunityReviews mediaId={player.selectedId} title={player.title} profile={profile} />
        </div>
      )}

      {notice && <p className={styles.notice} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* CineScope Admin Featured Section (when configured) */}
      {apiFeatured.length > 0 && !savedQuery && (
        <div className={styles.featuredSection}>
          <p className={styles.sectionLabel}>Featured Selections</p>
          <MediaGrid
            items={apiFeatured}
            type="movie"
            onSelect={select}
            selectedId={player?.selectedId}
            uid={profile?.id}
          />
        </div>
      )}

      {/* CineScope Curated Collections Section */}
      <CuratedCollections
        onSelectTitle={select}
        selectedId={player?.selectedId}
      />

      <p className={styles.sectionLabel}>{label}</p>
      <MediaGrid
        items={results}
        type="movie"
        loading={loading}
        onSelect={select}
        selectedId={player?.selectedId}
        uid={profile?.id}
        emptyAction={() => {
          setQuery('')
          persist('mv_query', null)
          setLabel('Trending Now')
          setLoading(true)
          if (apiTrending.length > 0) {
            setResults(apiTrending)
            setLoading(false)
          } else {
            api.trendingMovies(24)
              .then(data => setResults(data.results || []))
              .catch(error => setError(apiErrorMessage(error, 'Trending movies')))
              .finally(() => setLoading(false))
          }
        }}
        emptyActionLabel="Browse movies"
      />
    </div>
  )
}
