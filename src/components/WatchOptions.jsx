import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import styles from './WatchOptions.module.css'

const REGIONS = [
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['IN', 'India'],
  ['GE', 'Georgia'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
]

function preferredRegion() {
  try {
    const saved = localStorage.getItem('cs_provider_region')
    if (saved) return saved
  } catch {}
  const region = navigator.language.split('-')[1]?.toUpperCase()
  return REGIONS.some(([code]) => code === region) ? region : 'US'
}

export default function WatchOptions({ id, mediaType }) {
  const [region, setRegion] = useState(preferredRegion)
  const [providers, setProviders] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const getProviders = mediaType === 'tv' ? api.tvProviders : api.movieProviders
    getProviders(id)
      .then(data => { if (active) setProviders(data.results || {}) })
      .catch(() => { if (active) setProviders({}) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id, mediaType])

  const regionData = providers?.[region] || providers?.US || Object.values(providers || {})[0]
  const options = useMemo(() => {
    const seen = new Set()
    return ['flatrate', 'rent', 'buy']
      .flatMap(type => regionData?.[type] || [])
      .filter(provider => {
        if (seen.has(provider.provider_id)) return false
        seen.add(provider.provider_id)
        return true
      })
      .slice(0, 6)
  }, [regionData])

  function changeRegion(event) {
    setRegion(event.target.value)
    try { localStorage.setItem('cs_provider_region', event.target.value) } catch {}
  }

  return (
    <section className={styles.wrap} aria-live="polite">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Official options</p>
          <h3>Where to watch</h3>
        </div>
        <label className={styles.regionLabel}>
          <span className={styles.srOnly}>Country</span>
          <select value={region} onChange={changeRegion}>
            {REGIONS.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </label>
      </div>

      {loading ? (
        <p className={styles.message}>Finding official options…</p>
      ) : options.length ? (
        <div className={styles.providers}>
          {options.map(provider => (
            <div className={styles.provider} key={provider.provider_id}>
              {provider.logo_path && <img src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`} alt="" />}
              <span>{provider.provider_name}</span>
            </div>
          ))}
          {regionData?.link && (
            <a className={styles.link} href={regionData.link} target="_blank" rel="noopener noreferrer">
              View options
            </a>
          )}
        </div>
      ) : (
        <p className={styles.message}>No official streaming options are listed for this country yet.</p>
      )}
    </section>
  )
}
