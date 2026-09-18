import React, { useEffect, useState } from 'react'
import {
  addToCollection,
  addReport,
  createCollection,
  getTitleKey,
  loadLibrary,
  saveTitleReview,
  toggleFavorite,
} from '../lib/profile.js'
import styles from './PersonalControls.module.css'

export default function PersonalControls({ profile, item }) {
  const [library, setLibrary] = useState(() => loadLibrary(profile.id))
  const [note, setNote] = useState('')
  const [rating, setRating] = useState(0)
  const [collectionName, setCollectionName] = useState('')
  const [reported, setReported] = useState(false)

  useEffect(() => {
    const next = loadLibrary(profile.id)
    const key = getTitleKey(item)
    setLibrary(next)
    setNote(next.notes[key] || '')
    setRating(next.ratings[key] || 0)
    setReported(false)
  }, [item, profile.id])

  const key = getTitleKey(item)
  const favorite = library.favorites.includes(key)

  function refresh(next) {
    setLibrary(next)
  }

  function saveReview() {
    refresh(saveTitleReview(profile.id, item, { rating, note }))
  }

  function addCollection(event) {
    event.preventDefault()
    const next = createCollection(profile.id, collectionName)
    setCollectionName('')
    refresh(next)
  }

  function reportIssue() {
    addReport(profile.id, { title: item.title || item.name, mediaType: item.media_type || item.mediaType || 'movie', titleId: item.id, type: 'Playback issue' })
    setReported(true)
  }

  return (
    <section className={styles.wrap} aria-label="Your title controls">
      <div className={styles.topRow}>
        <button type="button" className={`${styles.favorite} ${favorite ? styles.active : ''}`} onClick={() => refresh(toggleFavorite(profile.id, item))}>
          {favorite ? '★ Favorited' : '☆ Add favorite'}
        </button>
        <label className={styles.rating}>
          Your rating
          <select value={rating} onChange={event => setRating(Number(event.target.value))}>
            <option value="0">Not rated</option>
            {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{'★'.repeat(value)}</option>)}
          </select>
        </label>
        <button type="button" className={styles.save} onClick={saveReview}>Save</button>
      </div>

      <label className={styles.note}>
        Private note
        <textarea value={note} maxLength="500" placeholder="What made you want to watch this?" onChange={event => setNote(event.target.value)} />
      </label>

      <div className={styles.collections}>
        <span>Collections</span>
         {library.collections.length ? library.collections.map(collection => (
          <button key={collection.id} type="button" onClick={() => refresh(addToCollection(profile.id, collection.id, item))}>
            + {collection.name}
          </button>
        )) : <em>Create a collection below.</em>}
      </div>
      <form className={styles.createCollection} onSubmit={addCollection}>
        <input value={collectionName} maxLength="40" placeholder="New collection, e.g. Weekend" onChange={event => setCollectionName(event.target.value)} />
        <button type="submit">Create</button>
      </form>
      <button type="button" className={styles.report} disabled={reported} onClick={reportIssue}>{reported ? 'Issue reported' : 'Report playback issue'}</button>
    </section>
  )
}
