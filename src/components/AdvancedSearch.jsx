// ── AdvancedSearch Component ────────────────────────────────────────────────
// Comprehensive search panel with filters, voice search, URL export, etc.
import { useState, useEffect, useRef, useCallback } from 'react'
import styles from './AdvancedSearch.module.css'

const GENRES = [
  'Action', 'Comedy', 'Drama', 'Horror', 'Romance',
  'Sci-Fi', 'Thriller', 'Animation', 'Documentary', 'Family',
]

const LANGUAGES = ['All', 'English', 'Sinhala', 'Tamil', 'Hindi', 'Korean', 'Japanese', 'Spanish']
const MEDIA_TYPES = ['All', 'Movies', 'TV Series']
const SORT_OPTIONS = ['Popularity', 'Rating', 'Newest', 'A-Z']

const YEAR_MIN = 1990
const YEAR_MAX = 2025

const DEFAULT_FILTERS = {
  genre: '',
  yearFrom: YEAR_MIN,
  yearTo: YEAR_MAX,
  rating: 0,
  language: 'All',
  mediaType: 'All',
  sortBy: 'Popularity',
}

function countActiveFilters(filters, query) {
  let count = 0
  if (query && query.trim()) count++
  if (filters.genre) count++
  if (filters.yearFrom > YEAR_MIN) count++
  if (filters.yearTo < YEAR_MAX) count++
  if (filters.rating > 0) count++
  if (filters.language !== 'All') count++
  if (filters.mediaType !== 'All') count++
  if (filters.sortBy !== 'Popularity') count++
  return count
}

function filtersToUrlParams(query, filters) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (filters.genre) params.set('genre', filters.genre)
  if (filters.yearFrom > YEAR_MIN) params.set('yearFrom', filters.yearFrom)
  if (filters.yearTo < YEAR_MAX) params.set('yearTo', filters.yearTo)
  if (filters.rating > 0) params.set('rating', filters.rating)
  if (filters.language !== 'All') params.set('lang', filters.language)
  if (filters.mediaType !== 'All') params.set('type', filters.mediaType)
  if (filters.sortBy !== 'Popularity') params.set('sort', filters.sortBy)
  return params.toString()
}

function parseUrlParams() {
  const params = new URLSearchParams(window.location.search)
  const query = params.get('q') || ''
  const filters = {
    genre: params.get('genre') || '',
    yearFrom: params.get('yearFrom') ? Number(params.get('yearFrom')) : YEAR_MIN,
    yearTo: params.get('yearTo') ? Number(params.get('yearTo')) : YEAR_MAX,
    rating: params.get('rating') ? Number(params.get('rating')) : 0,
    language: params.get('lang') || 'All',
    mediaType: params.get('type') || 'All',
    sortBy: params.get('sort') || 'Popularity',
  }
  return { query, filters }
}

/**
 * AdvancedSearch
 * @param {{ onSearch: Function, onFilter: Function, initialQuery: string }} props
 */
export default function AdvancedSearch({ onSearch, onFilter, initialQuery = '' }) {
  const urlDefaults = parseUrlParams()

  const [query, setQuery] = useState(urlDefaults.query || initialQuery || '')
  const [filters, setFilters] = useState(urlDefaults.filters)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [copied, setCopied] = useState(false)
  const [voiceError, setVoiceError] = useState('')

  const debounceRef = useRef(null)
  const recognitionRef = useRef(null)

  const activeCount = countActiveFilters(filters, query)

  // ── Debounced search ────────────────────────────────────────────────────────
  const fireSearch = useCallback(
    (q, f) => {
      if (onFilter) onFilter({ query: q, ...f })
      if (onSearch) onSearch([], q)
      // Update URL params for shareability
      const paramStr = filtersToUrlParams(q, f)
      const newUrl = `${window.location.pathname}${paramStr ? '?' + paramStr : ''}`
      window.history.replaceState(null, '', newUrl)
      window.dispatchEvent(new CustomEvent('Max Cinema:search', { detail: { query: q, filters: f } }))
    },
    [onFilter, onSearch]
  )

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fireSearch(query, filters)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, filters, fireSearch])

  // ── Filter change helpers ───────────────────────────────────────────────────
  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value }))

  const clearAll = () => {
    setQuery('')
    setFilters(DEFAULT_FILTERS)
  }

  // ── Voice search ────────────────────────────────────────────────────────────
  const startVoice = () => {
    setVoiceError('')
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceError('Voice search not supported in this browser.')
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onstart = () => setListening(true)
    rec.onresult = e => {
      const transcript = e.results[0][0].transcript
      setQuery(transcript)
      setListening(false)
    }
    rec.onerror = () => {
      setVoiceError('Could not capture voice. Please try again.')
      setListening(false)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  // ── Copy shareable link ─────────────────────────────────────────────────────
  const copyLink = () => {
    const paramStr = filtersToUrlParams(query, filters)
    const url = `${window.location.origin}${window.location.pathname}${paramStr ? '?' + paramStr : ''}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const years = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i)

  return (
    <div className={styles.container} role="search" aria-label="Advanced Search">
      {/* ── Search bar ── */}
      <div className={styles.searchRow}>
        <div className={styles.inputWrapper}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search movies, series, actors…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search query"
            autoComplete="off"
            spellCheck="false"
          />
          {query && (
            <button
              className={styles.clearBtn}
              onClick={() => setQuery('')}
              aria-label="Clear search"
              type="button"
            >
              ✕
            </button>
          )}
        </div>

        {/* Voice search */}
        <button
          className={`${styles.iconBtn} ${listening ? styles.listening : ''}`}
          onClick={listening ? stopVoice : startVoice}
          aria-label={listening ? 'Stop voice search' : 'Start voice search'}
          title={listening ? 'Stop listening' : 'Voice search'}
          type="button"
        >
          {listening ? '⏹' : '🎙'}
        </button>

        {/* Toggle filters */}
        <button
          className={`${styles.filterToggle} ${filtersOpen ? styles.open : ''}`}
          onClick={() => setFiltersOpen(v => !v)}
          aria-expanded={filtersOpen}
          aria-controls="adv-filter-panel"
          type="button"
        >
          <span>Filters</span>
          {activeCount > 0 && (
            <span className={styles.badge} aria-label={`${activeCount} active filters`}>
              {activeCount}
            </span>
          )}
          <span className={styles.chevron} aria-hidden="true">
            {filtersOpen ? '▲' : '▼'}
          </span>
        </button>
      </div>

      {/* Voice error */}
      {voiceError && <p className={styles.voiceError} role="alert">{voiceError}</p>}

      {/* ── Filter panel ── */}
      {filtersOpen && (
        <div
          id="adv-filter-panel"
          className={styles.filterPanel}
          role="region"
          aria-label="Search filters"
        >
          <div className={styles.filterGrid}>
            {/* Genre */}
            <div className={styles.filterField}>
              <label className={styles.label} htmlFor="as-genre">Genre</label>
              <select
                id="as-genre"
                className={styles.select}
                value={filters.genre}
                onChange={e => setFilter('genre', e.target.value)}
              >
                <option value="">All Genres</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Year From */}
            <div className={styles.filterField}>
              <label className={styles.label} htmlFor="as-year-from">Year From</label>
              <select
                id="as-year-from"
                className={styles.select}
                value={filters.yearFrom}
                onChange={e => setFilter('yearFrom', Number(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Year To */}
            <div className={styles.filterField}>
              <label className={styles.label} htmlFor="as-year-to">Year To</label>
              <select
                id="as-year-to"
                className={styles.select}
                value={filters.yearTo}
                onChange={e => setFilter('yearTo', Number(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Min Rating */}
            <div className={styles.filterField}>
              <label className={styles.label} htmlFor="as-rating">
                Min Rating: <strong className={styles.goldValue}>{filters.rating.toFixed(1)}</strong>
              </label>
              <input
                id="as-rating"
                className={styles.slider}
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={filters.rating}
                onChange={e => setFilter('rating', Number(e.target.value))}
                aria-valuetext={`${filters.rating} out of 10`}
              />
              <div className={styles.sliderLabels}>
                <span>0</span><span>10</span>
              </div>
            </div>

            {/* Language */}
            <div className={styles.filterField}>
              <label className={styles.label} htmlFor="as-language">Language</label>
              <select
                id="as-language"
                className={styles.select}
                value={filters.language}
                onChange={e => setFilter('language', e.target.value)}
              >
                {LANGUAGES.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Media Type */}
            <div className={styles.filterField}>
              <label className={styles.label} htmlFor="as-type">Type</label>
              <select
                id="as-type"
                className={styles.select}
                value={filters.mediaType}
                onChange={e => setFilter('mediaType', e.target.value)}
              >
                {MEDIA_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div className={styles.filterField}>
              <label className={styles.label} htmlFor="as-sort">Sort By</label>
              <select
                id="as-sort"
                className={styles.select}
                value={filters.sortBy}
                onChange={e => setFilter('sortBy', e.target.value)}
              >
                {SORT_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Footer actions ── */}
          <div className={styles.filterFooter}>
            <button
              className={styles.clearAllBtn}
              onClick={clearAll}
              type="button"
              disabled={activeCount === 0}
            >
              ✕ Clear All Filters
            </button>

            <button
              className={styles.shareBtn}
              onClick={copyLink}
              type="button"
              title="Copy shareable link"
            >
              {copied ? '✓ Copied!' : '🔗 Share Search'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
