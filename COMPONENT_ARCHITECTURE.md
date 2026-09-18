# Max Cinema - Component Architecture & Data Flow

## Component Hierarchy

```
App (391 lines)
├── Page Routes (conditional rendering)
│   ├── Movies Page
│   │   ├── MediaGrid
│   │   │   └── MediaCard (repeated)
│   │   │       └── on-click → TitleDetails Modal
│   │   │           ├── Player (if watching)
│   │   │           ├── PersonalControls
│   │   │           ├── WatchOptions
│   │   │           ├── TasteRecommendations
│   │   │           ├── SeasonPicker (if TV)
│   │   │           ├── ReleaseReminders
│   │   │           └── SearchSuggestions
│   │   └── SearchSuggestions
│   │       └── Dropdown with suggestions
│   ├── TV Page
│   │   └── Similar structure to Movies
│   ├── NeedWatch (Watchlist) Page
│   │   ├── MediaGrid (watchlist items)
│   │   └── Export/search/filter controls
│   ├── Admin Page (optional)
│   ├── PrivacyPolicy Page
│   └── Terms Page
├── Top Navigation
│   ├── Profile selector/switcher
│   ├── Theme toggle
│   ├── Auth modal (if Firebase)
│   ├── Help/About links
│   └── Settings menu
└── Global Modals
    ├── TitleDetails (movie/show info)
    ├── Auth modal (sign-in/up)
    └── Search command palette (Cmd+K)
```

## State Management

### App-Level State (in App.jsx)

```javascript
const [tab, setTab] = useState('movies')              // Current page
const [homeKey, setHomeKey] = useState(0)             // Re-render trigger
const [profile, setProfile] = useState(...)           // { id, name, library }
const [profileOpen, setProfileOpen] = useState(false) // Profile menu open
const [profileName, setProfileName] = useState('')    // New profile name input
const [adminConfig, setAdminConfig] = useState({})    // Admin settings
const [theme, setTheme] = useState('dark')            // 'dark' or 'light'
const [commandOpen, setCommandOpen] = useState(false) // Search modal open
const [commandQuery, setCommandQuery] = useState('')  // Search text
const [path, setPath] = useState('/')                 // Current URL path
const [privacyNotice, setPrivacyNotice] = useState('') // Privacy banner
const [authUser, setAuthUser] = useState(null)        // Firebase user object
const [cloudReady, setCloudReady] = useState(true)    // Cloud sync ready
const [authBusy, setAuthBusy] = useState(false)       // Auth in progress
const [authError, setAuthError] = useState('')        // Auth error message
const [authMode, setAuthMode] = useState('signin')    // 'signin' or 'signup'
const [authEmail, setAuthEmail] = useState('')        // Auth input: email
const [authPassword, setAuthPassword] = useState('')  // Auth input: password
```

### Profile Structure

```javascript
{
  id: 'profile-name',           // Unique profile ID
  name: 'Profile Name',         // Display name
  library: {
    // Core watchlist
    watchlist: [
      {
        id: 123,
        title: 'Movie Title',
        mediaType: 'movie',
        posterPath: '/abc123.jpg',
        releaseDate: '2024-01-15'
      }
    ],
    
    // Viewing history
    continueWatching: [456, 789],    // TV show IDs
    episodeProgress: {
      'tv:456': { season: 2, episode: 5 }
    },
    
    // User interactions
    ratings: {
      'movie:123': 8.5,
      'tv:456': 7.0
    },
    notes: {
      'movie:123': 'Great movie!'
    },
    favorites: ['movie:123', 'tv:456'],
    
    // Collections (custom groups)
    collections: [
      {
        id: 'col-001',
        name: 'Favorites',
        itemKeys: ['movie:123', 'tv:456']
      }
    ],
    
    // Admin/system
    reports: [],              // Issue reports
    remindersEnabled: false,  // Notifications
    notifiedReleases: []      // Release alerts sent
  }
}
```

---

## Component Details

### MediaGrid Component
**Purpose**: Render responsive grid of movies/shows

**Props**:
```javascript
{
  items: [           // Array of movie/tv objects from TMDB API
    { id, title, poster_path, vote_average, ... }
  ],
  isLoading: false,  // Show loading state
  isEmpty: false,    // Show empty state
  onSelectItem: (item) => {} // Callback when user clicks card
}
```

**Children**:
- MediaCard (repeated for each item)

**State**:
- Manages grid layout via CSS
- Responsive breakpoints

### MediaCard Component
**Purpose**: Display single movie/show card

**Props**:
```javascript
{
  item: { id, title, poster_path, vote_average },
  onSelect: (item) => {},  // Fires on click
  isInWatchlist: false     // Optional badge
}
```

**Features**:
- Hover effects
- Rating badge
- Watchlist indicator
- Click → open details modal

### TitleDetails Component
**Purpose**: Modal showing full movie/show information

**Props**:
```javascript
{
  titleId: 123,
  mediaType: 'movie',
  profile: {...},           // User profile for watchlist/ratings
  onClose: () => {},
  onWatchlistChange: () => {}
}
```

**State**:
```javascript
const [details, setDetails] = useState(null)      // API response
const [videos, setVideos] = useState([])          // Trailers
const [providers, setProviders] = useState([])    // Where to watch
const [credits, setCredits] = useState([])        // Cast/crew
const [recommendations, setRecommendations] = []  // Similar titles
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')
```

**API Calls** (useEffect):
```javascript
useEffect(() => {
  Promise.all([
    api.movieDetails(titleId),
    api.movieVideos(titleId),
    api.movieProviders(titleId),
    api.movieCredits(titleId),
    api.movieRecommendations(titleId)
  ]).then(([details, videos, providers, credits, recs]) => {
    setDetails(details)
    setVideos(videos)
    setProviders(providers)
    setCredits(credits)
    setRecommendations(recs)
  })
}, [titleId, mediaType])
```

**Child Components**:
- Player (if watching)
- PersonalControls (rating, notes, favorite)
- SeasonPicker (if TV show)
- WatchOptions (where to watch)
- TasteRecommendations

### Player Component
**Purpose**: Video player (iframe wrapper)

**Props**:
```javascript
{
  movieId: 123,
  tvId: 456,
  season: 2,
  episode: 5,
  onClose: () => {}
}
```

**Render**:
```jsx
<iframe src={movieEmbedUrl(movieId) || tvEmbedUrl(tvId, season, episode)} />
```

**Flow**:
1. iframe requests `/api/play/movie/123`
2. Backend redirects to licensed provider or YouTube
3. Iframe displays video content

### SeasonPicker Component
**Purpose**: Select TV show season/episode

**Props**:
```javascript
{
  tvId: 456,
  totalSeasons: 5,
  onSelectEpisode: (season, episode) => {},
  currentProgress: { season: 2, episode: 5 }
}
```

**State**:
```javascript
const [selectedSeason, setSelectedSeason] = useState(1)
const [seasonDetails, setSeasonDetails] = useState(null)
```

**API Call**:
```javascript
useEffect(() => {
  api.seasonDetails(tvId, selectedSeason)
    .then(data => setSeasonDetails(data))
}, [selectedSeason])
```

### PersonalControls Component
**Purpose**: Rating, notes, favorites

**Props**:
```javascript
{
  titleKey: 'movie:123',    // Unique identifier
  profile: {...},
  onUpdate: () => {}        // Callback after update
}
```

**Features**:
```jsx
<RatingInput value={rating} onChange={(val) => setRating(profile.id, titleKey, val)} />
<textarea value={notes} onChange={(val) => setNotes(profile.id, titleKey, val)} />
<button onClick={() => toggleFavorite(profile.id, titleKey)}>★ Favorite</button>
```

**Data Flow**:
1. User enters rating (1-10)
2. Call `profile.setTitleRating(profileId, titleKey, rating)`
3. Update localStorage
4. Trigger 'Max Cinema:profiledatachange' event
5. Other components listen and update

### SearchSuggestions Component
**Purpose**: Search bar with live suggestions

**State**:
```javascript
const [query, setQuery] = useState('')
const [suggestions, setSuggestions] = useState([])
const [isLoading, setIsLoading] = useState(false)
```

**Event Handlers**:
```javascript
const handleSearch = async (q) => {
  setQuery(q)
  if (q.length < 2) {
    setSuggestions([])
    return
  }
  
  setIsLoading(true)
  try {
    const results = await api.searchMovies(q)
    setSuggestions(results.results.slice(0, 5))
  } catch (err) {
    console.error(err)
  }
  setIsLoading(false)
}

const handleSelect = (movie) => {
  // Open TitleDetails with this movie
  onSelectTitle(movie)
  setQuery('')
  setSuggestions([])
}
```

### NeedWatch (Watchlist) Page
**Purpose**: Manage user's watchlist

**Props**:
```javascript
{
  profile: {...},
  onProfileChange: () => {}
}
```

**Features**:
- List of watchlist items
- Search within watchlist
- Remove button
- Restore button (undo deletion)
- Export as JSON
- Sort/filter options

**Data Access**:
```javascript
const watchlist = profile.library.watchlist
const deleted = profile.library.deletedWatchlist // Undo stack

// Remove from watchlist
const handleRemove = (titleKey) => {
  removeWatchItem(profile.id, titleKey)
  setProfile(getActiveProfile()) // Refresh
}

// Restore deleted item
const handleRestore = (titleKey) => {
  restoreWatchItem(profile.id, titleKey)
  setProfile(getActiveProfile())
}

// Export
const handleExport = () => {
  const json = JSON.stringify(profile.library, null, 2)
  downloadFile(json, 'watchlist.json')
}
```

### TasteRecommendations Component
**Purpose**: ML-based movie recommendations (future feature)

**Current Implementation**:
- Calls TMDB recommendations API
- Shows related movies for title

**Future Enhancement**:
- Analyze user's ratings
- Recommend similar titles
- Machine learning integration

### ReleaseReminders Component
**Purpose**: Notify about new releases

**Props**:
```javascript
{
  profile: {...},
  onUpdate: () => {}
}
```

**Features**:
- Toggle reminders on/off
- Select favorite actors/directors
- Get notified when they release new content
- Push notifications (if enabled)

---

## Data Flow Diagrams

### User Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Page Load                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  App.jsx useEffect: observeAuth()   │
        │  (if Firebase configured)           │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Firebase.auth().onAuthStateChanged │
        │  Check if user is logged in         │
        └─────────────────────────────────────┘
                    │                  │
          (not logged in)      (logged in)
                    │                  │
                    ▼                  ▼
            ┌──────────────┐   ┌──────────────────┐
            │ Show Auth    │   │ Fetch cloud      │
            │ Modal        │   │ profile from DB  │
            └──────────────┘   └──────────────────┘
                    │                  │
                    │                  ▼
                    │        ┌──────────────────┐
                    │        │ Cloud data       │
                    │        │ exists?          │
                    │        └──────────────────┘
                    │           │           │
                    │       (yes)│      (no)│
                    │           ▼          ▼
                    │        ┌──────────────┐
                    │        │ Merge cloud  │
                    │        │ data into    │
                    │        │ local        │
                    │        │ profile      │
                    │        └──────────────┘
                    │           (or copy local to cloud)
                    │                  │
                    │                  ▼
                    │    ┌────────────────────────────┐
                    └───→│  setAuthUser(user)         │
                         │  setProfile(merged data)   │
                         │  Subscribe to changes      │
                         └────────────────────────────┘
                                      │
                                      ▼
                         ┌────────────────────────────┐
                         │  App renders with user     │
                         │  Auto-sync profile changes │
                         │  to cloud database         │
                         └────────────────────────────┘
```

### Movie Search Flow

```
┌─────────────────────────────────────────┐
│  User types in SearchSuggestions        │
│  Input: "Inception"                     │
└─────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ SearchSuggestions      │
        │ onInput:               │
        │ handleSearch("Incep")  │
        └────────────────────────┘
                    │
                    ▼ (if query.length >= 2)
        ┌────────────────────────────────────────┐
        │ api.searchMovies("Inception")           │
        │ = fetch(/api/tmdb?path=...search...)   │
        └────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────────────────┐
        │ Backend (server/index.mjs)              │
        │ GET /api/tmdb?path=/search/movie...    │
        └────────────────────────────────────────┘
                    │
            ┌───────┼───────┐
            │       │       │
        (cached)   (fresh)  (error)
            │       │       │
            ▼       ▼       ▼
        ┌────┐ ┌─────────────────────┐ ┌──────┐
        │Return│ │ TMDB API Request    │ │Error │
        │from  │ │ GET api.themoviedb  │ │page  │
        │cache │ │ .org/3/search...    │ │503   │
        └────┘ └─────────────────────┘ └──────┘
            │       │       │
            └───────┼───────┘
                    ▼
        ┌────────────────────────┐
        │ JSON Response:         │
        │ {                      │
        │   "results": [         │
        │     {id: 27205,        │
        │      title: "Inception",│
        │      poster_path: ...} │
        │   ]                    │
        │ }                      │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────┐
        │ SearchSuggestions:          │
        │ setState(suggestions)       │
        │ Render dropdown with top 5  │
        └────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ User clicks movie      │
        │ onSelectMovie(item)    │
        └────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────────────┐
        │ Open TitleDetails modal             │
        │ with movieId=27205                  │
        │ Load full details, videos,          │
        │ providers, credits, etc.            │
        └────────────────────────────────────┘
```

### Watchlist Management Flow

```
┌──────────────────────────────────────────┐
│  User Views Movie Details                │
│  TitleDetails Modal Opens                │
└──────────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────┐
        │ PersonalControls Component │
        │ Shows buttons:             │
        │ + Add to Need Watch        │
        │ ★ Favorite                 │
        │ ⭐ Rate (1-10)             │
        │ 📝 Add note                │
        └────────────────────────────┘
                    │
         ┌──────────┴──────────┬──────────┐
         │                     │          │
    (Add to list)        (Favorite)   (Rate)
         │                     │          │
         ▼                     ▼          ▼
    ┌─────────────────────────────────────────┐
    │ Call library function:                  │
    │ addWatchItem() / toggleFavorite() /     │
    │ setTitleRating()                        │
    └─────────────────────────────────────────┘
         │
         ▼
    ┌──────────────────────────────────────────────┐
    │ profile.js library:                          │
    │ 1. Get profile from localStorage             │
    │ 2. Update library (watchlist/ratings/notes)  │
    │ 3. Save back to localStorage                 │
    │ 4. Dispatch 'Max Cinema:librarychange' event │
    └──────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────┐
    │ localStorage Update:                   │
    │ Key: cs_watchlist_guest                │
    │ Value: JSON with new item              │
    │ Persists across page reloads           │
    └────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────┐
    │ Event Listeners (across app):                  │
    │ - NeedWatch page re-fetches watchlist          │
    │ - MediaCard updates bookmark indicator         │
    │ - PersonalControls updates UI                  │
    │ - Any component listening dispatches update    │
    └────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────┐
    │ If Firebase signed in:                 │
    │ Update cloud database with new data    │
    │ writeCloudProfile(userId, profile)     │
    └────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────┐
    │ On Other Devices:                      │
    │ readCloudProfile() fetches latest data │
    │ Watchlist synced across all devices    │
    └────────────────────────────────────────┘
```

### Profile Switching Flow

```
┌─────────────────────────────────────────┐
│  User clicks "Create Profile" button    │
│  Inputs: "Alice", "Bob", "Kids"         │
└─────────────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────┐
        │ saveActiveProfile(name)         │
        │ (in lib/profile.js)             │
        └─────────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────────┐
        │ Generate profile:                    │
        │ {                                    │
        │   id: 'alice',  (slugified name)    │
        │   name: 'Alice' (display name)      │
        │ }                                    │
        └──────────────────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────────────────┐
        │ localStorage set:                    │
        │ cs_active_profile = {                │
        │   id: 'alice',                      │
        │   name: 'Alice'                     │
        │ }                                    │
        └──────────────────────────────────────┘
                    │
                    ▼
        ┌────────────────────────────────────────────┐
        │ Create empty library if needed:            │
        │ cs_watchlist_alice = { watchlist: [] }    │
        │ cs_library_alice = {                       │
        │   ratings: {}, notes: {}, favorites: []   │
        │ }                                          │
        └────────────────────────────────────────────┘
                    │
                    ▼
        ┌─────────────────────────────────┐
        │ App.jsx:                        │
        │ setProfile({id:'alice', ...})   │
        │ profileOpen = false             │
        │ Re-render with new profile      │
        └─────────────────────────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
    (Switching) (Saving data)
         │                     │
         ▼                     ▼
    ┌──────────────────┐  ┌─────────────────┐
    │Fetch Alice's     │  │Update UI with   │
    │watchlist from    │  │Alice's data     │
    │cs_watchlist_alice│  │(ratings,notes)  │
    └──────────────────┘  └─────────────────┘
         │                     │
         └─────────────┬───────┘
                       ▼
            ┌────────────────────────┐
            │ User sees:             │
            │ Alice's watchlist      │
            │ Alice's ratings       │
            │ Alice's notes         │
            │ Fresh start!          │
            └────────────────────────┘
```

---

## API Integration Points

### Frontend → Backend Communication

All TMDB API calls go through `/api/tmdb` endpoint:

```javascript
// Frontend (src/lib/api.js)
const response = await fetch('/api/tmdb?path=/trending/movie/week')

// Backend (server/index.mjs)
// Intercepts, validates, caches, then:
// Proxies to https://api.themoviedb.org/3/trending/movie/week
// Returns response to frontend
```

### Video Playback Endpoint

```javascript
// Frontend: generates URL
<iframe src="/api/play/movie/27205" />

// Backend: redirects to provider
// If licensed provider: redirect to provider URL
// Else: redirect to YouTube embed
// Else: 404
```

---

## Event System

### Custom Events (for cross-component communication)

**Library Change Event**:
```javascript
// Dispatch when watchlist/ratings updated
window.dispatchEvent(
  new CustomEvent('Max Cinema:librarychange', {
    detail: { profileId: 'alice' }
  })
)

// Listen in component
window.addEventListener('Max Cinema:librarychange', (event) => {
  const { profileId } = event.detail
  // Re-fetch data, update UI
})
```

**Profile Data Change Event**:
```javascript
// Similar to library change
window.dispatchEvent(
  new CustomEvent('Max Cinema:profiledatachange', {
    detail: { profileId: 'alice' }
  })
)
```

---

## Performance Considerations

### Component Re-render Triggers

1. **State changes in App.jsx**
   - Causes full app re-render
   - Use `React.memo()` for components that don't need refresh

2. **Storage events**
   - Custom events dispatch when library updates
   - Listeners cause component re-renders

3. **API responses**
   - TitleDetails modal re-fetches data when titleId changes
   - Uses useEffect cleanup to prevent race conditions

### Optimization Opportunities

```javascript
// Use React.memo to prevent unnecessary re-renders
export default React.memo(function MediaCard({ item, onSelect }) {
  return ...
})

// Use useCallback for stable function references
const handleSelect = useCallback((item) => {
  onSelect(item)
}, [onSelect])

// Use useMemo for expensive calculations
const filteredMovies = useMemo(() => {
  return movies.filter(m => m.rating >= 7)
}, [movies])
```

---

## Summary

Max Cinema uses:
- **Component-based architecture** with React
- **Props drilling** for simple data flow (could use Context API for deep nesting)
- **Custom events** for cross-component communication
- **localStorage** for persistence
- **API proxy** for security
- **Lazy loading** for modals

The system is modular and easy to extend with new pages, components, and features!
