import React, { useState } from 'react'
import styles from './FilterBar.module.css'

const YEARS = ['2026', '2025', '2024', '2023', '2022', '2021', '2020', '2010s', '2000s', '1990s']
const RATINGS = [
  { label: 'Any Rating', value: '' },
  { label: '★ 9.0+', value: '9' },
  { label: '★ 8.0+', value: '8' },
  { label: '★ 7.0+', value: '7' },
  { label: '★ 6.0+', value: '6' },
]
const SORT_OPTIONS = [
  { label: 'Popularity', value: 'popularity.desc' },
  { label: 'Highest Rated', value: 'vote_average.desc' },
  { label: 'Latest First', value: 'release_date.desc' },
  { label: 'Oldest First', value: 'release_date.asc' },
  { label: 'Title A–Z', value: 'original_title.asc' },
]

/**
 * FilterBar — advanced filter + sort controls.
 *
 * Props:
 *   genres        – array of { id, name } genre objects
 *   filters       – current filter state { year, rating, genre, sortBy }
 *   onFilterChange(key, value) – called when any control changes
 *   onReset()     – called when Reset is clicked
 */
export default function FilterBar({ genres = [], filters = {}, onFilterChange, onReset }) {
  const [open, setOpen] = useState(false)
  const activeCount = [filters.year, filters.rating, filters.genre]
    .filter(v => v && v !== '').length

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={`${styles.toggleBtn} ${activeCount > 0 ? styles.active : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Toggle filters"
      >
        <span>⚙ Filters{activeCount > 0 ? ` (${activeCount})` : ''}</span>
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.panel} role="group" aria-label="Filter controls">
          {/* Year */}
          <label className={styles.field}>
            <span>Year</span>
            <select
              value={filters.year || ''}
              onChange={e => onFilterChange?.('year', e.target.value)}
            >
              <option value="">Any Year</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>

          {/* Rating */}
          <label className={styles.field}>
            <span>Rating</span>
            <select
              value={filters.rating || ''}
              onChange={e => onFilterChange?.('rating', e.target.value)}
            >
              {RATINGS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>

          {/* Genre */}
          {genres.length > 0 && (
            <label className={styles.field}>
              <span>Genre</span>
              <select
                value={filters.genre || ''}
                onChange={e => onFilterChange?.('genre', e.target.value)}
              >
                <option value="">All Genres</option>
                {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
          )}

          {/* Sort */}
          <label className={styles.field}>
            <span>Sort By</span>
            <select
              value={filters.sortBy || 'popularity.desc'}
              onChange={e => onFilterChange?.('sortBy', e.target.value)}
            >
              {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>

          {/* Reset */}
          <button type="button" className={styles.resetBtn} onClick={onReset}>
            ✕ Reset
          </button>
        </div>
      )}
    </div>
  )
}
