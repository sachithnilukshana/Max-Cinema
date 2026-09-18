import React, { useEffect, useState, useRef } from 'react'
import { cinescopeApi } from '../lib/cinescopeApi.js'
import AdUnit from './AdUnit.jsx'
import styles from './CineScopeAd.module.css'

export default function CineScopeAd({ placement = 'HOMEPAGE', slot, className = '' }) {
  const [ad, setAd] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    let active = true
    cinescopeApi.getAds(placement)
      .then(ads => {
        if (!active) return
        if (Array.isArray(ads) && ads.length > 0) {
          // Sort by priority descending and filter enabled
          const activeAds = ads
            .filter(a => a.enabled !== false)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))
          if (activeAds.length > 0) {
            setAd(activeAds[0])
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoaded(true)
      })
    return () => { active = false }
  }, [placement])

  useEffect(() => {
    if (!ad || !ad.adCode || !containerRef.current) return

    const container = containerRef.current
    container.innerHTML = ''

    // If adCode has scripts, extract and run them so dynamic ads / ad networks execute properly
    const range = document.createRange()
    range.selectNode(container)
    const fragment = range.createContextualFragment(ad.adCode)
    container.appendChild(fragment)
  }, [ad])

  if (ad && ad.adCode) {
    return (
      <aside className={`${styles.wrap} ${className}`} aria-label={ad.name || 'Advertisement'}>
        <span className={styles.label}>Advertisement</span>
        <div ref={containerRef} className={styles.adContent} />
      </aside>
    )
  }

  // Fallback to Google AdSense slot if provided and no dynamic ad was returned
  if (slot) {
    return <AdUnit slot={slot} className={className} />
  }

  return null
}

