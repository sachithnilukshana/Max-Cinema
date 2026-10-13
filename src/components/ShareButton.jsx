import React, { useState } from 'react'
import { getShareUrl, copyToClipboard } from '../lib/deepLinks.js'
import styles from './ShareButton.module.css'

/**
 * ShareButton — compact share button that copies a deep link to clipboard.
 * Uses the native Web Share API on mobile when available.
 *
 * Props:
 *   mediaType  {string}  'movie' | 'tv'
 *   tmdbId     {string|number}
 *   season     {number}  (TV only)
 *   episode    {number}  (TV only)
 *   title      {string}  display title used in native share sheet
 */
export default function ShareButton({ mediaType, tmdbId, season, episode, title }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = getShareUrl(mediaType, tmdbId, season, episode)

    // Prefer native Web Share API (mobile)
    if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: title ? `${title} — Max Cinema` : 'Max Cinema',
          text: title ? `Watch "${title}" on Max Cinema` : 'Check this out on Max Cinema',
          url,
        })
        return
      } catch {
        // User cancelled or not supported — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await copyToClipboard(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      window.dispatchEvent(new CustomEvent('Max Cinema:linkcopied', { detail: { url, title } }))
    } catch {
      // Silently ignore clipboard errors
    }
  }

  return (
    <button
      type="button"
      className={`${styles.shareBtn} ${copied ? styles.copied : ''}`}
      onClick={handleShare}
      aria-label={copied ? 'Link copied!' : 'Share this title'}
      title={copied ? 'Link copied!' : 'Share'}
    >
      {copied ? (
        <>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className={styles.label}>Copied!</span>
        </>
      ) : (
        <>
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span className={styles.label}>Share</span>
        </>
      )}
    </button>
  )
}
