import React, { useState } from 'react'
import { loadLibrary } from '../lib/profile.js'
import { saveAdminConfig } from '../lib/admin.js'
import styles from './Admin.module.css'

export default function Admin({ profile, config, onSave }) {
  const [draft, setDraft] = useState(config)
  const reports = loadLibrary(profile.id).reports

  function save(event) {
    event.preventDefault()
    onSave(saveAdminConfig(draft))
  }

  return (
    <section className={styles.wrap}>
      <p className={styles.eyebrow}>Local administration</p>
      <h1>Admin dashboard</h1>
      <p className={styles.description}>This workspace manages the current browser. Secure multi-user administration requires server-side authentication.</p>
      <form onSubmit={save} className={styles.form}>
        <label>Homepage announcement<textarea value={draft.announcement} maxLength="180" onChange={event => setDraft({ ...draft, announcement: event.target.value })} placeholder="New collections every Friday" /></label>
        <label>Featured movie TMDB ID<input value={draft.featuredMovieId} inputMode="numeric" onChange={event => setDraft({ ...draft, featuredMovieId: event.target.value.replace(/\D/g, '') })} placeholder="Optional" /></label>
        <label>Pinned TV TMDB ID<input value={draft.pinnedTvId} inputMode="numeric" onChange={event => setDraft({ ...draft, pinnedTvId: event.target.value.replace(/\D/g, '') })} /></label>
        <button type="submit">Save homepage settings</button>
      </form>
      <section className={styles.reports}>
        <h2>Playback reports</h2>
        {reports.length ? reports.map(report => <p key={report.id}><b>{report.title}</b> — {report.type} <span>{new Date(report.createdAt).toLocaleDateString()}</span></p>) : <p>No reports from this browser profile.</p>}
      </section>
    </section>
  )
}
