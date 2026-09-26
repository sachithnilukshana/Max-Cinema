import React, { useEffect, useState } from 'react'
import { loadLibrary, removeFromContinueWatching, clearContinueWatching, toggleFavorite } from '../lib/profile.js'
import { posterUrl, formatRating, getYear, movieEmbedUrl, tvEmbedUrl } from '../lib/api.js'
import Player from '../components/Player.jsx'
import styles from './WatchHistory.module.css'

function formatTimeAgo(isoString) {
  if (!isoString) return ''
  try {
    const diffMs = Date.now() - new Date(isoString).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function WatchHistory({ profile, onBrowse }) {
  const [history, setHistory] = useState([])
  const [favorites, setFavorites] = useState([])
  const [filter, setFilter] = useState('all') // 'all' | 'movie' | 'tv' | 'favorites'
  const [player, setPlayer] = useState(null)

  function loadData() {
    const lib = loadLibrary(profile.id)
    setHistory(lib.continueWatching || [])
    setFavorites(lib.favoriteItems || [])
  }

  useEffect(() => {
    loadData()
    window.addEventListener('Max Cinema:librarychange', loadData)
    return () => window.removeEventListener('Max Cinema:librarychange', loadData)
  }, [profile.id])

  function handlePlay(item) {
    const isTV = item.media_type === 'tv' || Boolean(item.season)
    const title = item.title || item.name
    const src = isTV
      ? tvEmbedUrl(item.id, item.season || 1, item.episode || 1)
      : movieEmbedUrl(item.tmdbId || item.id)

    setPlayer({
      src,
      title,
      year: getYear(item.release_date || item.first_air_date),
      rating: formatRating(item.vote_average),
      overview: item.overview,
      badge: isTV && item.season ? `S${item.season} · E${item.episode}` : (isTV ? 'TV Series' : 'Movie'),
      item,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleRemove(item, event) {
    event.stopPropagation()
    removeFromContinueWatching(profile.id, item)
    loadData()
  }

  function handleToggleFavorite(item, event) {
    event.stopPropagation()
    toggleFavorite(profile.id, item)
    loadData()
  }

  function handleClear() {
    if (window.confirm('Are you sure you want to clear your entire watch history?')) {
      clearContinueWatching(profile.id)
      loadData()
    }
  }

  const isFavView = filter === 'favorites'
  const sourceList = isFavView ? favorites : history

  const filteredItems = isFavView
    ? favorites
    : history.filter(item => {
        if (filter === 'all') return true
        const type = item.media_type || (item.name ? 'tv' : 'movie')
        return type === filter
      })

  return (
    <div className={styles.wrap}>
      {player && (
        <div className={styles.playerWrap}>
          <Player {...player} onClose={() => setPlayer(null)} />
        </div>
      )}

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {isFavView ? 'My Bookmarks & Favorites' : 'Watch History'}
          </h1>
          <p className={styles.subtitle}>
            {isFavView
              ? (favorites.length > 0
                  ? `${favorites.length} title${favorites.length === 1 ? '' : 's'} saved to your personal favorites`
                  : 'Bookmark your favorite movies and shows to easily watch anytime')
              : (history.length > 0
                  ? `${history.length} title${history.length === 1 ? '' : 's'} in your recent viewing history`
                  : 'Keep track of everything you watch on Max Cinema')}
          </p>
        </div>

        {!isFavView && history.length > 0 && (
          <button type="button" className={styles.clearBtn} onClick={handleClear}>
            Clear History
          </button>
        )}
      </div>

      {(history.length > 0 || favorites.length > 0) && (
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'all' ? styles.activeFilter : ''}`}
            onClick={() => setFilter('all')}
          >
            All History ({history.length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'movie' ? styles.activeFilter : ''}`}
            onClick={() => setFilter('movie')}
          >
            Movies ({history.filter(i => (i.media_type || (i.name ? 'tv' : 'movie')) === 'movie').length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === 'tv' ? styles.activeFilter : ''}`}
            onClick={() => setFilter('tv')}
          >
            TV Series ({history.filter(i => (i.media_type || (i.name ? 'tv' : 'movie')) === 'tv').length})
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${styles.favFilterBtn} ${filter === 'favorites' ? styles.activeFilter : ''}`}
            onClick={() => setFilter('favorites')}
          >
            ★ Favorites ({favorites.length})
          </button>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>{isFavView ? '★' : '🎬'}</span>
          <h2>{isFavView ? 'No favorites saved yet' : 'No watch history yet'}</h2>
          <p>
            {isFavView
              ? 'Click the ★ button on any movie or TV series card to bookmark it here for quick 1-click access.'
              : 'Any movie or TV show you start watching will automatically appear here so you can easily resume anytime.'}
          </p>
          {onBrowse && (
            <button type="button" className={styles.browseBtn} onClick={onBrowse}>
              Browse Movies &amp; Shows
            </button>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredItems.map(item => {
            const isTV = item.media_type === 'tv' || Boolean(item.season)
            const title = item.title || item.name || 'Untitled'
            const poster = posterUrl(item.poster_path)
            const timeAgo = formatTimeAgo(item.lastPlayedAt || item.addedAt)

            return (
              <article key={`${item.media_type || 'title'}:${item.id}:${item.season || ''}:${item.episode || ''}`} className={styles.card}>
                <div className={styles.posterWrap} onClick={() => handlePlay(item)}>
                  {poster ? (
                    <img src={poster} alt="" loading="lazy" className={styles.poster} />
                  ) : (
                    <div className={styles.noPoster}>{title.slice(0, 2)}</div>
                  )}
                  <div className={styles.overlay}>
                    <span className={styles.playIcon}>▶</span>
                  </div>

                  {isFavView ? (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={(e) => handleToggleFavorite(item, e)}
                      aria-label={`Remove ${title} from favorites`}
                      title="Remove from favorites"
                    >
                      ★
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={(e) => handleRemove(item, e)}
                      aria-label={`Remove ${title} from history`}
                      title="Remove from history"
                    >
                      ✕
                    </button>
                  )}

                  {isTV && item.season && (
                    <span className={styles.episodeBadge}>S{item.season} E{item.episode}</span>
                  )}
                </div>

                <div className={styles.info}>
                  <h3 className={styles.cardTitle} onClick={() => handlePlay(item)} title={title}>
                    {title}
                  </h3>
                  <div className={styles.meta}>
                    <span>{isTV ? 'TV Series' : 'Movie'}</span>
                    {item.vote_average && <span className={styles.ratingSpan}>★ {parseFloat(item.vote_average).toFixed(1)}</span>}
                    {timeAgo && <span className={styles.timeAgo}>• {timeAgo}</span>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

