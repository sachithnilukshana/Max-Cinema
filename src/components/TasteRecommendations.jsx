import React, { useEffect, useState } from 'react'
import { api, posterUrl } from '../lib/api.js'
import styles from './TasteRecommendations.module.css'

const MENTALIST_ID = 5920

export default function TasteRecommendations({ onSelect, onAddToWatchlist }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    let active = true
    api.tvRecommendations(MENTALIST_ID)
      .then(data => { if (active) setItems((data.results || []).slice(0, 8)) })
      .catch(() => { if (active) setItems([]) })
    return () => { active = false }
  }, [])

  if (!items.length) return null

  return (
    <section className={styles.wrap} aria-label="Recommendations based on The Mentalist">
      <div className={styles.heading}>
        <div>
          <p>Picked for you</p>
          <h2>Because you like The Mentalist</h2>
        </div>
        <span>Crime, mystery, and character-driven series</span>
      </div>
      <div className={styles.row}>
        {items.map(item => (
          <article className={styles.card} key={item.id}>
            <button type="button" className={styles.open} onClick={() => onSelect(item)}>
              {item.poster_path ? <img src={posterUrl(item.poster_path)} alt="" loading="lazy" /> : <div className={styles.noPoster} />}
              <span>{item.name}</span>
            </button>
            <button type="button" className={styles.add} onClick={() => onAddToWatchlist(item)}>+ Need Watch</button>
          </article>
        ))}
      </div>
    </section>
  )
}
