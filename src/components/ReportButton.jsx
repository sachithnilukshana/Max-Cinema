import React, { useState, useRef, useEffect } from 'react'
import styles from './ReportButton.module.css'

const REASONS = [
  { value: 'broken_video', label: '🔗 Broken / wrong video' },
  { value: 'wrong_subtitles', label: '🔤 Wrong subtitles' },
  { value: 'inappropriate', label: '🚫 Inappropriate content' },
  { value: 'other', label: '📝 Other' },
]

/**
 * ReportButton — compact "⚑ Report" button for the player.
 * Opens an inline modal with reason options and an optional text field.
 *
 * Props:
 *   title      {string}  media title
 *   tmdbId     {string|number}
 *   mediaType  {string}  'movie' | 'tv'
 */
export default function ReportButton({ title, tmdbId, mediaType }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error
  const modalRef = useRef(null)
  const firstRadioRef = useRef(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onOutside)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onOutside)
    }
  }, [open])

  // Focus first radio when modal opens
  useEffect(() => {
    if (open && firstRadioRef.current) {
      firstRadioRef.current.focus()
    }
  }, [open])

  function handleOpen() {
    setReason('')
    setDetails('')
    setStatus('idle')
    setOpen(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!reason) return
    setStatus('loading')
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Unknown',
          tmdbId: String(tmdbId || ''),
          mediaType: mediaType || '',
          reason,
          details: details.trim(),
          userAgent: navigator.userAgent,
        }),
      })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={handleOpen}
        aria-label="Report a problem with this content"
        title="Report an issue"
      >
        <span className={styles.flag} aria-hidden="true">⚑</span>
        <span className={styles.triggerLabel}>Report</span>
      </button>

      {open && (
        <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Report content issue">
          <div className={styles.modal} ref={modalRef}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Close report dialog"
            >
              ✕
            </button>

            {status === 'done' ? (
              <div className={styles.thanks}>
                <span className={styles.thanksIcon}>✓</span>
                <p>Thank you! Our team will review this.</p>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleSubmit}>
                <h3 className={styles.heading}>Report an Issue</h3>
                {title && <p className={styles.subheading}>{title}</p>}

                <fieldset className={styles.fieldset}>
                  <legend className={styles.legend}>What's the problem?</legend>
                  {REASONS.map((r, i) => (
                    <label key={r.value} className={styles.radioLabel}>
                      <input
                        ref={i === 0 ? firstRadioRef : undefined}
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className={styles.radio}
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </fieldset>

                {reason === 'other' && (
                  <textarea
                    className={styles.textarea}
                    placeholder="Please describe the issue…"
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    rows={3}
                    maxLength={500}
                    aria-label="Additional details"
                  />
                )}

                {status === 'error' && (
                  <p className={styles.errorMsg}>Failed to submit. Please try again.</p>
                )}

                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={!reason || status === 'loading'}
                  >
                    {status === 'loading' ? 'Sending…' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
