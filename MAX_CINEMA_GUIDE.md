# Max Cinema - Complete Project Guide

## Table of Contents
1. [Project Architecture](#project-architecture)
2. [Code Structure](#code-structure)
3. [Data Flow](#data-flow)
4. [Local Development Setup](#local-development-setup)
5. [Production Deployment](#production-deployment)
6. [Adding New Features](#adding-new-features)
7. [Common Issues & Fixes](#common-issues--fixes)
8. [Environment Configuration](#environment-configuration)

---

## Project Architecture

### High-Level Overview

Max Cinema is a full-stack React application with:
- **Frontend**: React 18 + Vite (bundler)
- **Backend**: Node.js HTTP server (proxy to TMDB API)
- **Data**: LocalStorage (browser profiles) + Optional cloud sync (Firebase/Supabase)
- **Movie Data**: The Movie Database (TMDB) API
- **Deployment**: Netlify Functions (serverless) or self-hosted Node server

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                │
│  ┌─────────────┬──────────────┬────────────────────┐   │
│  │   Movies    │   TV Shows   │   Need Watch       │   │
│  │   Page      │   Page       │   Watchlist        │   │
│  └──────────────────────────────────────────────────┘   │
│                        │                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │    Components (MediaCard, Player, Details)      │   │
│  │    State (profile, theme, auth)                 │   │
│  │    Libraries (api.js, profile.js, supabase.js)  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
              │
              ▼ (HTTP Requests via /api/tmdb)
┌─────────────────────────────────────────────────────────┐
│         Node.js Backend (server/index.mjs)              │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Route: /api/tmdb - Proxy to TMDB              │   │
│  │  Route: /api/play/* - Video embed              │   │
│  │  Route: /api/health - Health check             │   │
│  │  Route: /* - Static file serving               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Features:                                              │
│  • Rate limiting (90 req/min per IP)                   │
│  • Response caching (5 min TTL, 300 entries)          │
│  • Security headers (CSP, HSTS, etc)                  │
│  • API endpoint validation                            │
│  └─────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────┐
│           External Services                             │
│  • TMDB API (movie/tv data)                            │
│  • Optional: Firebase (auth + cloud sync)             │
│  • Optional: Supabase (alternative cloud sync)        │
│  • Optional: Google AdSense (monetization)            │
│  • Optional: Video provider (licensed playback)       │
└─────────────────────────────────────────────────────────┘
```

### Storage Layers

1. **LocalStorage (Browser)**
   - Active profile
   - Theme preference
   - Watchlist library (per profile)
   - Session state (current tab, searches)

2. **Cloud (Optional)**
   - Firebase: User authentication + Realtime Database
   - Supabase: Alternative user auth + storage
   - Syncs watchlist across devices when logged in

---

## Code Structure

### Directory Layout

```
cinescope/
├── src/
│   ├── App.jsx                 # Main app component, routing, state
│   ├── App.module.css          # App styling
│   ├── main.jsx                # React entry point
│   ├── index.css               # Global styles
│   ├── components/             # Reusable React components
│   │   ├── TitleDetails.jsx    # Movie/TV details modal
│   │   ├── MediaCard.jsx       # Individual movie/show card
│   │   ├── MediaGrid.jsx       # Grid layout component
│   │   ├── Player.jsx          # Video player wrapper
│   │   ├── SearchSuggestions.jsx  # Search dropdown
│   │   ├── SeasonPicker.jsx    # TV season selector
│   │   ├── ContinueWatching.jsx # Resume watching section
│   │   ├── PersonalControls.jsx # Rating/notes/favorites
│   │   ├── TasteRecommendations.jsx # ML recommendations
│   │   ├── ReleaseReminders.jsx # Notification system
│   │   ├── WatchOptions.jsx    # Where to watch info
│   │   └── AdUnit.jsx          # AdSense integration
│   ├── pages/                  # Full page components
│   │   ├── Movies.jsx          # Movies page
│   │   ├── TV.jsx              # TV shows page
│   │   ├── NeedWatch.jsx       # Watchlist management
│   │   ├── Admin.jsx           # Admin dashboard (if enabled)
│   │   ├── PrivacyPolicy.jsx   # Legal pages
│   │   └── Terms.jsx
│   └── lib/                    # Utility libraries
│       ├── api.js              # TMDB API wrapper
│       ├── profile.js          # Profile/library management
│       ├── supabase.js         # Firebase auth & sync
│       └── admin.js            # Admin utilities
│
├── server/                     # Backend
│   └── index.mjs               # Node.js HTTP server
│
├── netlify/                    # Serverless deployment
│   └── functions/
│       ├── tmdb.js             # Netlify Function: /api/tmdb
│       ├── health.js           # Netlify Function: /api/health
│       └── play.js             # Netlify Function: /api/play
│
├── public/                     # Static assets
│   ├── index.html              # HTML shell
│   ├── favicon.ico             # Browser tab icon
│   ├── manifest.webmanifest    # PWA metadata
│   ├── sw.js                   # Service worker
│   └── robots.txt              # SEO metadata
│
├── supabase/
│   └── schema.sql              # Database schema (not used by default)
│
├── package.json                # Dependencies & scripts
├── vite.config.js              # Vite bundler config
├── netlify.toml                # Netlify deployment config
└── .env.example                # Environment template
```

### Key Components

#### App.jsx (391 lines)
- **Routes**: Movies, TV, Need Watch, Admin, Privacy, Terms
- **State**: 
  - `profile` - Active user profile
  - `theme` - Light/dark mode
  - `authUser` - Logged-in user (if Firebase enabled)
  - `tab` - Current page
- **Features**:
  - Keyboard shortcuts (Cmd+K or / for search)
  - Profile switching
  - Authentication UI
  - Cloud profile sync

#### pages/Movies.jsx & pages/TV.jsx
- Trending content feed
- Search functionality
- Genre/language filtering
- Media details modal
- Responsive grid layout

#### pages/NeedWatch.jsx
- Watchlist management
- Add/remove/restore titles
- Search within watchlist
- Export watchlist as JSON
- Per-profile organization

#### lib/profile.js (254 lines)
- Profile creation and switching
- Library management (watchlist, ratings, notes)
- Progress tracking (episode numbers)
- Favorites and collections
- Cloud profile synchronization
- LocalStorage serialization/deserialization

#### lib/api.js (82 lines)
- TMDB API client
- Request proxying to `/api/tmdb` endpoint
- Image URL formatting
- Error handling
- 15-second timeout per request

#### server/index.mjs (246 lines)
- HTTP server with Express-like routing
- `/api/tmdb` - Proxy requests to TMDB API
  - Request validation (only allow safe endpoints)
  - Response caching (5 min, 300 entries max)
  - Rate limiting (90 req/min per IP)
  - Timeout protection (10 sec)
- `/api/play/*` - Video embed redirection
- `/api/health` - Health check
- Static file serving from `dist/` directory
- Security headers (CSP, X-Frame-Options, etc)
- HTTPS-only embed provider enforcement

---

## Data Flow

### 1. User Loads App
```
1. App.jsx initializes state from localStorage
   - Active profile (or "Guest" default)
   - Theme preference (or "dark" default)
   - Session tab (or "movies" default)

2. useEffect observes Firebase auth (if configured)
   - Loads cloud profile if user is logged in
   - Merges cloud data with local profile

3. App renders current page + navigation
```

### 2. User Searches for Movies
```
1. User types in SearchSuggestions input
   ↓
2. onChange → call api.searchMovies(query)
   ↓
3. api.js: fetch('/api/tmdb?path=/search/movie?query=...')
   ↓
4. Backend (server/index.mjs):
   - Validate request path
   - Check rate limit
   - Check cache
   - If cached: return cached response
   If not: fetch from https://api.themoviedb.org/3/...
   - Cache response for 5 minutes
   - Return JSON to frontend
   ↓
5. Frontend renders MediaGrid with results
   - Each card is a MediaCard component
```

### 3. User Clicks on Movie
```
1. MediaCard onClick → opens TitleDetails modal
   ↓
2. TitleDetails loads:
   - Movie details (api.movieDetails)
   - Videos/trailers (api.movieVideos)
   - Watch providers (api.movieProviders)
   - Credits (api.movieCredits)
   - Recommendations (api.movieRecommendations)
   (All requests go through /api/tmdb proxy)
   ↓
3. Modal displays:
   - Poster, title, rating, description
   - Trailers in iframe
   - "Where to watch" info for user's country
   - Cast and crew
   - Similar movies
```

### 4. User Adds to Watchlist
```
1. PersonalControls: "Add to Need Watch" button
   ↓
2. onClick → profile.addWatchItem({
     id, title, posterPath, mediaType, etc
   })
   ↓
3. profile.js:
   - Add item to profile.library.watchlist
   - Save to localStorage as JSON
   - Dispatch 'Max Cinema:librarychange' event
   ↓
4. NeedWatch page or other listeners
   - Receive event
   - Update UI to show new item
```

### 5. User Watches Episode
```
1. SeasonPicker selects season/episode
   ↓
2. Player component: <iframe src="/api/play/tv/...">
   ↓
3. Backend /api/play/* endpoint:
   - Validates request
   - If EMBED_API_KEY configured:
     Redirects to licensed provider URL
   If not:
     Redirects to YouTube embed (if available)
   ↓
4. ContinueWatching tracks:
   - profile.library.episodeProgress
   - Saves to localStorage
   - Syncs to cloud if authenticated
```

### 6. User Logs In (with Firebase)
```
1. Auth modal: email + password or "Sign in with Google"
   ↓
2. signInWithGoogle() or signInWithEmail(email, password)
   - Calls Firebase Authentication
   ↓
3. Firebase:
   - Validates credentials
   - Returns user token
   ↓
4. observeAuth() callback triggered:
   - Fetch cloud profile (readCloudProfile)
   - If no cloud data: copy current profile to cloud
   If cloud data exists: merge with local
   ↓
5. App.jsx:
   - Set authUser state
   - Subscribe to profile updates
   - Auto-sync future changes to cloud
```

---

## Local Development Setup

### Prerequisites
- Node.js v20.19.0 or higher (and < v25)
- npm or yarn
- TMDB API key (free account at https://www.themoviedb.org/settings/api)

### Step-by-Step Setup

#### 1. Install Dependencies
```bash
cd cinescope
npm install
```

#### 2. Configure Environment

Create `.env` file (copy from `.env.example`):

```bash
# Required
TMDB_API_KEY=your_tmdb_v3_api_key_here
# OR use this for read-only token:
# TMDB_READ_ACCESS_TOKEN=your_bearer_token_here

# Optional: Video player
EMBED_BASE=https://your-licensed-provider.com
EMBED_API_KEY=your_short_lived_token_here

# Optional: Admin dashboard
VITE_ADMIN_MODE=false

# Optional: Firebase cloud sync
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
VITE_FIREBASE_APP_ID=app_id
VITE_FIREBASE_MEASUREMENT_ID=measurement_id
```

**Important**: Never commit `.env` file!

#### 3. Run API Server

In terminal 1:
```bash
npm run api
# Starts on http://localhost:8787
```

#### 4. Run Development Client

In terminal 2:
```bash
npm run dev
# Shows address like http://localhost:5173
# Vite automatically proxies /api/* to port 8787
```

#### 5. Open in Browser

```
http://localhost:5173
```

### Common Development Tasks

#### View Admin Dashboard
1. Set `VITE_ADMIN_MODE=true` in `.env`
2. Restart the dev server
3. Look for admin link in the app

#### Test with Different TMDB Account
1. Update `TMDB_API_KEY` in `.env`
2. Restart `npm run api` (server uses env)
3. Browser will fetch new data on next request

#### Debug Network Requests
1. Open DevTools (F12)
2. Network tab
3. Filter by `/api/tmdb` to see proxied requests
4. Check response payloads and status codes

#### Clear Browser Storage
```javascript
// In DevTools Console:
localStorage.clear()
sessionStorage.clear()
// Then refresh page
```

#### Test Profile Switching
1. Create a profile (name field in top nav)
2. Switch between profiles
3. Check localStorage (DevTools → Application → Local Storage)
   - Look for `cs_active_profile`
   - Look for `cs_watchlist_*` and `cs_library_*` keys

---

## Production Deployment

### Option 1: Netlify (Recommended - Serverless)

#### Prerequisites
- GitHub repository (Netlify pulls from here)
- TMDB API key
- Optional: Firebase credentials for cloud sync

#### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```
   (Make sure `.env` is in `.gitignore`)

2. **Connect to Netlify**
   - Go to https://netlify.com
   - Click "New site from Git"
   - Select GitHub, find your repository
   - Netlify auto-detects `netlify.toml` config
   - Default build command: `npm run build`
   - Default publish folder: `dist`
   - Default functions folder: `netlify/functions`

3. **Set Environment Variables**
   - In Netlify dashboard: **Site settings → Environment variables**
   - Add these as `Key=Value` pairs:
     ```
     TMDB_API_KEY=your_key_here
     EMBED_BASE=https://provider.com (if using video)
     EMBED_API_KEY=your_token_here (if using video)
     VITE_FIREBASE_API_KEY=... (if using Firebase)
     ... (add all VITE_FIREBASE_* variables)
     ```
   - **Important**: Do NOT include `VITE_` prefix for non-frontend vars!
   - Select "Functions" scope for function variables

4. **Deploy**
   - Netlify auto-deploys on push to `main`
   - Check deployment status in dashboard
   - First deploy takes 2-3 minutes

5. **Test Deployment**
   ```
   https://your-site.netlify.app/api/health
   ```
   Should return:
   ```json
   {"ok":true,"platform":"netlify","tmdbConfigured":true}
   ```

6. **Custom Domain** (Optional)
   - Domain settings → Custom domain
   - Point DNS to Netlify
   - Netlify auto-provisions HTTPS

#### What Netlify Functions Do

- `/api/tmdb` → Proxies to TMDB API
- `/api/health` → Health check endpoint
- `/api/play/*` → Video embed redirects
- These replace the Node.js server for serverless

---

### Option 2: Self-Hosted (Full Control)

#### Prerequisites
- Linux/Mac server (Ubuntu 20.04+ recommended)
- Node.js v20+ installed
- PM2 or systemd for process management
- HTTPS reverse proxy (nginx/Apache)
- Domain with DNS pointing to server

#### Steps

1. **Build for Production**
   ```bash
   npm run build
   # Creates dist/ folder with optimized assets
   ```

2. **Upload to Server**
   ```bash
   scp -r . user@your-server:/app/cinescope
   cd /app/cinescope
   npm install --production
   ```

3. **Set Environment Variables**
   ```bash
   cat > .env << EOF
   TMDB_API_KEY=your_key_here
   HOST=127.0.0.1
   PORT=8787
   EMBED_BASE=https://provider.com
   EMBED_API_KEY=your_token_here
   EOF
   
   chmod 600 .env
   ```

4. **Start Server with PM2**
   ```bash
   npm install -g pm2
   pm2 start server/index.mjs --name "max-cinema"
   pm2 startup
   pm2 save
   ```

5. **Configure Nginx Reverse Proxy**
   ```nginx
   server {
     listen 443 ssl http2;
     server_name your-domain.com;
     
     ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;
     
     location / {
       proxy_pass http://127.0.0.1:8787;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }
   ```

6. **Enable HTTPS with Let's Encrypt**
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

7. **Monitor**
   ```bash
   pm2 logs max-cinema    # View logs
   pm2 status             # Check status
   pm2 restart max-cinema # Restart service
   ```

#### Configuration

- **HOST**: Set to `0.0.0.0` for public access (set behind reverse proxy!)
- **PORT**: Change from 8787 to any free port
- Always use HTTPS reverse proxy for public deployment
- The app binds to `127.0.0.1:8787` by default (safe)

---

### Option 3: Docker (Container Deployment)

#### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY dist ./dist
COPY server ./server
COPY public ./public

ENV HOST=0.0.0.0
ENV PORT=8787

EXPOSE 8787

CMD ["node", "--env-file=.env", "server/index.mjs"]
```

#### Build & Run
```bash
docker build -t max-cinema .

# Create .env for container
cat > production.env << EOF
TMDB_API_KEY=your_key_here
EMBED_BASE=https://provider.com
EOF

# Run container
docker run -d \
  -p 8787:8787 \
  --env-file production.env \
  --name max-cinema \
  max-cinema
```

---

## Adding New Features

### Example: Add a "Favorites" Filter to Movies Page

#### 1. Understand Current Structure
- Movies page uses `api.trendingMovies()` and `api.searchMovies()`
- Results stored in React state: `const [movies, setMovies] = useState([])`
- PersonalControls has `markFavorite()` function
- Favorites stored in `profile.library.favorites`

#### 2. Update lib/api.js

Add a new API call:
```javascript
// In api object
favorites: (favoriteIds) => {
  // Note: TMDB doesn't have a favorites endpoint
  // This would filter client-side results instead
  return Promise.resolve({ results: [] })
}
```

Or use stored favorites:
```javascript
export function getFavoriteTitles(profileId) {
  const library = getProfileLibrary(profileId)
  return library.favorites // Array of title keys like "movie:123"
}
```

#### 3. Update pages/Movies.jsx

Add filter toggle:
```jsx
const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

// After fetching movies
const filteredMovies = showFavoritesOnly 
  ? movies.filter(movie => {
      const key = `movie:${movie.id}`
      return profile.library.favorites.includes(key)
    })
  : movies

// Add button in UI
<button onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}>
  {showFavoritesOnly ? '⭐ Favorites' : '☆ All Movies'}
</button>
```

#### 4. Test
1. Mark a few movies as favorites
2. Click filter button
3. Verify only favorites display

### Example: Add a New Tab (E.g., "Ratings")

#### 1. Create New Page Component

Create `src/pages/Ratings.jsx`:
```jsx
import React, { useState } from 'react'
import styles from './Ratings.module.css'
import MediaGrid from '../components/MediaGrid'

export default function Ratings({ profile, onSelectTitle }) {
  // Get rated titles from profile
  const ratedTitles = Object.entries(profile.library.ratings)
    .map(([titleKey, rating]) => ({ titleKey, rating }))
    .sort((a, b) => b.rating - a.rating)
  
  return (
    <div className={styles.ratings}>
      <h1>Your Ratings</h1>
      <p>Showing {ratedTitles.length} rated titles</p>
      <div className={styles.list}>
        {ratedTitles.map(({ titleKey, rating }) => (
          <div key={titleKey} className={styles.item}>
            <span>{titleKey}</span>
            <span>⭐ {rating}/10</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### 2. Add Route in App.jsx

```jsx
import Ratings from './pages/Ratings.jsx'

// In tabs object
const pages = {
  movies: <Movies ... />,
  tv: <TV ... />,
  watchlist: <NeedWatch ... />,
  ratings: <Ratings profile={profile} />,  // Add this
  ...
}

// In navigation buttons
<button onClick={() => { setTab('ratings'); writeSession('cs_tab', 'ratings') }}>
  Ratings
</button>
```

#### 3. Add Styling

Create `src/pages/Ratings.module.css`:
```css
.ratings {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 2rem;
}

.item {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
}
```

#### 4. Test
1. Rate some movies
2. Click Ratings tab
3. Verify rated titles display with correct ratings

### Example: Add a New API Endpoint to Backend

#### 1. Identify the Endpoint
Example: Add `/api/custom/trending` that returns only movies rated 8+

#### 2. Update server/index.mjs

```javascript
// After other route handlers, before file serving:

if (pathname === '/api/custom/trending') {
  // Get trending movies
  try {
    const moviesResponse = await fetch('https://api.themoviedb.org/3/trending/movie/week')
    const movies = await moviesResponse.json()
    
    // Filter to 8+ rated
    const highRated = movies.results.filter(m => m.vote_average >= 8)
    
    send(response, 200, JSON.stringify(highRated), {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    })
  } catch (err) {
    send(response, 500, 'Error fetching trending')
  }
  return
}
```

#### 3. Call from Frontend

```javascript
// In lib/api.js
export const api = {
  ...
  customTrendingMovies: () => fetch('/api/custom/trending').then(r => r.json()),
}
```

#### 4. Use in Component

```jsx
const [topRated, setTopRated] = useState([])

useEffect(() => {
  api.customTrendingMovies()
    .then(movies => setTopRated(movies))
    .catch(err => console.error(err))
}, [])
```

### Adding Authentication Features

#### Example: Add Google Sign-In Button

1. Set up Firebase project
2. Enable Google sign-in in Firebase Console
3. Add Firebase config to `.env`:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   ```

4. Update App.jsx auth UI to include:
   ```jsx
   <button onClick={() => signInWithGoogle()}>
     Sign in with Google
   </button>
   ```

5. App.jsx already handles:
   - Observing auth changes
   - Syncing profile to cloud
   - Merging cloud data on sign-in

---

## Common Issues & Fixes

### Issue 1: "TMDB credentials are not configured"

**Symptom**: Error 503 when loading movies

**Fixes**:
1. **Local Dev**: 
   - Check `.env` has `TMDB_API_KEY=...`
   - Restart `npm run api` server
   - Clear browser cache (Cmd+Shift+R)

2. **Netlify**:
   - Go to Site settings → Environment variables
   - Verify `TMDB_API_KEY` exists
   - Does NOT have `VITE_` prefix
   - Has "Functions" scope checked
   - Redeploy site after adding

3. **Self-hosted**:
   - Check `.env` file exists and readable
   - Verify line is `TMDB_API_KEY=abc123xyz`
   - Restart Node server: `pm2 restart max-cinema`

### Issue 2: API Rate Limit (429 Error)

**Symptom**: "Too many TMDB requests" error after heavy use

**Cause**: Backend allows 90 requests per minute per IP

**Fixes**:
1. **Short-term**: Wait 60 seconds, retry
2. **Long-term**: 
   - Reduce search frequency
   - Increase cache TTL in `server/index.mjs` line 20:
     ```javascript
     const cacheTtlMs = 10 * 60 * 1000 // 10 minutes
     ```
   - Increase cache size line 21:
     ```javascript
     const cacheMaxEntries = 500 // was 300
     ```

### Issue 3: Firebase Sync Not Working

**Symptom**: Watchlist not syncing across devices

**Checks**:
1. Verify `VITE_FIREBASE_*` environment variables set
2. Check Firebase Console:
   - Authentication → Enable "Google" and "Email/Password"
   - Authentication → Add your domain to "Authorized domains"
   - Realtime Database → Rules allow read/write to user data
3. Check browser console for Firebase errors
4. Verify you're signed in (check App.jsx `authUser` state)

**Database Rules** (copy to Firebase Console):
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

### Issue 4: Watchlist Data Lost

**Symptom**: Watched movies disappeared, watchlist is empty

**Cause**: LocalStorage was cleared (browser cache clear, private mode)

**Prevention**:
- Enable cloud sync with Firebase (survives browser clear)
- Regular backups via "Export watchlist" feature

**Recovery**:
- Check browser's IndexedDB (if PWA installed)
- Check Firefox profile backup
- Rebuild watchlist manually

### Issue 5: Service Worker Issues (PWA)

**Symptom**: App doesn't work offline, old version appears

**Fixes**:
1. Hard refresh: Cmd+Shift+R (not just Cmd+R)
2. Clear cache:
   ```bash
   # DevTools → Application → Cache Storage → Delete all
   ```
3. Check if Service Worker installed:
   - DevTools → Application → Service Workers
   - Should show `public/sw.js` as "activated and running"

### Issue 6: Video Player Not Working

**Symptom**: Player blank or shows error

**Causes**:
1. `EMBED_BASE` not configured or wrong URL
2. `EMBED_API_KEY` expired or invalid
3. Provider doesn't have movie/episode rights
4. Wrong season/episode number

**Fixes**:
1. Verify `EMBED_BASE` is HTTPS only (https://...)
2. Check provider's API documentation for correct URL format
3. Verify API key is valid and not expired
4. Test with a movie you know the provider has

### Issue 7: Build Fails ("vite build" error)

**Symptom**: `npm run build` exits with error

**Common Causes**:
- Syntax error in JSX
- Missing import
- TypeScript mismatch (if using TypeScript)

**Debug**:
```bash
# Run dev server to see errors
npm run dev

# Or check build output
npm run build 2>&1 | head -50
```

### Issue 8: Port Already in Use

**Symptom**: "EADDRINUSE: address already in use :::8787"

**Fixes**:
```bash
# Kill process using port
lsof -i :8787 | grep LISTEN | awk '{print $2}' | xargs kill

# Or use different port
PORT=9999 npm run api
```

### Issue 9: Slow Performance / High Memory

**Symptom**: App sluggish, takes time to load searches

**Optimization Tips**:
1. Increase cache TTL (fewer API calls)
2. Reduce cache max entries to prevent bloat
3. Optimize images (consider resizing with TMDB parameters)
4. Check browser DevTools Performance tab
5. Reduce number of trending items loaded at once

### Issue 10: CORS Errors in Console

**Symptom**: `Access-Control-Allow-Origin` errors in DevTools

**Why**: TMDB API not directly accessible from browser

**Solution**: Already handled! All TMDB calls go through `/api/tmdb` proxy.

**If still seeing CORS errors**:
- Check you're not calling TMDB API directly
- Verify all TMDB calls use `api.*` functions
- Check for external fonts/images with CORS issues

---

## Environment Configuration Reference

### Required Variables

```bash
# Movie database API
TMDB_API_KEY=your_v3_api_key_from_tmdb_org
# OR (alternative format):
# TMDB_READ_ACCESS_TOKEN=your_bearer_token
```

Get this from: https://www.themoviedb.org/settings/api

### Optional Backend Variables

```bash
# Server hosting
HOST=127.0.0.1              # Default: localhost only
PORT=8787                   # Default: 8787

# Video playback provider
EMBED_BASE=https://...      # Licensed provider URL (HTTPS only!)
EMBED_API_KEY=...           # Short-lived or browser-safe token
```

### Optional Frontend Variables (VITE_* prefix)

```bash
# Admin dashboard
VITE_ADMIN_MODE=false       # Set to 'true' to enable

# Firebase cloud sync & authentication
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://....firebaseio.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### Critical Security Notes

1. **Never commit `.env` file** - Add to `.gitignore`
2. **TMDB_API_KEY** - Keep private! Backend only!
3. **EMBED_API_KEY** - Use short-lived tokens only
4. **Firebase keys** - Frontend keys (VITE_*) are public, ok to expose
5. **On deployment** - Set env vars in service config, not in code

### Local Development .env Example

```bash
# Copy from .env.example and fill in your values
TMDB_API_KEY=abc123yourrealkeyhere
VITE_ADMIN_MODE=false
```

### Netlify Environment Setup

1. Dashboard → Site settings → Environment variables
2. Add each variable as separate Key=Value entry
3. For Function variables, select "Functions" scope
4. After adding, redeploy site (Push to Git or Manual Deploy)

**Example**:
```
Key: TMDB_API_KEY
Value: abc123yourrealkeyhere
Scope: Functions
```

---

## Performance Tips

### Optimize Caching
```javascript
// In server/index.mjs, adjust:
const cacheTtlMs = 10 * 60 * 1000  // Increase from 5 to 10 min
const cacheMaxEntries = 500         // Increase from 300
```

### Reduce Bundle Size
- Import only used components
- Check DevTools → Lighthouse for unused code
- Consider code-splitting for pages

### Image Optimization
```javascript
// TMDB provides different image sizes
posterUrl(path, false)  // 342px width (smaller)
posterUrl(path, true)   // 780px width (larger)
// Use smaller size by default, larger for details modal
```

### Lazy Load Components
```jsx
const Player = React.lazy(() => import('../components/Player'))

<Suspense fallback={<div>Loading...</div>}>
  <Player />
</Suspense>
```

---

## Testing Checklist

### Before Deployment
- [ ] TMDB API key works (test trending movies load)
- [ ] Watchlist add/remove works
- [ ] Search functionality works
- [ ] Video player loads (if enabled)
- [ ] Dark/light theme toggle works
- [ ] Profile switching works
- [ ] Export watchlist produces valid JSON
- [ ] Mobile responsiveness (test on phone/tablet)
- [ ] Keyboard shortcuts work (Cmd+K / /)
- [ ] No console errors

### After Deployment
- [ ] `/api/health` returns `{"ok":true}`
- [ ] Movies/TV load on production domain
- [ ] Search works with new queries
- [ ] Watchlist persists across page reload
- [ ] Share link works if domain is custom
- [ ] HTTPS certificate is valid
- [ ] No mixed content warnings (http resources on https)
- [ ] Lighthouse score > 80
- [ ] Can sign in (if Firebase enabled)

---

## Useful Resources

### TMDB API Docs
https://developer.themoviedb.org/docs

### React 18 Documentation
https://react.dev

### Vite Build Tool
https://vitejs.dev

### Firebase Setup
https://firebase.google.com/docs/auth

### Netlify Deployment
https://docs.netlify.com

### Node.js Best Practices
https://nodejs.org/en/docs/

### PWA & Service Workers
https://web.dev/progressive-web-apps/

---

## Summary

Max Cinema is a production-ready movie discovery app combining:
- Modern React frontend with Vite
- Secure Node.js proxy server
- TMDB API integration
- Optional cloud sync (Firebase)
- PWA capabilities
- Multiple deployment options

Start with local development, test thoroughly, then deploy to Netlify or your own server. The codebase is well-organized and ready for customization!
