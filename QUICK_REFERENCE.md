# Max Cinema - Quick Reference Card

## 🚀 Quick Start

### 1. Setup (5 minutes)
```bash
cd cinescope
npm install

# Create .env file
cp .env.example .env
# Edit .env and add TMDB_API_KEY
```

### 2. Run Locally
```bash
# Terminal 1
npm run api

# Terminal 2
npm run dev
```

Visit: `http://localhost:5173`

### 3. Deploy to Netlify
```bash
# Push to GitHub
git push

# Netlify auto-deploys and shows status at
# https://app.netlify.com
```

---

## 📁 File Navigation Guide

| File | Purpose | Edit When |
|------|---------|-----------|
| `src/App.jsx` | Main app component | Add routes/tabs |
| `src/pages/*.jsx` | Page components | Add new pages |
| `src/components/*.jsx` | Reusable components | Modify UI |
| `src/lib/api.js` | TMDB API wrapper | Add new API calls |
| `src/lib/profile.js` | User data storage | Change profile structure |
| `server/index.mjs` | Backend server | Add API endpoints |
| `package.json` | Dependencies | Add npm packages |
| `.env` | Secret configuration | Add API keys |

---

## 🔧 Common Tasks

### Add a New API Call

**Before**: You want to fetch movies by actor

**Code** (`src/lib/api.js`):
```javascript
export const api = {
  // ... existing calls
  moviesByActor: (actorId) => tmdbFetch(`/person/${actorId}/movie_credits`),
}
```

**Use** (in component):
```jsx
useEffect(() => {
  api.moviesByActor(123)
    .then(data => setMovies(data.cast))
    .catch(err => console.error(err))
}, [])
```

### Display Error Message

**Code**:
```jsx
import { apiErrorMessage } from '../lib/api'

// In component
const [error, setError] = useState('')

try {
  const data = await api.trendingMovies()
  setMovies(data.results)
} catch (err) {
  setError(apiErrorMessage(err, 'Movies'))
}

// Render
{error && <div className="error">{error}</div>}
```

### Access User's Watchlist

**Code**:
```jsx
import { getProfileLibrary } from '../lib/profile'

// Get watchlist for current profile
const library = getProfileLibrary(profile.id)
const watchlist = library.watchlist // Array of items

// Check if title is in watchlist
const isInWatchlist = (titleId) => {
  return library.watchlist.some(item => item.id === titleId)
}

// Add to watchlist
import { addWatchItem } from '../lib/profile'
addWatchItem(profile.id, {
  id: 123,
  title: 'Movie Title',
  mediaType: 'movie',
  posterPath: '/abc123.jpg'
})

// Remove from watchlist
import { removeWatchItem } from '../lib/profile'
removeWatchItem(profile.id, `movie:123`)
```

### Save Rating/Notes

**Code**:
```jsx
import { setTitleRating, setTitleNote } from '../lib/profile'

// Set rating (1-10)
setTitleRating(profile.id, `movie:123`, 8.5)

// Set personal note
setTitleNote(profile.id, `movie:123`, 'Great movie!')

// Get rating
const library = getProfileLibrary(profile.id)
const rating = library.ratings[`movie:123`] // 8.5
const note = library.notes[`movie:123`] // 'Great movie!'
```

### Track Episode Progress

**Code**:
```jsx
import { setEpisodeProgress } from '../lib/profile'

// Mark episode as watched
setEpisodeProgress(profile.id, `tv:456`, 2, 5) // TV show 456, season 2, episode 5

// Continue from specific episode
const episodeProgress = profile.library.episodeProgress[`tv:456`]
// Returns: { season: 2, episode: 5 }
```

### Create a Modal/Dialog

**Code** (`src/components/MyModal.jsx`):
```jsx
import styles from './MyModal.module.css'

export default function MyModal({ isOpen, onClose, children }) {
  if (!isOpen) return null
  
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.close} onClick={onClose}>✕</button>
        {children}
      </div>
    </div>
  )
}
```

**CSS** (`src/components/MyModal.module.css`):
```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 2rem;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
```

**Use**:
```jsx
import MyModal from '../components/MyModal'

const [modalOpen, setModalOpen] = useState(false)

return (
  <>
    <button onClick={() => setModalOpen(true)}>Open Modal</button>
    <MyModal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
      <h2>Modal Content</h2>
    </MyModal>
  </>
)
```

### Add Keyboard Shortcut

**Code** (in `App.jsx`):
```jsx
useEffect(() => {
  const handleKeyPress = event => {
    // Ignore if typing in input
    const isEditable = ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
    if (isEditable) return
    
    if (event.key === 'Escape') {
      // Close modal/menu
      setModalOpen(false)
    }
    
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      // Save shortcut (Cmd+S on Mac, Ctrl+S on Windows)
      event.preventDefault()
      handleSave()
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [])
```

### Responsive Grid

**Code** (`src/components/MyGrid.module.css`):
```css
.grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* Mobile */
@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

/* Tablet */
@media (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### Use Theme Variables

**Available CSS Variables** (defined in stylesheet):
```css
--bg-primary       /* Main background */
--bg-secondary     /* Secondary background */
--text-primary     /* Main text color */
--text-secondary   /* Secondary text color */
--accent           /* Brand color */
--border-radius    /* Default border radius */
--transition       /* Animation timing */
```

**Usage**:
```css
.myElement {
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: var(--border-radius);
  transition: all var(--transition);
}
```

---

## 🔐 Authentication (Firebase)

### Setup Firebase

1. Create project at https://firebase.google.com
2. Enable Authentication → Google & Email/Password
3. Add authorized domains (your deployed domain)
4. Create Realtime Database with rules:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null && auth.uid === $uid",
           ".write": "auth != null && auth.uid === $uid"
         }
       }
     }
   }
   ```

### Environment Variables

Add to `.env` and Netlify:
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://xxx.firebaseio.com
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
```

### Sign In Code

Already implemented in `App.jsx`! Just ensure Firebase vars are set.

```jsx
// Available functions from lib/supabase.js
signInWithGoogle()
signInWithEmail(email, password)
createAccountWithEmail(email, password)
signOutUser()
observeAuth(callback)  // Listen to auth changes
```

---

## 🚀 Deployment Checklist

### Before Deploying to Netlify

- [ ] All imports resolve (no red squiggles in IDE)
- [ ] `npm run build` completes without errors
- [ ] `.env` is in `.gitignore`
- [ ] `TMDB_API_KEY` added to Netlify env vars
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Functions directory: `netlify/functions`

### Deployment Command

```bash
# 1. Commit changes
git add -A
git commit -m "Update Max Cinema"

# 2. Push to GitHub
git push

# 3. Netlify auto-deploys! Monitor at:
# https://app.netlify.com/sites/your-site-name
```

### After Deployment

Test at: `https://your-site.netlify.app/api/health`

Should return:
```json
{"ok":true,"platform":"netlify","tmdbConfigured":true}
```

---

## 🐛 Debugging Tips

### Check API Calls

**DevTools → Network tab**:
1. Filter by `/api/tmdb`
2. Click request
3. Check "Response" tab for JSON data
4. Check "Headers" for status codes

### Check Profile Data

**DevTools → Console**:
```javascript
// View active profile
JSON.parse(localStorage.getItem('cs_active_profile'))

// View watchlist
JSON.parse(localStorage.getItem('cs_watchlist_guest'))

// View all localStorage keys
Object.keys(localStorage)
```

### Check Server Logs

**Local Dev**:
```bash
# Terminal running "npm run api"
# Logs appear here
```

**Netlify**:
```
Dashboard → Deploys → Latest → Deploy log
              or
           → Functions → Select function → Logs
```

**Self-hosted (PM2)**:
```bash
pm2 logs max-cinema
pm2 logs max-cinema --lines 100  # Show last 100 lines
```

### React DevTools

1. Install Chrome extension: "React Developer Tools"
2. Open DevTools (F12)
3. Find "Components" tab
4. Inspect component state and props

---

## 📊 Performance Metrics

### Lighthouse Score Target
- Performance: > 90
- Accessibility: > 90
- Best Practices: > 90
- SEO: > 90

### Check with Netlify Analytics
```
Dashboard → Analytics → Overview
```

---

## 🎨 Customization Examples

### Change Primary Color

**In `src/index.css`**, update CSS variables:
```css
:root {
  --accent: #your-color-here; /* Changed from default */
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #1a1a1a;
    --text-primary: #ffffff;
  }
}
```

### Add Custom Font

**In `src/index.css`**:
```css
@import url('https://fonts.googleapis.com/css2?family=Your+Font:wght@400;700&display=swap');

body {
  font-family: 'Your Font', sans-serif;
}
```

### Change App Title

**In `public/index.html`**:
```html
<title>Max Cinema - Discover Movies</title>
<meta name="description" content="Your custom description">
```

### Modify Logo

**In `App.jsx`**, update navigation:
```jsx
<header>
  <img src="/your-logo.png" alt="Logo" className={styles.logo} />
  <h1>Max Cinema</h1>
</header>
```

---

## 🌐 SEO Optimization

### Meta Tags (in `public/index.html`):
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="Discover and track movies and TV shows" />
<meta name="keywords" content="movies, tv shows, watchlist" />
<meta name="theme-color" content="#667eea" />

<!-- Open Graph (social sharing) -->
<meta property="og:title" content="Max Cinema" />
<meta property="og:description" content="Discover movies and TV" />
<meta property="og:image" content="https://your-domain.com/og-image.jpg" />
```

### Sitemap
Auto-generated at `public/sitemap.xml`

### robots.txt
Configured at `public/robots.txt`

---

## 💾 Backup & Export

### Export Watchlist

**Code** (in component):
```jsx
function exportWatchlist() {
  const library = getProfileLibrary(profile.id)
  const data = JSON.stringify(library, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `watchlist-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  
  URL.revokeObjectURL(url)
}
```

### Import Watchlist

```jsx
function importWatchlist(file) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      restoreProfileSnapshot(profile.id, data)
      alert('Watchlist imported!')
    } catch (err) {
      alert('Invalid file format')
    }
  }
  reader.readAsText(file)
}
```

---

## 🔗 Useful Links

| Resource | URL |
|----------|-----|
| TMDB API Docs | https://developer.themoviedb.org |
| React Docs | https://react.dev |
| Vite Docs | https://vitejs.dev |
| Firebase Docs | https://firebase.google.com/docs |
| Netlify Docs | https://docs.netlify.com |
| MDN Web Docs | https://developer.mozilla.org |

---

## 📞 Support Resources

### Common Issues

**Can't login to Firebase?**
- Check Firebase domain is in Authorized domains list
- Clear browser cache and localStorage
- Try incognito window

**Movies not loading?**
- Check `/api/health` returns ok: true
- Verify TMDB_API_KEY is correct
- Try refreshing page

**Watchlist not syncing?**
- Enable Firebase in environment
- Check you're logged in
- Verify database rules allow your user

**Deployment failed?**
- Check build log for errors
- Verify all environment variables set
- Try manual redeploy

---

## Quick Git Commands

```bash
# Clone repository
git clone https://github.com/your-user/cinescope.git
cd cinescope

# Create new branch for feature
git checkout -b feature/my-new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"

# Push to GitHub
git push origin feature/my-new-feature

# Create Pull Request on GitHub

# After merge, deploy
git checkout main
git pull
# Netlify auto-deploys!
```

---

## Performance Optimization Checklist

- [ ] Lazy load image from TMDB (use `posterUrl()`)
- [ ] Debounce search input (avoid too many API calls)
- [ ] Memoize expensive components with `React.memo()`
- [ ] Use `useCallback` for event handlers
- [ ] Increase cache TTL for stable data
- [ ] Minimize re-renders with proper dependency arrays
- [ ] Split large bundles with code-splitting
- [ ] Compress images with TMDB built-in sizes

---

This quick reference covers 90% of common tasks. Refer to MAX_CINEMA_GUIDE.md for detailed explanations!
