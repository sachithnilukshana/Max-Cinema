import React, { useEffect, useState } from 'react'
import { cinescopeApi, normalizeCinescopeItem } from '../lib/cinescopeApi.js'
import MediaGrid from './MediaGrid.jsx'
import styles from './CuratedCollections.module.css'

export default function CuratedCollections({ onSelectTitle, selectedId }) {
  const [collections, setCollections] = useState([])
  const [activeCollectionId, setActiveCollectionId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    cinescopeApi.getCollections()
      .then(data => {
        if (!active) return
        if (Array.isArray(data) && data.length > 0) {
          setCollections(data)
          setActiveCollectionId(data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  if (loading || !collections.length) {
    return null
  }

  const activeCollection = collections.find(c => c.id === activeCollectionId) || collections[0]
  const normalizedItems = (activeCollection?.items || [])
    .map(normalizeCinescopeItem)
    .filter(Boolean)

  return (
    <section className={styles.section} aria-label="Curated Collections">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Editorial selections</p>
          <h2 className={styles.heading}>Curated Collections</h2>
        </div>
      </div>

      <div className={styles.collectionTabs}>
        {collections.map(col => {
          const isActive = col.id === activeCollection?.id
          return (
            <button
              key={col.id}
              type="button"
              className={`${styles.tabBtn} ${isActive ? styles.activeTab : ''}`}
              onClick={() => setActiveCollectionId(col.id)}
            >
              {col.coverImage && (
                <img src={col.coverImage} alt="" className={styles.tabThumb} loading="lazy" />
              )}
              <div className={styles.tabText}>
                <span className={styles.tabTitle}>{col.name}</span>
                {col.items?.length > 0 && (
                  <span className={styles.tabCount}>{col.items.length} titles</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {activeCollection && (
        <div className={styles.collectionInfo}>
          {activeCollection.description && (
            <p className={styles.description}>{activeCollection.description}</p>
          )}
          {normalizedItems.length > 0 ? (
            <MediaGrid
              items={normalizedItems}
              type="movie"
              onSelect={onSelectTitle}
              selectedId={selectedId}
            />
          ) : (
            <p className={styles.emptyNote}>No titles added to this collection yet.</p>
          )}
        </div>
      )}
    </section>
  )
}

