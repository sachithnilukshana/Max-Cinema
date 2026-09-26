import React from 'react'
import styles from './FilterBar.module.css'

const YEARS = [
  { value: '', label: 'All years' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2020', label: '2020s' },
  { value: '2015', label: '2015-2019' },
  { value: '2000', label: '2000s' },
  { value: '1995', label: '90s Classics' },
]

const RATINGS = [
  { value: '', label: 'Any rating' },
  { value: '8.5', label: '★ 8.5+ Masterpieces' },
  { value: '8.0', label: '★ 8.0+ Top Rated' },
  { value: '7.0', label: '★ 7.0+ Recommended' },
]

const SORTS = [
  { value: 'popularity.desc', label: 'Most Popular' },
  { value: 'vote_average.desc', label: 'Highest Rated' },
  { value: 'primary_release_date.desc', label: 'Newest Releases' },
]

const GENRES = [
  { value: '', label: 'All genres' },
  { value: '28', label: 'Action' },
  { value: '12', label: 'Adventure' },
  { value: '16', label: 'Animation' },
  { value: '35', label: 'Comedy' },
  { value: '80', label: 'Crime' },
  { value: '18', label: 'Drama' },
  { value: '14', label: 'Fantasy' },
  { value: '27', label: 'Horror' },
  { value: '10749', label: 'Romance' },
  { value: '878', label: 'Sci-Fi' },
  { value: '53', label: 'Thriller' },
]

export default function FilterBar({
  year,
  onYearChange,
  minRating,
  onRatingChange,
  sortBy,
  onSortChange,
  genre,
  onGenreChange,
  onReset,
}) {
  const hasActiveFilters = Boolean(year || minRating || genre || (sortBy && sortBy !== 'popularity.desc'))

  return (
    <div className={styles.bar}>
      <div className={styles.filtersGroup}>
        {/* Genre filter */}
        <label className={styles.label}>
          <span>Genre</span>
          <select
            value={genre || ''}
            onChange={e => onGenreChange(e.target.value)}
            className={styles.select}
          >
            {GENRES.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </label>

        {/* Year filter */}
        <label className={styles.label}>
          <span>Year</span>
          <select
            value={year || ''}
            onChange={e => onYearChange(e.target.value)}
            className={styles.select}
          >
            {YEARS.map(y => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
        </label>

        {/* Rating filter */}
        <label className={styles.label}>
          <span>Rating</span>
          <select
            value={minRating || ''}
            onChange={e => onRatingChange(e.target.value)}
            className={styles.select}
          >
            {RATINGS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </label>

        {/* Sort filter */}
        <label className={styles.label}>
          <span>Sort By</span>
          <select
            value={sortBy || 'popularity.desc'}
            onChange={e => onSortChange(e.target.value)}
            className={styles.select}
          >
            {SORTS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={onReset}
            title="Reset all filters"
          >
            ✕ Reset
          </button>
        )}
      </div>
    </div>
  )
}
