import React, { useEffect, useState, useCallback } from 'react'
import { cinescopeApi, normalizeCinescopeItem } from '../lib/cinescopeApi.js'
import CategoryRail from './CategoryRail.jsx'
import styles from './CuratedCollections.module.css'

export default function CuratedCollections({ onSelectTitle, selectedId }) {
  const [collections, setCollections] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [itemsMap, setItemsMap] = useState({}) // slug -> normalised items array
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)

  // Load collection list on mount
  useEffect(() => {
    let active = true
    cinescopeApi.getCollections()
      .then(data => {
        if (!active) return
        if (Array.isArray(data) && data.length > 0) {
          setCollections(data)
          setActiveId(data[0].id)
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadingMeta(false) })
    return () => { active = false }
  }, [])

  // Fetch items for the active collection (lazy, cached in itemsMap)
  const fetchCollectionItems = useCallback((collection) => {
    if (!collection) return
    const slug = collection.slug || collection.id
    // Return from cache if already loaded
    if (itemsMap[slug] !== undefined) return

    setLoadingItems(true)
    let active = true

    const loadSlug = async () => {
      let items = null

      // Try by slug first, fall back to using the cached `items` array already in the list response
      if (collection.slug) {
        const detail = await cinescopeApi.getCollectionBySlug(collection.slug)
        if (detail && Array.isArray(detail.items)) {
          items = detail.items
        }
      }

      // Fallback: collection list already carries items array in some backend versions
      if (!items && Array.isArray(collection.items)) {
        items = collection.items
      }

      if (!active) return

      const normalised = (items || [])
        .map(item => {
          // items may be { contentType, movie, tvShow } wrappers or flat movie/tv objects
          const raw = item.movie || item.tvShow || item
          return normalizeCinescopeItem({ ...raw, contentType: item.contentType || 'MOVIE' })
        })
        .filter(Boolean)

      setItemsMap(prev => ({ ...prev, [slug]: normalised }))
      setLoadingItems(false)
    }

    loadSlug().catch(() => {
      if (active) {
        setItemsMap(prev => ({ ...prev, [slug]: [] }))
        setLoadingItems(false)
      }
    })

    return () => { active = false }
  }, [itemsMap])

  // Trigger item fetch whenever active collection changes
  useEffect(() => {
    const col = collections.find(c => c.id === activeId)
    fetchCollectionItems(col)
  }, [activeId, collections]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loadingMeta || !collections.length) return null

  const activeCollection = collections.find(c => c.id === activeId) || collections[0]
  const activeSlug = activeCollection?.slug || activeCollection?.id
  const items = itemsMap[activeSlug]

  return (
    <section className={styles.section} aria-label="Curated Collections">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Editorial selections</p>
          <h2 className={styles.heading}>Curated Collections</h2>
        </div>
      </div>

      {/* Collection tabs */}
      <div className={styles.collectionTabs}>
        {collections.map(col => {
          const isActive = col.id === activeId
          const slug = col.slug || col.id
          const count = itemsMap[slug]?.length ?? col._count?.items ?? col.itemCount ?? null
          return (
            <button
              key={col.id}
              type="button"
              className={`${styles.tabBtn} ${isActive ? styles.activeTab : ''}`}
              onClick={() => setActiveId(col.id)}
            >
              {col.coverImage && (
                <img src={col.coverImage} alt="" className={styles.tabThumb} loading="lazy" />
              )}
              <div className={styles.tabText}>
                <span className={styles.tabTitle}>{col.name}</span>
                {count !== null && count > 0 && (
                  <span className={styles.tabCount}>{count} titles</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Active collection content */}
      {activeCollection && (
        <div className={styles.collectionInfo}>
          {activeCollection.description && (
            <p className={styles.description}>{activeCollection.description}</p>
          )}

          {loadingItems || items === undefined ? (
            // Skeleton shimmer while loading
            <div className={styles.skeletonRow}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={styles.skeletonCard} aria-hidden="true" />
              ))}
            </div>
          ) : items.length > 0 ? (
            <CategoryRail
              title=""
              items={items}
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
