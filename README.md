<div align="center">

  <img src="public/max-cinema-logo.png" alt="Max Cinema Logo" width="120" style="border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);" />

  # MAX CINEMA

  **A Luxury, High-Performance Cinematic Streaming & Discovery Web Experience**

  [![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-8.3-646C9F?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Node](https://img.shields.io/badge/Node-%3E%3D20.19-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://developer.mozilla.org/docs/Web/Progressive_web_apps)
  [![Netlify](https://img.shields.io/badge/Netlify-Deployed-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://www.netlify.com/)
  [![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)

  <br />

  <p align="center">
    <b>Max Cinema</b> delivers a luxury digital entertainment experience democratized for all cinephiles. Discover trending movies, binge television series, inspect cast and crew filmographies, maintain an automatic watch history, and stream with a cinema-grade responsive player.
  </p>

</div>

---

## ✨ Features

- **🎬 Comprehensive Entertainment Catalog**  
  Browse thousands of movies and TV series powered by TMDB and CineScope curated endpoints. Live trending charts, top rated releases, and popular picks updated in real time.

- **🍿 Seamless Streaming & Player Controls**  
  Built-in cinematic video playback with responsive iframe handling, full-screen toggle, multi-season/episode selectors, and next-episode shortcuts.

- **🔍 Global Command Palette (`Ctrl+K` or `/`)**  
  Instant keyboard-first search and navigation across all movies, TV shows, and watchlists with live suggestions and debounced queries.

- **⏱️ Local Watch History & Continue Watching**  
  Automatically saves playback progress and recent titles locally. Features time-ago timestamps, quick-resume buttons, and privacy-respecting one-click history clearing.

- **🎭 Cast & Crew Filmography Explorer**  
  Interactive actor and director modal profiles detailing biographical overviews, dates of birth, combined credits, and quick links to titles they starred in.

- **🎯 Granular Multi-Filter Bar**  
  Filter effortlessly by genre, mood (*Feel-good, Romance, Thriller, Horror, Action, Drama*), original language (*English, Malayalam, Tamil, Telugu, Hindi, Korean*), release year, and minimum rating.

- **💎 Luxury Cinematic Design System**  
  Styled with EB Garamond typography, obsidian gold accents, silky smooth modal transitions, and dynamic dark / light themes persisted in local storage.

- **📱 Progressive Web App (PWA)**  
  Web app manifest, offline service worker caching, and home-screen installability on mobile (iOS/Android) and desktop (Chrome/Edge/macOS).

- **🛡️ Production-Grade Security & Privacy**  
  Serverless proxy shielding API keys from client inspection, strict Content Security Policy (CSP), nosniff headers, and cookie/privacy preference management.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Library** | [React 18](https://reactjs.org/) (Hooks, Context, Modals) |
| **Build & Dev Tool** | [Vite 8](https://vitejs.dev/) with Fast Refresh & Rolldown engine |
| **Styling** | Vanilla CSS Modules with custom theme variables |
| **Authentication** | [Firebase Auth v12](https://firebase.google.com/docs/auth) (Google & Email sign-in ready) |
| **Database & Analytics** | Supabase JS client & CineScope Analytics integration |
| **API Proxy & Backend** | Netlify Functions (`netlify/functions/`) & Node.js (`server/index.mjs`) |
| **Media Metadata** | [The Movie Database (TMDB) API v3](https://developer.themoviedb.org/docs) |
| **PWA & Offline** | Service Worker (`public/sw.js`) + Web App Manifest |

---

## 📁 Repository Structure

```
Max-Cinema/
├── netlify/
│   └── functions/              # Netlify Serverless API proxies
│       ├── health.mjs          # Healthcheck endpoint
│       ├── play.mjs            # Licensed embed proxy
│       └── tmdb.mjs            # Secure TMDB API proxy with whitelist validation
├── public/                     # Static assets, branding, and PWA manifest
│   ├── ads.txt                 # Google AdSense publisher validation
│   ├── favicon.ico             # App icon
│   ├── manifest.webmanifest    # PWA install specification
│   ├── max-cinema-logo.png     # Brand insignia
│   ├── robots.txt              # Search engine crawler configuration
│   ├── sitemap.xml             # XML sitemap
│   └── sw.js                   # Service worker for offline caching
├── server/
│   └── index.mjs               # Standalone production Node.js HTTP server & API proxy
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── CategoryRail.jsx    # Horizontal scrolling genre rails
│   │   ├── CineScopeAd.jsx     # Dynamic ad slot integration
│   │   ├── ContinueWatching.jsx# Resume playback shelf
│   │   ├── CuratedCollections.jsx # Hand-picked playlists & collections
│   │   ├── FilterBar.jsx       # Mood, language, genre, and year filter controls
│   │   ├── HeroCarousel.jsx    # Featured title hero banner with autoplay preview
│   │   ├── MediaCard.jsx       # Media poster cards with badges & quick actions
│   │   ├── MediaGrid.jsx       # Responsive grid layout for movie lists
│   │   ├── PersonModal.jsx     # Cast & crew biography and credit details
│   │   ├── Player.jsx          # Cinema playback overlay with fullscreen toggle
│   │   ├── SearchSuggestions.jsx # Autocomplete dropdown
│   │   ├── SeasonPicker.jsx    # Episode/Season selector for TV series
│   │   ├── TitleDetails.jsx    # Expanded details modal (cast, trailers, recs)
│   │   └── TrailerModal.jsx    # YouTube trailer lightbox player
│   ├── lib/                    # Core libraries & utilities
│   │   ├── api.js              # TMDB client & embed link helpers
│   │   ├── cinescopeApi.js     # Analytics and backend integration
│   │   ├── firebase.js         # Firebase Authentication client
│   │   ├── profile.js          # Local user preferences, library, and watch history
│   │   └── supabase.js         # Supabase client connector
│   ├── pages/                  # Page views
│   │   ├── Movies.jsx          # Movie exploration and discovery page
│   │   ├── TV.jsx              # TV series exploration page
│   │   ├── WatchHistory.jsx    # User watch history and playback log
│   │   ├── PrivacyPolicy.jsx   # Interactive privacy policy
│   │   └── Terms.jsx           # Terms of service page
│   ├── App.jsx                 # Main application root with tab & route state
│   ├── index.css               # Global typography, resets, and CSS custom properties
│   └── main.jsx                # React DOM entrypoint
├── supabase/
│   └── schema.sql              # Supabase database schema for backend features
├── .env.example                # Sample environment configuration template
├── netlify.toml                # Netlify build configuration, headers & routing
├── package.json                # Project dependencies and npm scripts
└── vite.config.js              # Vite bundler configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20.19.0` or higher
- **npm**: `v10.0.0` or higher
- (Optional) A free [TMDB API Key](https://www.themoviedb.org/settings/api)

### 2. Clone the Repository
```bash
git clone https://github.com/sachithnilukshana/Max-Cinema.git
cd Max-Cinema
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and provide your credentials:
```ini
# TMDB API Key (v3) or Read Access Token
TMDB_API_KEY=your_tmdb_api_key_here

# (Optional) Licensed embed playback base URL & key
EMBED_BASE=https://your-licensed-provider.example
EMBED_API_KEY=your_provider_key

# Supabase (Optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 5. Run Locally

**Option A: Vite Development Server**
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

**Option B: Full Stack Local Development with Node Server**
In one terminal, start the backend proxy:
```bash
npm run api
```
In a second terminal, start Vite:
```bash
npm run dev
```

---

## 🚢 Production Deployment

### Deploying to Netlify (Recommended)
This repository includes a pre-configured `netlify.toml` with serverless function routing, SPA fallback, and security headers:

1. Push your repository to GitHub.
2. Link your repository in [Netlify](https://app.netlify.com/).
3. Add your environment variables in Netlify:
   - `TMDB_API_KEY` = `your_tmdb_api_key`
4. Netlify will automatically run `npm run build` and publish the `dist` directory with `netlify/functions` deployed.

### Deploying with Standalone Node.js
You can also run Max Cinema on any Node.js container or cloud platform (Render, Railway, DigitalOcean, VPS):
```bash
# Build the production bundle
npm run build

# Start the Node HTTP server
npm start
```
The server will bind to `PORT` (default `8787`) or `HOST` defined in your environment and serve both static assets and API proxy endpoints securely.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> or <kbd>/</kbd> | Open Global Command Palette / Search |
| <kbd>Esc</kbd> | Close Search Palette, Modals, or Player |
| <kbd>Space</kbd> / Click | Play / Pause media |

---

## 📄 License & Credits

- Movie & TV metadata provided by [The Movie Database (TMDB)](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
- Distributed under the **MIT License**. See `LICENSE` for details.
- Maintained by [Sachith Nilukshana](https://github.com/sachithnilukshana).
