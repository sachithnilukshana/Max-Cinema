// ── Fire TV & Smart TV Real-Time Cast Sync ─────────────────────────────────
// Connects phone/laptop directly to Fire TV via Firebase Realtime Database
import { db } from './firebase.js'
import { ref, set, get, onValue, update, remove, onDisconnect } from 'firebase/database'

const STORAGE_KEY = 'cs_active_cast_code'
const RTDB_PREFIX = 'cast_sessions'

function notifyCastChange(detail) {
  try {
    window.dispatchEvent(new CustomEvent('Max Cinema:castchange', { detail }))
  } catch {}
}

export function generateCastCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function getActiveCastCode() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null
  } catch {
    return null
  }
}

export function isCastConnected() {
  return Boolean(getActiveCastCode())
}

/**
 * Receiver (Fire TV) side session creator.
 * Sets up the 6-digit room on Firebase and listens for incoming media commands.
 */
export function createReceiverSession(code, { onMediaChange, onCommand, onStatusChange } = {}) {
  if (!db) {
    console.warn('Firebase RTDB not initialized')
    return () => {}
  }

  const sessionRef = ref(db, `${RTDB_PREFIX}/${code}`)

  // Register session with TV metadata
  set(sessionRef, {
    tvActive: true,
    createdAt: Date.now(),
    lastSeen: Date.now(),
    device: 'Fire TV / Smart TV',
    media: null,
    command: null,
  }).catch(err => console.warn('Could not register TV session in RTDB:', err))

  // Clean up if TV disconnects
  try {
    onDisconnect(sessionRef).remove()
  } catch {}

  // Heartbeat every 20s
  const heartbeat = setInterval(() => {
    update(sessionRef, { lastSeen: Date.now() }).catch(() => {})
  }, 20000)

  let previousMediaTime = 0
  let previousCmdTime = 0

  const unsubscribe = onValue(sessionRef, snapshot => {
    if (!snapshot.exists()) {
      onStatusChange?.({ active: false })
      return
    }

    const data = snapshot.val()
    onStatusChange?.({ active: true, connectedSender: Boolean(data.senderActive) })

    if (data.media && data.media.timestamp !== previousMediaTime) {
      previousMediaTime = data.media.timestamp
      onMediaChange?.(data.media)
    }

    if (data.command && data.command.timestamp !== previousCmdTime) {
      previousCmdTime = data.command.timestamp
      onCommand?.(data.command)
    }
  })

  return () => {
    clearInterval(heartbeat)
    unsubscribe()
    remove(sessionRef).catch(() => {})
  }
}

/**
 * Sender (Phone/Laptop) connects to the Fire TV code.
 */
export async function connectToReceiver(rawCode) {
  const code = (rawCode || '').replace(/\D/g, '').trim()
  if (code.length !== 6) {
    throw new Error('Please enter a valid 6-digit code shown on your Fire TV screen.')
  }

  if (!db) {
    // Local fallback for offline testing
    localStorage.setItem(STORAGE_KEY, code)
    notifyCastChange({ connected: true, code })
    return { success: true, code }
  }

  const sessionRef = ref(db, `${RTDB_PREFIX}/${code}`)
  const snapshot = await get(sessionRef)

  if (!snapshot.exists()) {
    throw new Error('Fire TV session not found. Make sure https://max-cinema.vercel.app/firetv is open on your Fire TV.')
  }

  await update(sessionRef, {
    senderActive: true,
    senderConnectedAt: Date.now(),
  })

  localStorage.setItem(STORAGE_KEY, code)
  notifyCastChange({ connected: true, code })
  return { success: true, code }
}

/**
 * Disconnect phone from Fire TV.
 */
export async function disconnectCast() {
  const code = getActiveCastCode()
  if (code && db) {
    try {
      const sessionRef = ref(db, `${RTDB_PREFIX}/${code}`)
      await update(sessionRef, { senderActive: false })
    } catch {}
  }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
  notifyCastChange({ connected: false, code: null })
}

/**
 * Cast a movie or TV show to the connected Fire TV.
 */
export async function castMediaToReceiver(item) {
  const code = getActiveCastCode()
  if (!code) return false

  const mediaPayload = {
    mediaType: item.media_type || (item.name ? 'tv' : 'movie'),
    tmdbId: String(item.tmdbId || item.id),
    season: Number(item.season) || 1,
    episode: Number(item.episode) || 1,
    title: item.title || item.name || 'Untitled',
    poster_path: item.poster_path || '',
    backdrop_path: item.backdrop_path || '',
    vote_average: item.vote_average || 0,
    timestamp: Date.now(),
  }

  if (db) {
    const sessionRef = ref(db, `${RTDB_PREFIX}/${code}`)
    await update(sessionRef, {
      media: mediaPayload,
      command: { type: 'play', timestamp: Date.now() },
    })
  }

  notifyCastChange({ connected: true, code, media: mediaPayload })
  return true
}

/**
 * Send playback command to Fire TV (e.g. 'pause', 'play', 'stop').
 */
export async function sendCastCommand(type) {
  const code = getActiveCastCode()
  if (!code || !db) return false

  const sessionRef = ref(db, `${RTDB_PREFIX}/${code}`)
  await update(sessionRef, {
    command: { type, timestamp: Date.now() },
  })
  return true
}
