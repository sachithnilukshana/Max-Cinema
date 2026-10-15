import React, { useEffect, useState } from 'react'
import Movies from './pages/Movies.jsx'
const TV = React.lazy(() => import('./pages/TV.jsx'))
const MoviePage = React.lazy(() => import('./pages/MoviePage.jsx'))
const TVShowPage = React.lazy(() => import('./pages/TVShowPage.jsx'))
const FireTVReceiver = React.lazy(() => import('./pages/FireTVReceiver.jsx'))
const WatchHistory = React.lazy(() => import('./pages/WatchHistory.jsx'))
const Watchlist = React.lazy(() => import('./pages/Watchlist.jsx'))
const Stats = React.lazy(() => import('./pages/Stats.jsx'))
const WatchParty = React.lazy(() => import('./pages/WatchParty.jsx'))
const Payment = React.lazy(() => import('./pages/Payment.jsx'))
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy.jsx'))
const Terms = React.lazy(() => import('./pages/Terms.jsx'))
const Login = React.lazy(() => import('./pages/Login.jsx'))
const About = React.lazy(() => import('./pages/About.jsx'))
import PWAInstallPrompt from './components/PWAInstallPrompt.jsx'
import CastModal from './components/CastModal.jsx'
import { isCastConnected, connectToReceiver } from './lib/castSync.js'
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
  const [castModalOpen, setCastModalOpen] = useState(false)
  const [isCasting, setIsCasting] = useState(() => isCastConnected())

  useEffect(() => {
    const handleCastChange = event => {
      setIsCasting(Boolean(event.detail?.connected))
    }
    window.addEventListener('Max Cinema:castchange', handleCastChange)
    return () => window.removeEventListener('Max Cinema:castchange', handleCastChange)
  }, [])

  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('cast')
      if (code) {
        connectToReceiver(code)
          .then(() => setCastModalOpen(true))
          .catch(() => {})
      }
    } catch {}
  }, [])

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

  const isFireTvRoute = path === '/firetv' || path === '/cast' || path === '/tv-mode'
  const movieMatch = path.match(/^\/(?:mov|movie)\/([^/?#]+)/)
  const tvMatch = path.match(/^\/(?:tvshow|tv)\/([^/?#]+)(?:\/(\d+)\/(\d+))?/)

  const isMovieRoute = Boolean(movieMatch)
  const isTVRoute = Boolean(tvMatch)

  const movieRouteId = movieMatch ? movieMatch[1] : null
  const tvRouteId = tvMatch ? tvMatch[1] : null
  const tvRouteSeason = tvMatch && tvMatch[2] ? parseInt(tvMatch[2], 10) : undefined
  const tvRouteEpisode = tvMatch && tvMatch[3] ? parseInt(tvMatch[3], 10) : undefined

  // Deep linking detection
  useEffect(() => {
    const deepLink = parseDeepLink(path)
    if (deepLink) {
      if (deepLink.type === 'watchlist') setTab('watchlist')
      else if (deepLink.type === 'stats') setTab('stats')
      else if (deepLink.type === 'party') setTab('party')
    }
  }, [path])

  const isPrivacyPage = path === '/privacy-policy' || path === '/privacy' || path === '/privacy.html'
  const isTermsPage = path === '/terms' || path === '/terms.html'
  const isLoginPage = path === '/login' || path === '/account'
  const isPaymentPage = path === '/payment' || path === '/upgrade'
  const isAboutPage = path === '/about' || path === '/contact'

  useEffect(() => {
    if (isFireTvRoute || isMovieRoute || isTVRoute) return
    document.title = isPrivacyPage
      ? 'Privacy Policy | Max Cinema'
      : isTermsPage
        ? 'Terms of Use | Max Cinema'
        : isLoginPage
          ? 'Account & Sign In | Max Cinema'
          : isPaymentPage
            ? 'VIP Upgrade | Max Cinema'
            : isAboutPage
              ? 'About Us & Contact | Max Cinema'
              : 'Max Cinema — Free Movies, TV Shows & Streaming Discovery'
  }, [isPrivacyPage, isTermsPage, isLoginPage, isPaymentPage, isAboutPage, isFireTvRoute, isMovieRoute, isTVRoute])

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
        <a href="#main-content" className={styles.skipLink}>Skip to main content</a>
        <PWAInstallPrompt />

        <header className={styles.header}>
          <button className={styles.logo} onClick={goHome} aria-label="Go to home">
            <img className={styles.logoImage} src="/max-cinema-logo.png" alt="Max Cinema logo" width="34" height="34" />
            <span className={styles.logoText}>MAX CINEMA</span>
          </button>
          <nav className={styles.tabs}>
            <button
              className={`${styles.tab} ${(isMovieRoute || (tab === 'movies' && path === '/')) && !isLoginPage && !isPaymentPage ? styles.active : ''}`}
              onClick={() => goTab('movies')}
            >
              Movies
            </button>
            <button
              className={`${styles.tab} ${(isTVRoute || (tab === 'tv' && path === '/')) && !isLoginPage && !isPaymentPage ? styles.active : ''}`}
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
              onClick={() => setCastModalOpen(true)}
              aria-label="Cast to Fire TV or Smart TV"
              title={isCasting ? 'Connected to Fire TV (click to manage)' : 'Cast to Fire TV / Smart TV'}
              style={isCasting ? { borderColor: '#00ff88', color: '#00ff88' } : undefined}
            >
              📺 {isCasting ? 'Casting' : 'Cast TV'}
            </button>
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

        <main id="main-content" className={styles.main}>
          <h1 className={styles.srOnly}>Max Cinema — Free Movies, TV Shows &amp; Streaming Discovery</h1>
          <React.Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>Loading…</div>}>
            {isFireTvRoute ? (
              <FireTVReceiver />
            ) : isMovieRoute ? (
              <MoviePage
                tmdbId={movieRouteId}
                profile={profile}
                onBack={() => {
                  if (window.history.length > 1) window.history.back()
                  else goHome()
                }}
                onSelectMovie={id => navigate(`/mov/${id}`)}
                onSelectTV={id => navigate(`/tvshow/${id}`)}
              />
            ) : isTVRoute ? (
              <TVShowPage
                tmdbId={tvRouteId}
                initialSeason={tvRouteSeason}
                initialEpisode={tvRouteEpisode}
                profile={profile}
                onBack={() => {
                  if (window.history.length > 1) window.history.back()
                  else goTab('tv')
                }}
                onSelectMovie={id => navigate(`/mov/${id}`)}
                onSelectTV={id => navigate(`/tvshow/${id}`)}
                onNavigate={p => navigate(p)}
              />
            ) : isAboutPage ? (
              <About onBack={goHome} />
            ) : isPrivacyPage ? (
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
              <Watchlist
                profile={profile}
                onBrowse={() => goTab('movies')}
                onSelect={item => {
                  const id = item.id || item.tmdbId
                  if (item.media_type === 'tv' || item.name) {
                    navigate(`/tvshow/${id}`)
                  } else {
                    navigate(`/mov/${id}`)
                  }
                }}
              />
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
                {tab === 'movies' && (
                  <Movies
                    key={homeKey}
                    profile={profile}
                    onSelectTitle={item => {
                      const id = item.id || item.tmdbId
                      if (item.media_type === 'tv' || item.name) {
                        navigate(`/tvshow/${id}`)
                      } else {
                        navigate(`/mov/${id}`)
                      }
                    }}
                  />
                )}
                {tab === 'tv' && (
                  <TV
                    profile={profile}
                    onSelectShow={item => {
                      const id = item.id || item.tmdbId
                      if (item.season && item.episode) {
                        navigate(`/tvshow/${id}/${item.season}/${item.episode}`)
                      } else {
                        navigate(`/tvshow/${id}`)
                      }
                    }}
                  />
                )}
                {tab === 'history' && (
                  <WatchHistory
                    profile={profile}
                    onBrowse={() => goTab('movies')}
                    onSelect={item => {
                      const id = item.id || item.tmdbId
                      if (item.media_type === 'tv' || item.season || item.name) {
                        navigate(`/tvshow/${id}/${item.season || 1}/${item.episode || 1}`)
                      } else {
                        navigate(`/mov/${id}`)
                      }
                    }}
                  />
                )}
              </>
            )}
          </React.Suspense>

          {path === '/' && tab === 'movies' && (
            <section className={styles.editorialGuide} aria-label="Editorial Guide and Catalog Summary">
              <div className={styles.guideCard}>
                <div className={styles.trustBadges}>
                  <span>✦ Certified TMDB API Partner Metadata</span>
                  <span>✦ 256-Bit SSL Encryption</span>
                  <span>✦ Ad-Safe Streaming</span>
                </div>
                <h2>Discover Top 24 Movies &amp; TV Series on Max Cinema</h2>
                <p>
                  Max Cinema is your premier digital cinema discovery destination. Browse the top 24 trending movies and top 24 TV series each week, complete with verified community ratings, multi-resolution posters, and high-definition playback. Filter by mood, genres (including Action, Drama, Comedy, and Horror), and release years to discover what to watch next.
                </p>
                <h3>Personalized Cinema Experience &amp; VIP Perks</h3>
                <p>
                  Save titles directly to your private watchlist, track watch history, and analyze your personal viewing stats with streak rewards. Upgrade to Max Cinema VIP for zero ad interruptions and ultra-high-definition streaming via Cash Scan Connect Virtual Cards or PayHere.
                </p>
                <div className={styles.guideMeta}>
                  <p className={styles.byline}>
                    Curated by <strong>Max Cinema Editorial Team</strong> · Published: <time dateTime="2026-10-15">October 15, 2026</time>
                  </p>
                  <div className={styles.shareLinks}>
                    <span>Share:</span>
                    <a href="https://t.me/share/url?url=https://max-cinema.vercel.app&text=Watch%20Top%20Movies%20on%20Max%20Cinema" target="_blank" rel="noopener noreferrer">Telegram</a>
                    <a href="https://twitter.com/intent/tweet?url=https://max-cinema.vercel.app&text=Discover%20trending%20movies%20on%20Max%20Cinema" target="_blank" rel="noopener noreferrer">X (Twitter)</a>
                    <a href="https://api.whatsapp.com/send?text=https://max-cinema.vercel.app" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  </div>
                </div>
              </div>
            </section>
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
            {' '}| Digital Entertainment Democratized · Curated by Max Cinema Editorial
          </p>
          <p className={styles.footerLinks}>
            <a href="/about" onClick={event => { event.preventDefault(); navigate('/about') }}>
              About Us
            </a>
            <span aria-hidden="true">·</span>
            <a href="/contact" onClick={event => { event.preventDefault(); navigate('/about') }}>
              Contact Support
            </a>
            <span aria-hidden="true">·</span>
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
            <a href="/about#editorial" onClick={event => { event.preventDefault(); navigate('/about') }}>Editorial Policy</a>
            <span aria-hidden="true">·</span>
            <a href="/firetv" onClick={event => { event.preventDefault(); navigate('/firetv') }}>Fire TV Mode 📺</a>
            <span aria-hidden="true">·</span>
            <a href="https://t.me/maxcinemabot_bot" target="_blank" rel="noopener noreferrer">
              Telegram Bot
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://github.com/sachithnilukshana/Max-Cinema" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
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
          <button className={(isMovieRoute || (tab === 'movies' && path === '/')) && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('movies')}>⌂<span>Movies</span></button>
          <button className={(isTVRoute || (tab === 'tv' && path === '/')) && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('tv')}>▣<span>TV</span></button>
          <button className={tab === 'watchlist' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('watchlist')}>❤️<span>Saved</span></button>
          <button className={tab === 'history' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('history')}>⏱<span>History</span></button>
          <button className={tab === 'stats' && !isLoginPage && !isPaymentPage ? styles.mobileActive : ''} onClick={() => goTab('stats')}>📊<span>Stats</span></button>
          <button onClick={() => setCastModalOpen(true)} style={isCasting ? { color: '#00ff88' } : undefined}>📺<span>Cast</span></button>
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

        <CastModal
          isOpen={castModalOpen}
          onClose={() => setCastModalOpen(false)}
        />
      </div>
    </PremiumProvider>
  )
}
