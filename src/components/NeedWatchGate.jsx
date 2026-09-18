import React, { useState } from 'react'
import { signInWithEmail, signOutUser, readableAuthError } from '../lib/supabase.js'
import styles from './NeedWatchGate.module.css'

const REQUIRED_EMAIL = 'sachithnilukshana64@gmail.com'

export default function NeedWatchGate({ authUser, onBrowse }) {
  const [email, setEmail] = useState(REQUIRED_EMAIL)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isOtherAccount = authUser && authUser.email?.toLowerCase() !== REQUIRED_EMAIL

  async function handleSignIn(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await signInWithEmail(email, password)
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleSwitchAccount() {
    setBusy(true)
    try {
      await signOutUser()
      setEmail(REQUIRED_EMAIL)
      setPassword('')
      setError('')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.lockIcon} aria-hidden="true">🔒</div>
        <h1 className={styles.title}>Private Watchlist</h1>
        <p className={styles.description}>
          Need Watch is restricted and only available for <strong>{REQUIRED_EMAIL}</strong>.
        </p>

        {isOtherAccount ? (
          <div className={styles.otherAccount}>
            <p className={styles.notice}>
              You are currently signed in as <span>{authUser.email}</span>.
            </p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSwitchAccount}
              disabled={busy}
            >
              {busy ? 'Signing out…' : 'Sign in as Authorized User'}
            </button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSignIn}>
            <div className={styles.inputGroup}>
              <label htmlFor="gate-email">Email Address</label>
              <input
                id="gate-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="gate-password">Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  id="gate-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className={styles.toggleVisibility}
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={busy}
            >
              {busy ? 'Verifying access…' : 'Unlock Need Watch'}
            </button>
          </form>
        )}

        {onBrowse && (
          <button type="button" className={styles.secondaryBtn} onClick={onBrowse}>
            ← Back to Movies
          </button>
        )}
      </div>
    </div>
  )
}
