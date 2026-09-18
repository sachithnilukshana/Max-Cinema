import React, { useEffect, useState } from 'react'
import Movies from './pages/Movies.jsx'
import TV from './pages/TV.jsx'
import NeedWatch from './pages/NeedWatch.jsx'
import NeedWatchGate from './components/NeedWatchGate.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'
import { getActiveProfile, getProfileSnapshot, restoreProfileSnapshot, saveActiveProfile, saveActiveProfileRecord } from './lib/profile.js'
import { createAccountWithEmail, observeAuth, readableAuthError, readCloudProfile, signInWithEmail, signInWithGoogle, signOutUser, supabaseConfigured, writeCloudProfile } from './lib/supabase.js'
import styles from './App.module.css'

const AUTHORIZED_NEED_WATCH_EMAIL = 'sachithnilukshana64@gmail.com'

function clearMovieSession() {
  try { ['mv_query', 'mv_player'].forEach(k => sessionStorage.removeItem(k)) } catch {}
}

function readSession(key) { try { return sessionStorage.getItem(key) } catch { return null } }
function writeSession(key, value) { try { sessionStorage.setItem(key, value) } catch {} }
function readTheme() { try { return localStorage.getItem('cs_theme') || 'dark' } catch { return 'dark' } }
function readPath() { return window.location.pathname.replace(/\/+$/, '') || '/' }
function profileForUser(user) {
  return {
    id: `supabase-${user.id}`,
    name: String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member').slice(0, 32),
  }
}

export default function App() {
  const [tab, setTab] = useState(() => readSession('cs_tab') || 'movies')
  const [homeKey, setHomeKey] = useState(0)
  const [profile, setProfile] = useState(getActiveProfile)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileName, setProfileName] = useState(profile.name)
  const [theme, setTheme] = useState(readTheme)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [path, setPath] = useState(readPath)
  const [privacyNotice, setPrivacyNotice] = useState('')
  const [authUser, setAuthUser] = useState(null)
  const [cloudReady, setCloudReady] = useState(!supabaseConfigured)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [authMode, setAuthMode] = useState('signin')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [showAuthPassword, setShowAuthPassword] = useState(false)

  const isNeedWatchAuthorized = authUser?.email?.toLowerCase() === AUTHORIZED_NEED_WATCH_EMAIL

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('cs_theme', theme) } catch {}
  }, [theme])

  useEffect(() => {
    const handleShortcut = event => {
      const editable = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      } else if (event.key === '/' && !editable) {
        event.preventDefault()
        setCommandOpen(true)
      } else if (event.key === 'Escape') {
        setCommandOpen(false)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    const handlePopState = () => setPath(readPath())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let cancelled = false
    const stop = observeAuth(async user => {
      if (!user) {
        if (cancelled) return
        setAuthUser(null)
        setCloudReady(true)
        return
      }

      const nextProfile = profileForUser(user)
      const previousProfile = getActiveProfile()
      if (!cancelled) {
        setAuthUser(user)
        setCloudReady(false)
      }

      try {
        const remote = await readCloudProfile(user.id)
        if (cancelled) return
        if (remote) {
          restoreProfileSnapshot(nextProfile.id, remote)
        } else {
          const initialSnapshot = getProfileSnapshot(previousProfile.id)
          restoreProfileSnapshot(nextProfile.id, initialSnapshot)
          await writeCloudProfile(user.id, { ...initialSnapshot, profile: { name: nextProfile.name, email: user.email || '' } })
        }
      } catch {
        if (!cancelled) setAuthError('Signed in, but cloud sync is unavailable. Your changes will remain on this device until it reconnects.')
      }

      if (!cancelled) {
        const savedProfile = saveActiveProfileRecord(nextProfile)
        setProfile(savedProfile)
        setProfileName(savedProfile.name)
        setCloudReady(true)
      }
    })
    return () => { cancelled = true; stop() }
  }, [])

  useEffect(() => {
    if (!authUser || !cloudReady || !profile.id.startsWith('supabase-')) return undefined
    let timer
    const uploadCurrentSnapshot = () => {
      const snapshot = getProfileSnapshot(profile.id)
      writeCloudProfile(authUser.id, { ...snapshot, profile: { name: profile.name, email: authUser.email || '' } })
        .catch(() => setAuthError('Cloud sync could not save this change. It remains on this device.'))
    }
    const upload = event => {
      if (event.detail?.profileId !== profile.id) return
      clearTimeout(timer)
      timer = setTimeout(uploadCurrentSnapshot, 500)
    }
    window.addEventListener('Max Cinema:profiledatachange', upload)
    const initialSync = setTimeout(uploadCurrentSnapshot, 750)
    return () => {
      clearTimeout(timer)
      clearTimeout(initialSync)
      window.removeEventListener('Max Cinema:profiledatachange', upload)
    }
  }, [authUser, cloudReady, profile.id, profile.name])

  useEffect(() => {
    document.title = path === '/privacy-policy'
      ? 'Privacy Policy | Max Cinema'
      : path === '/terms'
        ? 'Terms of Use | Max Cinema'
        : 'Max Cinema'
  }, [path])

  function navigate(nextPath) {
    if (readPath() !== nextPath) window.history.pushState({}, '', nextPath)
    setPath(nextPath)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goTab(t) {
    if (path !== '/') navigate('/')
    setTab(t)
    writeSession('cs_tab', t)
  }

  function goHome() {
    clearMovieSession()
    if (path !== '/') navigate('/')
    setTab('movies')
    writeSession('cs_tab', 'movies')
    setHomeKey(k => k + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openPrivacyChoices() {
    const fundingChoices = window.googlefc
    if (fundingChoices?.callbackQueue && typeof fundingChoices.showRevocationMessage === 'function') {
      fundingChoices.callbackQueue.push(fundingChoices.showRevocationMessage)
      setPrivacyNotice('Opening privacy choices…')
      return
    }
    setPrivacyNotice('Privacy choices will appear here after the Google consent message is published in AdSense.')
  }

  function updateProfile(event) {
    event.preventDefault()
    const nextProfile = saveActiveProfile(profileName)
    setProfile(nextProfile)
    setProfileName(nextProfile.name)
    setProfileOpen(false)
  }

  async function handleGoogleSignIn() {
    setAuthBusy(true)
    setAuthError('')
    setAuthSuccess('')
    try {
      await signInWithGoogle()
      setProfileOpen(false)
    } catch (error) {
      setAuthError(readableAuthError(error))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleEmailAuth(event) {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError('')
    setAuthSuccess('')
    try {
      if (authMode === 'create') {
        const res = await createAccountWithEmail(authEmail, authPassword, profileName)
        if (res?.session) {
          setAuthPassword('')
          setProfileOpen(false)
        } else {
          setAuthSuccess('Account created! Please sign in with your credentials.')
          setAuthMode('signin')
        }
      } else {
        await signInWithEmail(authEmail, authPassword)
        setAuthPassword('')
        setProfileOpen(false)
      }
    } catch (error) {
      setAuthError(readableAuthError(error))
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    setAuthBusy(true)
    setAuthError('')
    setAuthSuccess('')
    try {
      await signOutUser()
      const guest = saveActiveProfile('Guest')
      setProfile(guest)
      setProfileName(guest.name)
    } catch (error) {
      setAuthError(readableAuthError(error))
    } finally {
      setAuthBusy(false)
    }
  }

  function runCommand(event) {
    event.preventDefault()
    const query = commandQuery.trim()
    if (query) {
      if (window.cinescope) {
        window.cinescope.trackSearch(query)
      }
      writeSession('mv_query', JSON.stringify(query))
      setHomeKey(key => key + 1)
    }
    goTab('movies')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCommandOpen(false)
    setCommandQuery('')
  }

  const isPrivacyPage = path === '/privacy-policy' || path === '/privacy' || path === '/privacy.html'
  const isTermsPage = path === '/terms' || path === '/terms.html'

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <button className={styles.logo} onClick={goHome} aria-label="Go to home">
          <img className={styles.logoImage} src="/max-cinema-logo.png" alt="" />
          <span className={styles.logoText}>MAX CINEMA</span>
        </button>
        <nav className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'movies' ? styles.active : ''}`}
            onClick={() => goTab('movies')}
          >
            Movies
          </button>
          <button
            className={`${styles.tab} ${tab === 'tv' ? styles.active : ''}`}
            onClick={() => goTab('tv')}
          >
            TV Series
          </button>
          <button
            className={`${styles.tab} ${tab === 'need-watch' ? styles.active : ''}`}
            onClick={() => goTab('need-watch')}
          >
            Need Watch {!isNeedWatchAuthorized && '🔒'}
          </button>
        </nav>
        <div className={styles.profileWrap}>
          <button
            type="button"
            className={styles.profileButton}
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen(open => !open)}
          >
            {profile.name}
          </button>
          {profileOpen && (
            <div className={styles.profilePanel}>
              {authUser ? (
                <>
                  <p className={styles.accountHeading}>Signed in</p>
                  <p className={styles.accountEmail}>{authUser.email || profile.name}</p>
                  <p className={styles.syncState}>Cloud sync is active for your watchlist and progress.</p>
                  <button type="button" onClick={handleSignOut} disabled={authBusy}>Sign out</button>
                </>
              ) : supabaseConfigured ? (
                <>
                  <p className={styles.accountHeading}>{authMode === 'create' ? 'Create your account' : 'Sign in to sync'}</p>
                  <button type="button" className={styles.googleButton} onClick={handleGoogleSignIn} disabled={authBusy}>Continue with Google</button>
                  <p className={styles.divider}><span>or</span></p>
                  <form onSubmit={handleEmailAuth}>
                    {authMode === 'create' && (
                      <>
                        <label htmlFor="profile-name">Display name</label>
                        <input id="profile-name" value={profileName} maxLength="32" onChange={event => setProfileName(event.target.value)} />
                      </>
                    )}
                    <label htmlFor="auth-email">Email address</label>
                    <input id="auth-email" type="email" value={authEmail} onChange={event => setAuthEmail(event.target.value)} autoComplete="email" required />
                    <label htmlFor="auth-password">Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="auth-password"
                        type={showAuthPassword ? 'text' : 'password'}
                        minLength="6"
                        value={authPassword}
                        onChange={event => setAuthPassword(event.target.value)}
                        autoComplete={authMode === 'create' ? 'new-password' : 'current-password'}
                        required
                        style={{ paddingRight: '45px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowAuthPassword(p => !p)}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '11px',
                          background: 'none',
                          border: 'none',
                          color: '#888',
                          fontSize: '11px',
                          cursor: 'pointer',
                          width: 'auto',
                          padding: '0 4px',
                        }}
                      >
                        {showAuthPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <button type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'create' ? 'Create account' : 'Sign in'}</button>
                  </form>
                  {authSuccess && <p className={styles.authSuccess} role="status">{authSuccess}</p>}
                  {authError && <p className={styles.authError} role="alert">{authError}</p>}
                  <button
                    type="button"
                    className={styles.modeButton}
                    onClick={() => {
                      setAuthMode(mode => mode === 'create' ? 'signin' : 'create')
                      setAuthError('')
                      setAuthSuccess('')
                    }}
                  >
                    {authMode === 'create' ? 'Already have an account? Sign in' : 'New here? Create an account'}
                  </button>
                </>
              ) : (
                <form onSubmit={updateProfile}>
                  <label htmlFor="profile-name">Profile name</label>
                  <input id="profile-name" value={profileName} maxLength="32" onChange={event => setProfileName(event.target.value)} autoFocus />
                  <button type="submit">Save profile</button>
                </form>
              )}
            </div>
          )}
        </div>
        <button type="button" className={styles.themeButton} onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </header>

      <main className={styles.main}>
        {isPrivacyPage ? (
          <PrivacyPolicy onBack={goHome} onOpenPrivacyChoices={openPrivacyChoices} />
        ) : isTermsPage ? (
          <Terms onBack={goHome} />
        ) : (
          <>
            {supabaseConfigured && !cloudReady ? (
              <section className={styles.syncLoading} aria-live="polite">Restoring your Max Cinema profile…</section>
            ) : (
              <>
                {tab === 'movies' && <Movies key={homeKey} profile={profile} />}
                {tab === 'tv' && <TV profile={profile} pinnedShowId="5920" />}
                {tab === 'need-watch' && (
                  isNeedWatchAuthorized ? (
                    <NeedWatch profile={profile} onBrowse={() => goTab('movies')} />
                  ) : (
                    <NeedWatchGate authUser={authUser} onBrowse={() => goTab('movies')} />
                  )
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          &copy; {new Date().getFullYear()} All rights reserved{' '}
          <a
            href="https://www.codespecters.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            Code Specter
          </a>
          {' '}| Digital Entertainment Democratized
        </p>
        <p className={styles.footerLinks}>
          <a href="/privacy-policy" onClick={event => { event.preventDefault(); navigate('/privacy-policy') }}>Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="/terms" onClick={event => { event.preventDefault(); navigate('/terms') }}>Terms of Use</a>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={openPrivacyChoices}>Privacy &amp; cookie settings</button>
        </p>
        {privacyNotice && <p className={styles.privacyNotice} role="status">{privacyNotice}</p>}
      </footer>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <button className={tab === 'movies' ? styles.mobileActive : ''} onClick={() => goTab('movies')}>⌂<span>Movies</span></button>
        <button className={tab === 'tv' ? styles.mobileActive : ''} onClick={() => goTab('tv')}>▣<span>TV</span></button>
        <button className={tab === 'need-watch' ? styles.mobileActive : ''} onClick={() => goTab('need-watch')}>
          ♡<span>Need Watch</span>
        </button>
        <button onClick={() => setProfileOpen(true)}>◉<span>Profile</span></button>
      </nav>

      {commandOpen && (
        <div className={styles.commandBackdrop} onMouseDown={() => setCommandOpen(false)}>
          <form className={styles.commandPalette} onSubmit={runCommand} onMouseDown={event => event.stopPropagation()}>
            <input autoFocus value={commandQuery} onChange={event => setCommandQuery(event.target.value)} placeholder="Search any movie…" aria-label="Command palette search" />
            <button type="submit">Search movies</button>
            <div className={styles.commandActions}>
              <button type="button" onClick={() => { goTab('tv'); setCommandOpen(false) }}>Browse TV</button>
              <button type="button" onClick={() => { goTab('need-watch'); setCommandOpen(false) }}>Open Need Watch</button>
              <button type="button" onClick={() => { setProfileOpen(true); setCommandOpen(false) }}>Profile settings</button>
            </div>
            <small>Press Esc to close · Ctrl+K or / to reopen</small>
          </form>
        </div>
      )}
    </div>
  )
}
