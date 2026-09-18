# Max Cinema - Visual Architecture Overview

## System Architecture Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                           MAX CINEMA SYSTEM                               ║
║                                                                            ║
║  ┌──────────────────────────────────────────────────────────────────┐    ║
║  │                      USER BROWSER                                │    ║
║  │                                                                  │    ║
║  │  ┌──────────────────────────────────────────────────────────┐   │    ║
║  │  │             React App (Vite Bundle)                      │   │    ║
║  │  │  ┌─────────────────────────────────────────────────┐    │   │    ║
║  │  │  │ App.jsx (Main Component & Routing)             │    │   │    ║
║  │  │  ├─ Movies Page  ─┐                               │    │   │    ║
║  │  │  ├─ TV Page       ├─→ MediaGrid → MediaCard       │    │   │    ║
║  │  │  ├─ Watchlist     ├─→ TitleDetails Modal          │    │   │    ║
║  │  │  ├─ Admin Page    ├─→ Player Component            │    │   │    ║
║  │  │  └─ Legal Pages   ├─→ SearchSuggestions           │    │   │    ║
║  │  │                   ├─→ PersonalControls            │    │   │    ║
║  │  │                   └─→ Other Components            │    │   │    ║
║  │  └─────────────────────────────────────────────────────┘    │   │    ║
║  │                                                              │   │    ║
║  │  ┌──────────────────────────────────────────────────────┐   │   │    ║
║  │  │         State Management & Storage                   │   │   │    ║
║  │  ├─ React State (in-memory)                             │   │   │    ║
║  │  ├─ LocalStorage (persistent)                           │   │   │    ║
║  │  │  ├─ cs_active_profile                               │   │   │    ║
║  │  │  ├─ cs_watchlist_*                                   │   │   │    ║
║  │  │  ├─ cs_library_*                                     │   │   │    ║
║  │  │  ├─ cs_theme (dark/light)                            │   │   │    ║
║  │  │  └─ cs_tab (current page)                            │   │   │    ║
║  │  └─────────────────────────────────────────────────────┘   │   │    ║
║  │                          ↓                                  │   │    ║
║  └───────────────────────────────────────────────────────────┘   │    ║
║                          ↓ HTTP                                  │    ║
║  ┌──────────────────────────────────────────────────────────┐    │    ║
║  │          Backend Server (Node.js)                        │    │    ║
║  │  ┌────────────────────────────────────────────────────┐  │    │    ║
║  │  │ Port 8787 (localhost:8787)                         │  │    │    ║
║  │  │                                                    │  │    │    ║
║  │  │ Routes:                                           │  │    │    ║
║  │  │ ┌─ /api/tmdb?path=...                             │  │    │    ║
║  │  │ │  └─→ Proxy to TMDB API                         │  │    │    ║
║  │  │ │     • Cache responses (5 min)                  │  │    │    ║
║  │  │ │     • Rate limit (90 req/min)                  │  │    │    ║
║  │  │ │     • Validate requests                        │  │    │    ║
║  │  │ │     • Protect TMDB credentials                 │  │    │    ║
║  │  │ │                                                │  │    │    ║
║  │  │ ├─ /api/play/movie/:id                           │  │    │    ║
║  │  │ │  └─→ Redirect to video provider                │  │    │    ║
║  │  │ │                                                │  │    │    ║
║  │  │ ├─ /api/play/tv/:id/:season/:episode             │  │    │    ║
║  │  │ │  └─→ Redirect to video provider                │  │    │    ║
║  │  │ │                                                │  │    │    ║
║  │  │ ├─ /api/health                                   │  │    │    ║
║  │  │ │  └─→ Health check ({"ok":true})                │  │    │    ║
║  │  │ │                                                │  │    │    ║
║  │  │ └─ /* (all other paths)                          │  │    │    ║
║  │  │    └─→ Serve static files from dist/             │  │    │    ║
║  │  │        (HTML, JS, CSS, images)                   │  │    │    ║
║  │  │                                                  │  │    │    ║
║  │  │ Security:                                        │  │    │    ║
║  │  │ • Content-Security-Policy headers                │  │    │    ║
║  │  │ • X-Frame-Options: DENY                          │  │    │    ║
║  │  │ • X-Content-Type-Options: nosniff                │  │    │    ║
║  │  └────────────────────────────────────────────────┘  │    │    ║
║  └──────────────────────────────────────────────────────┘    │    ║
║                          ↓ HTTPS                               │    ║
└────────────────────────────────────────────────────────────────┘    ║
                                                                       ║
║  ┌──────────────────────────────────────────────────────────┐        ║
║  │          External Services (over HTTPS)                │        ║
║  │                                                          │        ║
║  │  ✓ TMDB API v3                                         │        ║
║  │    ├─ /trending/movie/week                            │        ║
║  │    ├─ /search/movie?query=...                         │        ║
║  │    ├─ /movie/{id}                                     │        ║
║  │    ├─ /movie/{id}/videos                              │        ║
║  │    ├─ /movie/{id}/watch/providers                     │        ║
║  │    ├─ /movie/{id}/credits                             │        ║
║  │    └─ /movie/{id}/recommendations                     │        ║
║  │    (TV endpoints similar)                             │        ║
║  │                                                        │        ║
║  │  ✓ Firebase (Optional)                               │        ║
║  │    ├─ Authentication (Google, Email/Password)        │        ║
║  │    └─ Realtime Database (cloud profile sync)         │        ║
║  │                                                        │        ║
║  │  ✓ Video Provider (Optional)                         │        ║
║  │    └─ Licensed embed or YouTube                       │        ║
║  │                                                        │        ║
║  │  ✓ Google AdSense (Optional)                         │        ║
║  │    ├─ Ad serving                                      │        ║
║  │    └─ Revenue tracking                                │        ║
║  └──────────────────────────────────────────────────────┘        ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════════════╝
```

---

## File Structure Map

```
cinescope/
│
├── src/                                 # React source code
│   ├── App.jsx                         # Main app component (391 lines)
│   ├── App.module.css                  # App styling (442 lines)
│   ├── main.jsx                        # React entry point
│   ├── index.css                       # Global styles
│   │
│   ├── pages/                          # Full-page components
│   │   ├── Movies.jsx                  # Trending movies & search
│   │   ├── TV.jsx                      # Trending TV shows
│   │   ├── NeedWatch.jsx               # Watchlist management
│   │   ├── Admin.jsx                   # Admin dashboard
│   │   ├── PrivacyPolicy.jsx           # Legal pages
│   │   ├── Terms.jsx
│   │   └── *.module.css                # Page-specific styles
│   │
│   ├── components/                     # Reusable components
│   │   ├── MediaCard.jsx               # Movie/show card
│   │   ├── MediaGrid.jsx               # Grid layout
│   │   ├── TitleDetails.jsx            # Details modal (152 lines)
│   │   ├── Player.jsx                  # Video player
│   │   ├── SeasonPicker.jsx            # TV season selector
│   │   ├── PersonalControls.jsx        # Rating/notes/favorite
│   │   ├── SearchSuggestions.jsx       # Search with suggestions
│   │   ├── WatchOptions.jsx            # Where to watch info
│   │   ├── ContinueWatching.jsx        # Resume watching
│   │   ├── TasteRecommendations.jsx    # ML recommendations
│   │   ├── ReleaseReminders.jsx        # Notifications
│   │   ├── AdUnit.jsx                  # Google AdSense
│   │   └── *.module.css                # Component styles
│   │
│   └── lib/                            # Utility libraries
│       ├── api.js                      # TMDB API wrapper (82 lines)
│       ├── profile.js                  # Profile/library management (253 lines)
│       ├── supabase.js                 # Firebase authentication
│       └── admin.js                    # Admin utilities
│
├── server/                             # Backend server
│   └── index.mjs                       # Node.js HTTP server (246 lines)
│       └── Routes: /api/tmdb, /api/play, /api/health, /*
│
├── netlify/                            # Serverless deployment
│   └── functions/
│       ├── tmdb.js                     # Netlify Function: TMDB proxy
│       ├── health.js                   # Netlify Function: Health check
│       └── play.js                     # Netlify Function: Video redirect
│
├── public/                             # Static assets
│   ├── index.html                      # HTML shell
│   ├── favicon.ico                     # Browser tab icon
│   ├── manifest.webmanifest            # PWA metadata
│   ├── sw.js                           # Service worker
│   ├── robots.txt                      # SEO
│   ├── sitemap.xml                     # SEO
│   ├── ads.txt                         # AdSense
│   └── *.png/jpg                       # Images
│
├── dist/                               # Production build (generated)
│   ├── index.html
│   ├── assets/
│   │   ├── *.js (optimized bundles)
│   │   └── *.css (optimized styles)
│   └── (same structure as public/)
│
├── node_modules/                       # Dependencies (generated)
│   ├── react/
│   ├── react-dom/
│   ├── firebase/
│   ├── vite/
│   └── (500+ packages)
│
├── .env.example                        # Environment template
├── .env                                # Environment secrets (not in git)
├── .gitignore                          # Git ignore rules
├── package.json                        # Dependencies & scripts
├── package-lock.json                   # Dependency lock file
├── vite.config.js                      # Vite bundler config
├── netlify.toml                        # Netlify deployment config
├── README.md                           # Project readme
└── deno.lock                           # Alternative runtime lock
```

---

## Component Dependency Tree

```
App (state management hub)
│
├─→ Navigation & Tabs
│   └─→ Profile Selector
│   └─→ Theme Toggle
│   └─→ Auth Modal
│
├─→ Pages (conditional)
│   ├─→ Movies Page
│   │   ├─→ SearchSuggestions
│   │   │   └─→ Dropdown list
│   │   ├─→ MediaGrid
│   │   │   └─→ MediaCard (×N)
│   │   │       └─→ on-click: TitleDetails Modal
│   │   │
│   │   └─→ TitleDetails Modal (shared)
│   │       ├─→ Player
│   │       │   └─→ <iframe>
│   │       ├─→ PersonalControls
│   │       │   ├─→ Rating input
│   │       │   ├─→ Notes textarea
│   │       │   └─→ Favorite button
│   │       ├─→ SeasonPicker (if TV show)
│   │       │   ├─→ Season selector
│   │       │   └─→ Episode list
│   │       ├─→ WatchOptions
│   │       │   └─→ Provider list
│   │       ├─→ TasteRecommendations
│   │       │   └─→ MediaGrid (similar movies)
│   │       └─→ ReleaseReminders
│   │
│   ├─→ TV Page
│   │   └─→ (same as Movies page)
│   │
│   ├─→ NeedWatch (Watchlist)
│   │   ├─→ Search filter
│   │   ├─→ MediaGrid (watchlist items)
│   │   ├─→ Export button
│   │   └─→ Restore deleted items
│   │
│   ├─→ Admin Page (optional)
│   │   └─→ Admin controls
│   │
│   └─→ Legal Pages
│       ├─→ Privacy Policy
│       └─→ Terms of Service
│
└─→ Global Modals
    ├─→ Auth Modal (if Firebase)
    ├─→ Profile Modal
    └─→ Search Command Palette (Cmd+K)
```

---

## Data Flow Diagram: Adding to Watchlist

```
User clicks "Add to Watchlist" button
                    │
                    ▼
┌─────────────────────────────────┐
│ PersonalControls Component      │
│ handleAddWatchlist(titleData)   │
└─────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│ profile.addWatchItem(profileId, {            │
│   id: 123,                                   │
│   title: 'Inception',                        │
│   mediaType: 'movie',                        │
│   posterPath: '/abc.jpg'                     │
│ })                                           │
└──────────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│ lib/profile.js: getProfileLibrary()          │
│ 1. Read localStorage[cs_library_profileId]  │
│ 2. Get watchlist array                       │
│ 3. Append new item                           │
│ 4. Write back to localStorage                │
│ 5. Dispatch custom event                     │
└──────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
    localStorage  Event    Cloud Sync
    Updated    Dispatched  (if Firebase)
    │           │           │
    ├──→ Browser storage   │
    │    persists         │
    │    across reloads   │
    │                     │
    ├──→ All listeners   │
    │    receive event   │
    │    NeedWatch      │
    │    refetch UI     │
    │                   │
    └──→ Firebase SDK   │
        auto-syncs      │
        to cloud        │
        database        │
        │
        └──→ Other devices fetch latest data
             User sees watchlist everywhere!
```

---

## Deployment Architecture Options

### Option 1: Netlify (Recommended)

```
┌──────────────────────────────────────────────────────┐
│                  Your GitHub Repo                     │
│            (code + build config)                      │
└──────────────────────────────────────────────────────┘
                        │ git push
                        ▼
┌──────────────────────────────────────────────────────┐
│              Netlify Dashboard                        │
│  • Detects push to main branch                       │
│  • Runs build: npm run build                         │
│  • Creates dist/ folder (optimized assets)           │
│  • Deploys to global CDN                             │
└──────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    Static Files   Netlify Functions   Environment
    (HTML/JS/CSS)  (/api/tmdb, etc)    Variables
    ↓              ↓                   ↓
    Cached on      Proxy TMDB API      TMDB_API_KEY
    Global CDN     Serverless scale    FIREBASE_*
                                       EMBED_*
                        │
                        ▼
            https://your-site.netlify.app
            Available worldwide! ✨
```

### Option 2: Self-Hosted

```
┌──────────────────────────────────────┐
│     Your Linux Server                │
│   (Ubuntu 20.04 LTS)                │
└──────────────────────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌─────────────┐  ┌──────────────────────┐
│   SSH/Git   │  │  Reverse Proxy       │
│   Deploy    │  │  (Nginx/Apache)      │
│             │  │  • HTTPS termination │
│ npm install │  │  • Redirect 80→443   │
│ npm build   │  │  • Proxy to :8787    │
│ pm2 start   │  │  • Security headers  │
└─────────────┘  └──────────────────────┘
    │                    │
    └─→ Node.js Server ←─┘
        (port 8787)
        • Serve static files
        • Proxy to TMDB API
        • Handle video requests
        
        └→ https://your-domain.com
           Fully controlled! 🔧
```

---

## State Management Overview

```
App Component (main state holder)
│
├─ UI State
│  ├─ tab: 'movies' | 'tv' | 'watchlist' | ...
│  ├─ theme: 'dark' | 'light'
│  ├─ profileOpen: true | false
│  ├─ commandOpen: true | false (search modal)
│  └─ path: '/' | '/about' | ...
│
├─ User State
│  ├─ profile: { id, name, library }
│  ├─ profileName: '' (editing)
│  └─ authUser: null | { id, email, ... } (Firebase)
│
├─ Auth State (Firebase)
│  ├─ authBusy: true | false
│  ├─ authError: ''
│  ├─ authMode: 'signin' | 'signup'
│  ├─ authEmail: ''
│  ├─ authPassword: ''
│  └─ cloudReady: true | false (syncing)
│
├─ Config State
│  ├─ adminConfig: { ... }
│  └─ adminEnabled: true | false
│
├─ Search State (in SearchSuggestions)
│  ├─ query: ''
│  └─ suggestions: [ ... ]
│
└─ Storage State (persisted)
    ├─ localStorage['cs_active_profile']: JSON
    ├─ localStorage['cs_watchlist_*']: JSON
    ├─ localStorage['cs_library_*']: JSON
    ├─ localStorage['cs_theme']: string
    └─ sessionStorage['cs_tab']: string
```

---

## API Call Flow (TMDB Example)

```
Frontend                Backend               TMDB API
(React)              (Node.js)              (External)
   │                    │                      │
   ├─ fetch(            │                      │
   │  '/api/tmdb?     ──│                      │
   │   path=...') ──→  Check cache           │
   │                    │                      │
   │                    ├─ Cache hit?         │
   │                    │  Yes ─→ Return cached response ─→ ✓ Done
   │                    │  No ──→ Fetch from TMDB
   │                    │       │              │
   │                    │       ├─ Validate path
   │                    │       ├─ Check rate limit
   │                    │       └─ Set timeout
   │                    │              │       │
   │                    │              ├─→ fetch() ──→ API Call
   │                    │              │              │
   │                    │              │ ←──────────── Response
   │                    │       ├─ Cache for 5 min
   │                    │       └─ Return JSON
   │   ←─ Response JSON ←────── │       │
   │                    │       │       │
   Parse JSON           │       │       │
   │                    │       │       │
   setState(data)       │       │       │
   │                    │       │       │
   Render UI            │       │       │
```

---

## Component Size & Complexity

```
Large Components (200+ lines)
├─ App.jsx                      ████████████████████ 390
├─ NeedWatch.jsx               ████████████████     260
├─ TV.jsx                       ████████████████     231
├─ Movies.jsx                   ████████████████     229
├─ profile.js                   ████████████████████ 253
└─ (mostly state + rendering)

Medium Components (80-160 lines)
├─ TitleDetails.jsx             █████████████        152
├─ SeasonPicker.jsx             ██████████           99
├─ WatchOptions.jsx             ███████              93
├─ PersonalControls.jsx         ██████               88
├─ SearchSuggestions.jsx        ██████               84
└─ Player.jsx                   ██████               84

Small Components (<80 lines)
├─ ReleaseReminders.jsx         ██████               67
├─ MediaCard.jsx                ████                 50
├─ MediaGrid.jsx                ████                 45
├─ ContinueWatching.jsx         ███                  35
└─ TasteRecommendations.jsx     ███                  30

Note: Line counts exclude CSS files
```

---

## Technology Stack Layers

```
Layer 1: User Interface
┌─────────────────────────────────────────┐
│ HTML (semantic structure)               │
│ CSS Modules (scoped styling)            │
│ JavaScript (interactivity)              │
│ Accessibility Features                  │
└─────────────────────────────────────────┘
              ↓
Layer 2: Frontend Framework
┌─────────────────────────────────────────┐
│ React 18.3.1 (UI library)               │
│ React Hooks (state management)          │
│ CSS Modules (component styling)         │
│ Custom Events (cross-component comm)    │
└─────────────────────────────────────────┘
              ↓
Layer 3: Build & Development
┌─────────────────────────────────────────┐
│ Vite 8.3.0 (bundler & dev server)       │
│ ES6+ JavaScript (modern syntax)         │
│ npm (package manager)                   │
│ Node.js (runtime)                       │
└─────────────────────────────────────────┘
              ↓
Layer 4: Backend Services
┌─────────────────────────────────────────┐
│ Node.js HTTP Server (port 8787)         │
│ Express-like routing                    │
│ Middleware (caching, rate limiting)     │
│ Proxy to TMDB API                       │
└─────────────────────────────────────────┘
              ↓
Layer 5: External APIs & Services
┌─────────────────────────────────────────┐
│ TMDB API (movie/TV data)                │
│ Firebase (auth + database)              │
│ Google AdSense (monetization)           │
│ Video Providers (video playback)        │
└─────────────────────────────────────────┘
              ↓
Layer 6: Browser APIs & Storage
┌─────────────────────────────────────────┐
│ localStorage (persistent storage)       │
│ sessionStorage (session data)           │
│ Service Worker (offline caching)        │
│ IndexedDB (large storage)               │
│ Fetch API (HTTP requests)               │
└─────────────────────────────────────────┘
```

---

## Performance Optimization Chain

```
User Request
│
├─ Browser Cache Hit?
│  └─ Yes: Return instantly (0ms) ✨
│
├─ Service Worker Cache Hit?
│  └─ Yes: Return from SW (5-10ms) ⚡
│
├─ Server Cache Hit (/api/tmdb)?
│  └─ Yes: Return from Node cache (20-50ms) 🚀
│
├─ TMDB Rate Limit Check?
│  └─ Exceeded: Wait/Retry (with 429 response)
│
├─ Request to TMDB API?
│  └─ Fetch data (200-500ms)
│
├─ Cache Response for 5 min
│  └─ Store in server memory
│
└─ Return to Frontend
   └─ Parse JSON → Render UI (100-200ms)

Total time: 50-500ms depending on cache hits
Average: 150-300ms with good caching ✓
```

---

## Security Layers

```
Attack Vector          Defense Mechanism        Status
─────────────────────────────────────────────────────
API Credential Theft   Server-side proxy         ✅ Protected
                       Keys never in frontend
                       ✅ Only /api/tmdb allowed

Rate Limiting Attack   Rate limiter              ✅ Protected
                       90 req/min per IP
                       ✅ Prevents abuse

SQL Injection          No database used          ✅ Not applicable
                       LocalStorage only
                       ✅ Safe for now

XSS Attack            Content-Security-Policy   ✅ Protected
                       No inline scripts
                       ✅ Trusted domains only

CSRF Attack           Same-origin requests      ✅ Protected
                       No state-changing GET
                       ✅ POST with CSRF token

Data Breach           Encryption in transit     ✅ HTTPS only
                       HTTPS reverse proxy
                       ✅ TLS 1.2+

Unauthorized Access   Firebase security rules   ✅ Protected
                       Per-user data isolation
                       ✅ Token-based auth

DoS Attack            Rate limiting             ✅ Mitigated
                       Timeout protection
                       ✅ Reverse proxy (prod)
```

---

## Development Workflow

```
1. Setup (15 min)
   ├─ git clone ...
   ├─ npm install
   ├─ Create .env
   └─ Ready!

2. Development (daily)
   ├─ npm run dev (Terminal 1)
   ├─ npm run api (Terminal 2)
   ├─ Edit code
   └─ Hot reload ✨

3. Testing
   ├─ Browser DevTools (Network, Console)
   ├─ Check localStorage
   ├─ Test watchlist features
   └─ Mobile viewport testing

4. Build
   └─ npm run build → dist/

5. Deployment
   ├─ git commit
   ├─ git push
   └─ Netlify auto-deploys! 🚀

6. Monitor
   ├─ /api/health endpoint
   ├─ Netlify Analytics
   ├─ Browser Console
   └─ User feedback
```

---

## Quick Decision Tree

```
I want to...

├─ Add a new page
│  ├─ Create src/pages/MyPage.jsx
│  ├─ Add route in App.jsx
│  └─ Add button to navigate
│
├─ Modify styling
│  ├─ Edit *.module.css
│  └─ Styles auto-reload
│
├─ Change API calls
│  ├─ Edit src/lib/api.js
│  ├─ Update component fetch
│  └─ Test in browser
│
├─ Add new component
│  ├─ Create src/components/MyComponent.jsx
│  ├─ Import in parent
│  └─ Pass props
│
├─ Deploy to production
│  ├─ npm run build (local test)
│  ├─ git push (GitHub)
│  └─ Netlify deploys auto ✅
│
├─ Debug an issue
│  ├─ Open DevTools (F12)
│  ├─ Check Network tab
│  ├─ Check Console for errors
│  └─ Check localStorage
│
└─ Add Firebase authentication
   ├─ Set VITE_FIREBASE_* env vars
   ├─ Auth modal already exists
   └─ Cloud sync automatic ✓
```

---

This visual guide provides quick reference for understanding and navigating the Max Cinema architecture! 🎬
