import React, { useEffect, useState } from 'react'
import Movies from './pages/Movies.jsx'
import TV from './pages/TV.jsx'
import WatchHistory from './pages/WatchHistory.jsx'
import PrivacyPolicy from './pages/PrivacyPolicy.jsx'
import Terms from './pages/Terms.jsx'
import { getActiveProfile } from './lib/profile.js'
import { trackSearch } from './lib/cinescopeApi.js'
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
    return ['movies', 'tv', 'history'].includes(saved) ? saved : 'movies'
  })
  const [homeKey, setHomeKey] = useState(0)
  const [profile] = useState(getActiveProfile)
  const [theme, setTheme] = useState(readTheme)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const [path, setPath] = useState(readPath)
  const [privacyNotice, setPrivacyNotice] = useState('')

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
            className={`${styles.tab} ${tab === 'history' ? styles.active : ''}`}
            onClick={() => goTab('history')}
          >
            Watch History
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
        {/* Footer ad card */}
        <div className={styles.footerAdWrap} aria-hidden={privacyNotice ? 'true' : 'false'}>
          <CineScopeAd placement="FOOTER" slot="1234567890" className={styles.footerAd} />
        </div>
      </footer>

      <nav className={styles.mobileNav} aria-label="Mobile navigation">
        <button className={tab === 'movies' ? styles.mobileActive : ''} onClick={() => goTab('movies')}>⌂<span>Movies</span></button>
        <button className={tab === 'tv' ? styles.mobileActive : ''} onClick={() => goTab('tv')}>▣<span>TV</span></button>
        <button className={tab === 'history' ? styles.mobileActive : ''} onClick={() => goTab('history')}>⏱<span>History</span></button>
        <button onClick={() => setCommandOpen(true)}>🔍<span>Search</span></button>
      </nav>

      {commandOpen && (
        <div className={styles.commandBackdrop} onMouseDown={() => setCommandOpen(false)}>
          <form className={styles.commandPalette} onSubmit={runCommand} onMouseDown={event => event.stopPropagation()}>
            <input autoFocus value={commandQuery} onChange={event => setCommandQuery(event.target.value)} placeholder="Search any movie or TV show…" aria-label="Command palette search" />
            <button type="submit">Search movies</button>
            <div className={styles.commandActions}>
              <button type="button" onClick={() => { goTab('movies'); setCommandOpen(false) }}>Browse Movies</button>
              <button type="button" onClick={() => { goTab('tv'); setCommandOpen(false) }}>Browse TV</button>
              <button type="button" onClick={() => { goTab('history'); setCommandOpen(false) }}>Open History</button>
            </div>
            <small>Press Esc to close · Ctrl+K or / to reopen</small>
          </form>
        </div>
      )}
    </div>
  )
}
