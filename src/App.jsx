import React, { useEffect, useState } from 'react'
import Movies from './pages/Movies.jsx'
import TV from './pages/TV.jsx'
import WatchHistory from './pages/WatchHistory.jsx'
import Watchlist from './pages/Watchlist.jsx'
import Stats from './pages/Stats.jsx'
import WatchParty from './pages/WatchParty.jsx'
import Payment from './pages/Payment.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'
import Login from './pages/Login.jsx'
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx'
import { getActiveProfile, saveActiveProfileRecord } from './lib/profile.js'
import { observeAuth } from './lib/firebase.js'
import { trackSearch } from './lib/cinescopeApi.js'
import { PremiumProvider } from './lib/PremiumContext.jsx'
import { parseDeepLink } from './lib/deepLinks.js'
import { getRefCodeFromUrl, recordReferral } from './lib/referral.js'
import styles from './App.module.css'
import CineScopeAd from './components/CineScopeAd.jsx'

function clearMovieSession() {
  try { ['mv_query', 'mv_player'].forEach(k => sessionStorage.removeItem(k)) } catch {}
}

function readSession(key) { try { return sessionStorage.getItem(key) } catch { return null } }
function writeSession(key, value) { try { sessionStorage.setItem(key, value) } catch {} }
function readTheme() { try { return localStorage.getItem('cs_theme') || 'dark' } catch { return 'dark' } }
function readPath() { return window.location.pathname.replace(/\/+$/, '') || '/' }

export default function App() {
  const [tab, setTab] = useState(() => {
    const saved = readSession('cs_tab')
    return ['movies', 'tv', 'history', 'watchlist', 'stats', 'payment'].includes(saved) ? saved : 'movies'
  })
  const [homeKey, setHomeKey] = useState(0)
  const [profile, setProfile] = useState(getActiveProfile)
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(readTheme)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [path, setPath] = useState(readPath)
  const [privacyNotice, setPrivacyNotice] = useState('')

  useEffect(() => {
    return observeAuth(nextUser => {
      setUser(nextUser)
      if (nextUser) {
        const p = saveActiveProfileRecord({
          id: nextUser.uid,
          name: nextUser.displayName || nextUser.email?.split('@')[0] || 'Member',
        })
        setProfile(p)

        // Check for referral code on login/auth
        const refCode = getRefCodeFromUrl()
        if (refCode) {
          recordReferral(refCode, nextUser.uid, nextUser.email)
        }
      } else {
        const p = getActiveProfile()
        setProfile(p)
      }
    })
  }, [])

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

  // Deep linking detection
  useEffect(() => {
    const deepLink = parseDeepLink(path)
    if (deepLink) {
      if (deepLink.type === 'watchlist') setTab('watchlist')
      else if (deepLink.type === 'stats') setTab('stats')
      else if (deepLink.type === 'movie') setTab('movies')
      else if (deepLink.type === 'tv') setTab('tv')
    }
  }, [path])

  const isPrivacyPage = path === '/privacy-policy' || path === '/privacy' || path === '/privacy.html'
  const isTermsPage = path === '/terms' || path === '/terms.html'
  const isLoginPage = path === '/login' || path === '/account'
  const isPaymentPage = path === '/payment' || path === '/upgrade'

  useEffect(() => {
    document.title = isPrivacyPage
      ? 'Privacy Policy | Max Cinema'
      : isTermsPage
        ? 'Terms of Use | Max Cinema'
        : isLoginPage
          ? 'Account & Sign In | Max Cinema'
          : isPaymentPage
            ? 'VIP Upgrade | Max Cinema'
            : 'Max Cinema'
  }, [isPrivacyPage, isTermsPage, isLoginPage, isPaymentPage])

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

  function runCommand(event) {
    event.preventDefault()
    const query = commandQuery.trim()
    if (query) {
      trackSearch(query)
      writeSession('mv_query', JSON.stringify(query))
      setHomeKey(key => key + 1)
    }
    goTab('movies')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setCommandOpen(false)
    setCommandQuery('')
  }

  return (
    <PremiumProvider uid={user?.uid} email={user?.email}>
      <div className={styles.app}>
        <PWAInstallPrompt />

        <header className={styles.header}>
          <button className={styles.logo} onClick={goHome} aria-label="Go to home">
            <img className={styles.logoImage} src="/max-cinema-logo.png" alt="" />
            <span className={styles.logoText}>MAX CINEMA</span>
          </button>
          <nav className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'movies' && !isLoginPage && !isPaymentPage ? styles.active : ''}`}
              onClick={() => goTab('movies')}
            >
              Movies
            </button>
            <button
              className={`${styles.tab} ${tab === 'tv' && !isLoginPage && !isPaymentPage ? styles.active : ''}`}
              onClick={() => goTab('tv')}
            >
              TV Series
            </button>
            <button
              className={`${styles.tab} ${tab === 'watchlist' && !isLoginPage && !isPaymentPage ? styles.active : ''}`}
              onClick={() => goTab('watchlist')}
            >
              ❤️ Watchlist
            </button>
            <button
              className={`${styles.tab} ${tab === 'history' && !isLoginPage && !isPaymentPage ? styles.active : ''}`}
              onClick={() => goTab('history')}
            >
              History
            </button>
            <button
              className={`${styles.tab} ${tab === 'stats' && !isLoginPage && !isPaymentPage ? styles.active : ''}`}
              onClick={() => goTab('stats')}
            >
              📊 Stats
            </button>
            <button
              className={`${styles.tab} ${isPaymentPage || tab === 'payment' ? styles.active : ''}`}
              style={{ color: 'var(--gold)', fontWeight: 700 }}
              onClick={() => navigate('/payment')}
            >
              👑 VIP
            </button>
          </nav>
          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.searchTrigger}
              onClick={() => setCommandOpen(true)}
              aria-label="Search movies and series"
              title="Search (Ctrl+K or /)"
            >
              🔍 Search
            </button>
            <button
              type="button"
              className={user ? styles.userAccountButton : styles.signInButton}
              onClick={() => navigate('/login')}
              aria-label={user ? `Signed in as ${user.displayName || user.email}` : 'Sign in to Max Cinema'}
              title={user ? `Account: ${user.displayName || user.email}` : 'Sign in'}
            >
              {user ? (
                <>
                  <span className={styles.userInitial}>
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </span>
                  <span className={styles.userName}>
                    {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.signInIcon}>👤</span>
                  <span>Sign In</span>
                </>
              )}
            </button>
            <button
              type="button"
              className={styles.themeButton}
              onClick={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
          </div>
        </header>

        <main className={styles.main}>
          {isPrivacyPage ? (
            <PrivacyPolicy onBack={goHome} onOpenPrivacyChoices={openPrivacyChoices} />
          ) : isTermsPage ? (
            <Terms onBack={goHome} />
          ) : isLoginPage ? (
            <Login
              user={user}
              onBack={goHome}
              onBrowseMovies={() => goTab('movies')}
              onBrowseHistory={() => goTab('history')}
            />
          ) : isPaymentPage || tab === 'payment' ? (
            <Payment user={user} onBack={goHome} />
          ) : tab === 'watchlist' ? (
            <Watchlist profile={profile} onBrowse={() => goTab('movies')} onSelect={() => goTab('movies')} />
          ) : tab === 'stats' ? (
            <Stats profile={profile} user={user} />
          ) : tab === 'party' ? (
            <div style={{ textAlign: 'center', padding: '5rem 1.5rem', maxWidth: '540px', margin: '0 auto' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🍿</div>
              <h2 style={{ color: 'var(--gold)', fontFamily: 'var(--font-heading)', marginBottom: '0.8rem' }}>Watch Party Temporarily Paused</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem', lineHeight: 1.6 }}>
                Watch Party is temporarily undergoing scheduled maintenance and performance upgrades. We'll be back shortly!
              </p>
              <button
                type="button"
                onClick={goHome}
                style={{
                  background: 'var(--gold)',
                  color: '#000',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 22px',
                  cursor: 'pointer'
                }}
              >
                Back to Movies
              </button>
            </div>
          ) : (
            <>
              {tab === 'movies' && <Movies key={homeKey} profile={profile} />}
              {tab === 'tv' && <TV profile={profile} />}
              {tab === 'history' && <WatchHistory profile={profile} onBrowse={() => goTab('movies')} />}
            </>
          )}
        </main>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            &copy; {new Date().getFullYear()} All rights reserved{' '}
            <button
              type="button"
              onClick={goHome}
              className={styles.footerLink}
            >
              Max Cinema
            </button>
            {' '}| Digital Entertainment Democratized
          </p>
          <p className={styles.footerLinks}>
            <a href="/login" onClick={event => { event.preventDefault(); navigate('/login') }}>
              {user ? 'My Account' : 'Sign In'}
            </a>
            <span aria-hidden="true">·</span>
            <a href="/payment" onClick={event => { event.preventDefault(); navigate('/payment') }}>
              Upgrade VIP 👑
            </a>
            <span aria-hidden="true">·</span>
            <a href="/privacy-policy" onClick={event => { event.preventDefault(); navigate('/privacy-policy') }}>Privacy Policy</a>
            <span aria-hidden="true">·</span>
            <a href="/terms" onClick={event => { event.preventDefault(); navigate('/terms') }}>Terms of Use</a>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={openPrivacyChoices}>Privacy &amp; cookie settings</button>
          </p>
          {privacyNotice && <p className={styles.privacyNotice} role="status">{privacyNotice}</p>}
          {/* Footer ad card */}
          <div className={styles.footerAdWrap} aria-hidden={privacyNotice ? 'true' : 'false'}>
            <CineScopeAd placement="FOOTER" slot="1234567890" className={styles.footerAd} />
          </div>
        </footer>

        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          <button className={tab === 'movies' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('movies')}>⌂<span>Movies</span></button>
          <button className={tab === 'tv' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('tv')}>▣<span>TV</span></button>
          <button className={tab === 'watchlist' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('watchlist')}>❤️<span>Saved</span></button>
          <button className={tab === 'history' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('history')}>⏱<span>History</span></button>
          <button className={tab === 'stats' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('stats')}>📊<span>Stats</span></button>
          <button className={isPaymentPage || tab === 'payment' ? styles.mobileActive : ''} onClick={() => navigate('/payment')}>👑<span>VIP</span></button>
          <button className={isLoginPage ? styles.mobileActive : ''} onClick={() => navigate('/login')}>👤<span>{user ? 'Account' : 'Login'}</span></button>
        </nav>

        {commandOpen && (
          <div className={styles.commandBackdrop} onMouseDown={() => setCommandOpen(false)}>
            <form className={styles.commandPalette} onSubmit={runCommand} onMouseDown={event => event.stopPropagation()}>
              <input autoFocus value={commandQuery} onChange={event => setCommandQuery(event.target.value)} placeholder="Search any movie or TV show…" aria-label="Command palette search" />
              <button type="submit">Search movies</button>
              <div className={styles.commandActions}>
                <button type="button" onClick={() => { goTab('movies'); setCommandOpen(false) }}>Browse Movies</button>
                <button type="button" onClick={() => { goTab('tv'); setCommandOpen(false) }}>Browse TV</button>
                <button type="button" onClick={() => { goTab('watchlist'); setCommandOpen(false) }}>Watchlist</button>
                <button type="button" onClick={() => { goTab('history'); setCommandOpen(false) }}>Open History</button>
                <button type="button" onClick={() => { goTab('stats'); setCommandOpen(false) }}>My Stats</button>
              </div>
              <small>Press Esc to close · Ctrl+K or / to reopen</small>
            </form>
          </div>
        )}
      </div>
    </PremiumProvider>
  )
}
