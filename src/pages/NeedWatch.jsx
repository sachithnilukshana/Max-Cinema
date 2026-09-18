import React, { useEffect, useRef, useState } from 'react'
import { formatRating, getYear, movieEmbedUrl, tvEmbedUrl } from '../lib/api.js'
import { getTitleKey, loadLibrary, loadWatchlist, markEpisodeWatched, recordContinueWatching, saveWatchlist, setEpisodeWatched } from '../lib/profile.js'
import MediaGrid from '../components/MediaGrid.jsx'
import Player from '../components/Player.jsx'
import SeasonPicker from '../components/SeasonPicker.jsx'
import WatchOptions from '../components/WatchOptions.jsx'
import TitleDetails from '../components/TitleDetails.jsx'
import PersonalControls from '../components/PersonalControls.jsx'
import ReleaseReminders from '../components/ReleaseReminders.jsx'
import styles from './NeedWatch.module.css'

export const DEFAULT_NEED_WATCH_ITEMS = [
  { id: 1248251, media_type: 'movie', title: 'Mollywood Times', release_date: '2026-06-05', poster_path: '/zUBCBtMsQ8dxnhJhhng4C8U80IU.jpg', vote_average: 6.2 },
  { id: 205082, media_type: 'tv', name: 'Vigilante', first_air_date: '2023-11-08', poster_path: '/lauvBkCZhcZHj5uUwUxwr5GTPps.jpg', vote_average: 8.5 },
  { id: 1432631, media_type: 'movie', title: 'Idhayam Murali', release_date: '2026-07-10', poster_path: '/8gfs5OsGINENFAl0h1XZPNup9lI.jpg', vote_average: 6.8 },
  { id: 259837, media_type: 'tv', name: 'The WONDERfools', first_air_date: '2026-05-15', poster_path: '/jj7AYkz2OLRDL1wfJmjTXyWQ5I4.jpg', vote_average: 8.9 },
  { id: 1276338, media_type: 'movie', title: 'Star', release_date: '2024-05-10', poster_path: '/c74qjGjs6XEKYDTYc1bxRzRkigT.jpg', vote_average: 7.3 },
  { id: 5920, media_type: 'tv', name: 'The Mentalist', first_air_date: '2008-09-23', poster_path: '/acYXu4KaDj1NIkMgObnhe4C4a0T.jpg', vote_average: 8.4 },
  { id: 531723, media_type: 'movie', title: 'Koode', release_date: '2018-07-14', poster_path: '/smOMGiWAcjedVQvHsSXtYWAEPLg.jpg', vote_average: 7.1 },
  { id: 1440735, media_type: 'movie', title: 'Couple Friendly', release_date: '2026-02-13', poster_path: '/kiKGBPQC6exxUbIrOMnDtuU4soC.jpg', vote_average: 7.2 },
  { id: 441717, media_type: 'movie', title: '96', release_date: '2018-10-04', poster_path: '/nrVloCa2hCFOztRF1DZU2jnWIiQ.jpg', vote_average: 7.7 },
  { id: 965979, media_type: 'movie', title: 'Dada', release_date: '2023-02-10', poster_path: '/x7C2u4oXoMFQBaSJqqcyU3qpwKy.jpg', vote_average: 7.2 },
  { id: 834654, media_type: 'movie', title: 'Ante... Sundaraniki!', release_date: '2022-06-10', poster_path: '/yzMsEhiW8ip3hweLCnu48t4RdWD.jpg', vote_average: 7.1 },
  { id: 631637, media_type: 'movie', title: 'Oh My Kadavule', release_date: '2020-02-13', poster_path: '/wuQwtFEm4DlzK3EnZ5VWefVXZvG.jpg', vote_average: 7.9 },
  { id: 1473354, media_type: 'movie', title: 'Sarvam Maya', release_date: '2025-12-25', poster_path: '/mgLY1aQayVX6dQ2DiylLAhjEG8w.jpg', vote_average: 7.9 },
  { id: 1408162, media_type: 'movie', title: 'Vishwanath & Sons', release_date: '2026-08-14', poster_path: '/mLsvCffzpxxDwC7yVLJSLLjgzoq.jpg', vote_average: 7.4 },
  { id: 926172, media_type: 'movie', title: 'Varalaru Mukkiyam', release_date: '2022-12-09', poster_path: '/Tx51gugSzdDcZUPnSg8JgR7TDb.jpg', vote_average: 5.3 },
  { id: 1270908, media_type: 'movie', title: 'The Pet Detective', release_date: '2025-10-16', poster_path: '/ydaAO8A9pIdtLN6K3hSAGVn08rH.jpg', vote_average: 4.3 },
  { id: 1273947, media_type: 'movie', title: 'Rebel', release_date: '2024-05-02', poster_path: '/6w7vApBT34Kb6B7ITxs45l9gswx.jpg', vote_average: 0 },
  { id: 321612, media_type: 'movie', title: 'Beauty and the Beast', release_date: '2017-03-16', poster_path: '/hKegSKIDep2ewJWPUQD7u0KqFIp.jpg', vote_average: 7 },
  { id: 1141320, media_type: 'movie', title: 'The Family Star', release_date: '2024-04-04', poster_path: '/2mLyHeWwU0Ocv9Jvk72IDqZqT7G.jpg', vote_average: 4.6 },
  { id: 894803, media_type: 'movie', title: 'Sita Ramam', release_date: '2022-08-05', poster_path: '/t1O94ZBzsQXJihtVkrsStRLyUDR.jpg', vote_average: 7.8 },
  { id: 653221, media_type: 'movie', title: 'Hridayam', release_date: '2022-01-21', poster_path: '/rMNzpbruCuBmYPWhaNLrKOlNKcu.jpg', vote_average: 7.2 },
  { id: 1229947, media_type: 'movie', title: 'Telusu Kada', release_date: '2025-10-17', poster_path: '/up78q9ZcU4UK45rZ6VxAFvoqPWr.jpg', vote_average: 4.3 },
  { id: 331750, media_type: 'tv', name: 'The Court', first_air_date: '2026-09-04', poster_path: '/iXUtd6fpt15vMZSO6du1uXQjcmv.jpg', vote_average: 10 },
  { id: 1273274, media_type: 'movie', title: 'Haal', release_date: '2025-12-25', poster_path: '/xmDQj0clWvkPiuvsl9LEwkrFjIA.jpg', vote_average: 4 },
  { id: 253372, media_type: 'tv', name: 'The Institute', first_air_date: '2025-07-13', poster_path: '/7JXZdWifaa6wL0XLRi0GJOlOA8y.jpg', vote_average: 7.6 },
  { id: 117376, media_type: 'tv', name: 'Vincenzo', first_air_date: '2021-02-20', poster_path: '/qbkSS1cTjT4DzIwD44bdhTuYgdT.jpg', vote_average: 8.5 },
  { id: 215072, media_type: 'tv', name: 'A Shop for Killers', first_air_date: '2024-01-17', poster_path: '/7yUY1HUyQuybbvkAAhLzQ7x1l9g.jpg', vote_average: 8.5 },
  { id: 259242, media_type: 'tv', name: 'Chutney Sambar', first_air_date: '2024-07-26', poster_path: '/4H9iN0Cs6D0wMnE1Psdq1xUUPhY.jpg', vote_average: 8.4 },
  { id: 1296338, media_type: 'movie', title: 'Sumathi Valavu', release_date: '2025-08-01', poster_path: '/3xIDlnwjMf7kCOpFq8GMmW8on95.jpg', vote_average: 6 },
  { id: 1508168, media_type: 'movie', title: 'Bethlehem Kudumba Unit', release_date: '2026-08-21', poster_path: '/uaSZiH6yoGaVJcqzKtrfSkqDuHX.jpg', vote_average: 8.8 },
  { id: 96462, media_type: 'tv', name: "It's Okay to Not Be Okay", first_air_date: '2020-06-20', poster_path: '/8XSJfLeImX8NszDUFnK1lbseCi8.jpg', vote_average: 8.5 },
  { id: 1431738, media_type: 'movie', title: 'Anbil Avan', release_date: '2026-09-25', poster_path: '/7DVimX44266Vo88y7n7YrpTSMdg.jpg', vote_average: 0 },
  { id: 781008, media_type: 'movie', title: 'Intern!', release_date: '2016-11-05', poster_path: '/ktPfWyXtkCP4T8bDg91hsrAUD0c.jpg', vote_average: 6 },
  { id: 1213076, media_type: 'movie', title: 'Fight Club', release_date: '2023-12-15', poster_path: '/1h6t9nCYVWOLRskB35K51payMok.jpg', vote_average: 6.6 },
  { id: 103731, media_type: 'movie', title: 'Mud', release_date: '2013-04-26', poster_path: '/o2jT5jQdKh1HAF0fMKuGwBOwOYB.jpg', vote_average: 7.1 },
  { id: 291496, media_type: 'tv', name: 'Our Sticky Love', first_air_date: '2026-08-07', poster_path: '/tSZ4aFpTGc8Oj52SuzPUUZ7WKL0.jpg', vote_average: 8.7 },
  { id: 62560, media_type: 'tv', name: 'Mr. Robot', first_air_date: '2015-06-24', poster_path: '/kv1nRqgebSsREnd7vdC2pSGjpLo.jpg', vote_average: 8.3 },
  { id: 1026114, media_type: 'movie', title: 'Christy', release_date: '2023-02-17', poster_path: '/vroJQMcR4hynkuFbqMhjA4NjOTK.jpg', vote_average: 4 },
]

export default function NeedWatch({ profile, onBrowse }) {
  const [player, setPlayer] = useState(null)
  const [selectedShow, setSelectedShow] = useState(null)
  const [items, setItems] = useState(() => loadWatchlist(profile.id, DEFAULT_NEED_WATCH_ITEMS))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [collectionFilter, setCollectionFilter] = useState('')
  const [episodeProgress, setEpisodeProgress] = useState(() => loadLibrary(profile.id).episodeProgress)
  const playerAnchorRef = useRef(null)
  const seasonPickerRef = useRef(null)

  useEffect(() => {
    setItems(loadWatchlist(profile.id, DEFAULT_NEED_WATCH_ITEMS))
    setPlayer(null)
    setSelectedShow(null)
    setEpisodeProgress(loadLibrary(profile.id).episodeProgress)
  }, [profile.id])

  useEffect(() => {
    saveWatchlist(profile.id, items)
  }, [items, profile.id])

  const collections = loadLibrary(profile.id).collections
  const library = loadLibrary(profile.id)
  const watchedCount = items.filter(item => item.watched).length
  const movieCount = items.filter(item => (item.media_type || (item.name ? 'tv' : 'movie')) === 'movie').length
  const tvCount = items.length - movieCount
  const genreCounts = items.flatMap(item => item.genre_ids || []).reduce((counts, id) => ({ ...counts, [id]: (counts[id] || 0) + 1 }), {})
  const favoriteGenre = Object.entries(genreCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
  const genreLabels = { 35: 'Comedy', 18: 'Drama', 10749: 'Romance', 53: 'Thriller', 28: 'Action', 27: 'Horror' }
  const visibleItems = items.filter(item => {
    const title = item.title || item.name || ''
    const matchesQuery = title.toLowerCase().includes(query.trim().toLowerCase())
    const matchesFilter = filter === 'all' || (filter === 'watched' ? item.watched : !item.watched)
    const selectedCollection = collections.find(collection => collection.id === collectionFilter)
    const matchesCollection = !selectedCollection || selectedCollection.itemKeys.includes(getTitleKey(item))
    return matchesQuery && matchesFilter && matchesCollection
  })

  function toggleWatched(item) {
    const key = getTitleKey(item)
    setItems(current => current.map(entry => getTitleKey(entry) === key ? { ...entry, watched: !entry.watched } : entry))
  }

  function removeItem(item) {
    const key = getTitleKey(item)
    setItems(current => current.filter(entry => getTitleKey(entry) !== key))
  }

  function resetList() {
    setItems(DEFAULT_NEED_WATCH_ITEMS.map(item => ({ ...item, watched: false })))
    setQuery('')
    setFilter('all')
  }

  function shareCollection() {
    const collection = collections.find(entry => entry.id === collectionFilter)
    if (!collection) return
    const collectionItems = items.filter(item => collection.itemKeys.includes(getTitleKey(item)))
    const payload = JSON.stringify({ app: 'Max Cinema', collection: collection.name, items: collectionItems }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'Max Cinema'}-collection.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function selectItem(item) {
    if (item.media_type === 'tv') {
      setSelectedShow(item)
      setPlayer(null)
      setTimeout(() => seasonPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      return
    }

    setSelectedShow(null)
    setPlayer({
      src: movieEmbedUrl(item.id),
      title: item.title,
      year: getYear(item.release_date),
      rating: formatRating(item.vote_average),
      selectedId: item.id,
      mediaType: 'movie',
      item,
    })
    recordContinueWatching(profile.id, item)
    setTimeout(() => playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function playEpisode(season, episode) {
    if (!selectedShow) return
    setPlayer({
      src: tvEmbedUrl(selectedShow.id, season, episode),
      title: selectedShow.name,
      year: getYear(selectedShow.first_air_date),
      rating: formatRating(selectedShow.vote_average),
      badge: `S${season} · E${episode}`,
      selectedId: selectedShow.id,
      mediaType: 'tv',
      item: { ...selectedShow, season, episode },
    })
    recordContinueWatching(profile.id, { ...selectedShow, season, episode })
    setTimeout(() => playerAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  function toggleEpisode(season, episode) {
    if (!selectedShow) return
    const next = setEpisodeWatched(profile.id, selectedShow.id, season, episode)
    setEpisodeProgress(next.episodeProgress)
  }

  async function nextEpisode() {
    if (!player?.item?.season || !player?.item?.episode) return
    try {
      const season = await api.seasonDetails(player.item.id, player.item.season)
      const next = (season.episodes || []).find(episode => episode.episode_number === player.item.episode + 1)
      if (next) {
        const library = markEpisodeWatched(profile.id, player.item.id, player.item.season, player.item.episode)
        setEpisodeProgress(library.episodeProgress)
        playEpisode(player.item.season, next.episode_number)
      }
    } catch {}
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Your collection</p>
          <h1>Need Watch</h1>
        </div>
        <span className={styles.count}>{items.length} saved</span>
      </div>

      <section className={styles.stats} aria-label="Need Watch statistics">
        <div><b>{items.length}</b><span>Titles saved</span></div>
        <div><b>{watchedCount}</b><span>Watched</span></div>
        <div><b>{movieCount} / {tvCount}</b><span>Movies · TV</span></div>
        <div><b>{genreLabels[favoriteGenre] || 'Your picks'}</b><span>Favorite mood</span></div>
      </section>

      <div className={styles.libraryTools}>
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          className={styles.librarySearch}
          placeholder="Search your list"
          aria-label="Search Need Watch"
        />
        <div className={styles.filters} aria-label="Watch status filter">
          {['all', 'unwatched', 'watched'].map(value => (
            <button
              key={value}
              type="button"
              className={`${styles.filter} ${filter === value ? styles.filterActive : ''}`}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <button type="button" className={styles.reset} onClick={resetList}>Restore list</button>
      </div>

      {!!collections.length && (
        <div className={styles.collectionFilters} aria-label="Collections">
          <span>Collections:</span>
          <button type="button" className={!collectionFilter ? styles.collectionActive : ''} onClick={() => setCollectionFilter('')}>All</button>
          {collections.map(collection => <button key={collection.id} type="button" className={collectionFilter === collection.id ? styles.collectionActive : ''} onClick={() => setCollectionFilter(collection.id)}>{collection.name}</button>)}
          {collectionFilter && <button type="button" className={styles.share} onClick={shareCollection}>Export collection</button>}
        </div>
      )}

      <ReleaseReminders profile={profile} items={items} />

      {player && (
        <div ref={playerAnchorRef}>
          <Player {...player} onClose={() => setPlayer(null)} onNextEpisode={player.mediaType === 'tv' ? nextEpisode : undefined} />
          <PersonalControls profile={profile} item={player.item || { id: player.selectedId, title: player.title, media_type: player.mediaType }} />
          <WatchOptions id={player.selectedId} mediaType={player.mediaType} />
          <TitleDetails id={player.selectedId} mediaType={player.mediaType} onSelect={selectItem} />
        </div>
      )}

      {selectedShow && (
        <div ref={seasonPickerRef} className={styles.seasonPicker}>
          <SeasonPicker show={selectedShow} onPlay={playEpisode} episodeProgress={episodeProgress} onToggleEpisode={toggleEpisode} />
        </div>
      )}

      <MediaGrid
        items={visibleItems}
        type="movie"
        loading={false}
        onSelect={selectItem}
        selectedId={player?.selectedId || selectedShow?.id}
        watchedKeys={items.filter(item => item.watched).map(getTitleKey)}
        onToggleWatched={toggleWatched}
        onRemove={removeItem}
        emptyAction={onBrowse}
        emptyActionLabel="Browse movies"
      />
    </div>
  )
}
