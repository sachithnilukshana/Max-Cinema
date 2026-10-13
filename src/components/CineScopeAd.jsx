import React, { useEffect, useState, useRef } from 'react'
import { cinescopeApi } from '../lib/cinescopeApi.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import AdUnit from './AdUnit.jsx'
import styles from './CineScopeAd.module.css'

/** Returns 'MOBILE' for viewports < 768 px, otherwise 'DESKTOP' */
function getDevice() {
  if (typeof window === 'undefined') return 'ALL'
  return window.innerWidth < 768 ? 'MOBILE' : 'DESKTOP'
}

export default function CineScopeAd({ placement = 'HOMEPAGE', slot, className = '' }) {
  const { isPremium } = usePremium()
  const [ad, setAd] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef(null)
  const device = getDevice()

  // Fetch the best ad for this placement + device on mount / when placement changes
  useEffect(() => {
    if (isPremium) return
    let active = true
    setAd(null)
    setLoaded(false)

    cinescopeApi.getAds(placement, device)
      .then(ads => {
        if (!active) return
        if (Array.isArray(ads) && ads.length > 0) {
          const best = ads
            .filter(a => a.enabled !== false)
            .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0]
          if (best) setAd(best)
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoaded(true) })

    return () => { active = false }
  }, [placement, isPremium]) // device is stable per render — no need in deps

  // Inject raw adCode (supports third-party script tags)
  useEffect(() => {
    if (isPremium || !ad?.adCode || !containerRef.current) return
    const container = containerRef.current
    container.innerHTML = ''
    const range = document.createRange()
    range.selectNode(container)
    const fragment = range.createContextualFragment(ad.adCode)
    container.appendChild(fragment)
  }, [ad, isPremium])

  if (isPremium || !loaded) return null // don't render ads if premium or loading

  if (ad?.adCode) {
    return (
      <aside className={`${styles.wrap} ${className}`} aria-label={ad.name || 'Advertisement'}>
        <span className={styles.label}>Advertisement</span>
        <div ref={containerRef} className={styles.adContent} />
      </aside>
    )
  }

  // Fallback to Google AdSense slot if provided and no backend ad was returned
  if (slot) {
    return <AdUnit slot={slot} className={className} />
  }

  return null
}
