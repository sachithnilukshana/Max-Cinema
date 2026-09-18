import React, { useEffect, useMemo, useState } from 'react'
import { getTitleKey, loadLibrary, markReleaseNotified, toggleReleaseReminders } from '../lib/profile.js'
import styles from './ReleaseReminders.module.css'

function getDate(item) {
  return item.release_date || item.first_air_date
}

export default function ReleaseReminders({ profile, items }) {
  const [enabled, setEnabled] = useState(() => loadLibrary(profile.id).remindersEnabled)
  const [status, setStatus] = useState('')
  const upcoming = useMemo(() => items
    .filter(item => getDate(item) && new Date(`${getDate(item)}T00:00:00`) > new Date())
    .sort((a, b) => getDate(a).localeCompare(getDate(b)))
    .slice(0, 4), [items])

  useEffect(() => {
    setEnabled(loadLibrary(profile.id).remindersEnabled)
  }, [profile.id])

  useEffect(() => {
    if (!enabled) return
    const library = loadLibrary(profile.id)
    const released = items.filter(item => {
      const date = getDate(item)
      return !item.watched && date && new Date(`${date}T00:00:00`) <= new Date() && !library.notifiedReleases.includes(getTitleKey(item))
    }).slice(0, 3)
    if (!released.length) return
    const names = released.map(item => item.title || item.name).join(', ')
    const message = `${names} ${released.length === 1 ? 'is' : 'are'} now available.`
    setStatus(message)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Max Cinema release alert', { body: message })
    }
    markReleaseNotified(profile.id, released.map(getTitleKey))
  }, [enabled, items, profile.id])

  async function toggle() {
    if (!enabled && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
    if (!enabled && 'Notification' in window && Notification.permission === 'denied') {
      setStatus('Browser notifications are blocked. Release alerts will still appear here when you open Max Cinema.')
    }
    const next = toggleReleaseReminders(profile.id).remindersEnabled
    setEnabled(next)
  }

  if (!upcoming.length) return null

  return (
    <section className={styles.wrap}>
      <div>
        <p className={styles.eyebrow}>Release radar</p>
        <h3>Upcoming from your list</h3>
      </div>
      <div className={styles.items}>
        {upcoming.map(item => <span key={`${item.media_type}:${item.id}`}>{item.title || item.name} <b>{getDate(item)}</b></span>)}
      </div>
      <button type="button" className={enabled ? styles.enabled : ''} onClick={toggle}>
        {enabled ? 'Release alerts enabled' : 'Enable release alerts'}
      </button>
      {status && <p className={styles.note} role="status">{status}</p>}
      <p className={styles.note}>Alerts are checked when Max Cinema is open. Cross-device and background reminders need a connected push service.</p>
    </section>
  )
}
