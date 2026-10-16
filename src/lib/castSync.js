// ── Fire TV & Smart TV Real-Time Cast Sync ─────────────────────────────────
// Zero-permission, bulletproof sync using /api/cast backend endpoint

const STORAGE_KEY = 'cs_active_cast_code'

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
 * Registers code with /api/cast and continuously polls for incoming media commands.
 */
export function createReceiverSession(code, { onMediaChange, onCommand, onStatusChange } = {}) {
  let isMounted = true
  let mediaSeq = 0
  let cmdSeq = 0
  let pollTimer = null

  // 1. Register room
  fetch('/api/cast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'create', code }),
  })
    .then(res => res.json())
    .then(() => {
      if (!isMounted) return
      startPolling()
    })
    .catch(err => {
      console.warn('[castSync] Could not register session:', err)
      if (isMounted) startPolling()
    })

  function startPolling() {
    if (!isMounted) return

    const poll = async () => {
      if (!isMounted) return
      try {
        const res = await fetch(`/api/cast?action=poll&code=${code}&mediaSeq=${mediaSeq}&cmdSeq=${cmdSeq}`)
        if (res.ok) {
          const data = await res.json()
          if (!isMounted) return

          onStatusChange?.({ active: true, connectedSender: Boolean(data.senderConnected) })

          if (data.media) {
            mediaSeq = data.mediaSeq
            onMediaChange?.(data.media)
          }

          if (data.command) {
            cmdSeq = data.cmdSeq
            onCommand?.(data.command)
          }
        }
      } catch {}

      if (isMounted) {
        pollTimer = setTimeout(poll, 1400)
      }
    }

    poll()
  }

  return () => {
    isMounted = false
    if (pollTimer) clearTimeout(pollTimer)
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

  const res = await fetch('/api/cast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'connect', code }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Fire TV session not found. Make sure max-cinema.vercel.app/firetv is open on your Fire TV.')
  }

  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {}

  notifyCastChange({ connected: true, code })
  return { success: true, code }
}

/**
 * Disconnect phone from Fire TV.
 */
export async function disconnectCast() {
  const code = getActiveCastCode()
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

  try {
    const res = await fetch('/api/cast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', code, media: mediaPayload }),
    })
    if (!res.ok) return false
    notifyCastChange({ connected: true, code, media: mediaPayload })
    return true
  } catch {
    return false
  }
}

/**
 * Send playback command to Fire TV (e.g. 'pause', 'play', 'stop').
 */
export async function sendCastCommand(command) {
  const code = getActiveCastCode()
  if (!code) return false

  try {
    await fetch('/api/cast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'command', code, command }),
    })
    return true
  } catch {
    return false
  }
}
