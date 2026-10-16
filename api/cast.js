// ── Max Cinema Fire TV Cast Synchronization API ─────────────────────────────
// GET / POST /api/cast
// Actions:
//   create:  TV registers 6-digit code
//   connect: Phone pairs with 6-digit code
//   poll:    TV checks for new media/commands sent by phone
//   send:    Phone sends movie/tv details to TV
//   command: Phone sends playback command (play, pause, stop)
//   status:  Check if session is active

const sessions = new Map()
const MAX_SESSIONS = 500
const SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

function cleanupOldSessions() {
  const now = Date.now()
  for (const [code, sess] of sessions.entries()) {
    if (now - sess.lastSeen > SESSION_TTL_MS) {
      sessions.delete(code)
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const query = req.query || {}
  const body = req.body || {}
  const action = String(query.action || body.action || '').toLowerCase()
  const code = String(query.code || body.code || '').replace(/\D/g, '').slice(0, 6)

  cleanupOldSessions()

  // 1. Create new TV session
  if (action === 'create') {
    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Valid 6-digit code required' })
    }
    sessions.set(code, {
      code,
      createdAt: Date.now(),
      lastSeen: Date.now(),
      senderConnected: false,
      media: null,
      command: null,
      mediaSeq: 0,
      cmdSeq: 0,
    })
    return res.status(200).json({ ok: true, code })
  }

  // Session lookup for subsequent actions
  if (!code || !sessions.has(code)) {
    return res.status(404).json({ error: 'Session not found or expired', code })
  }

  const session = sessions.get(code)
  session.lastSeen = Date.now()

  // 2. Phone connects to TV
  if (action === 'connect') {
    session.senderConnected = true
    session.senderConnectedAt = Date.now()
    return res.status(200).json({ ok: true, connected: true, code })
  }

  // 3. TV polls for updates
  if (action === 'poll') {
    const clientMediaSeq = Number(query.mediaSeq || body.mediaSeq || 0)
    const clientCmdSeq = Number(query.cmdSeq || body.cmdSeq || 0)

    const hasNewMedia = session.media && session.mediaSeq > clientMediaSeq
    const hasNewCmd = session.command && session.cmdSeq > clientCmdSeq

    return res.status(200).json({
      ok: true,
      senderConnected: session.senderConnected,
      mediaSeq: session.mediaSeq,
      cmdSeq: session.cmdSeq,
      media: hasNewMedia ? session.media : null,
      command: hasNewCmd ? session.command : null,
    })
  }

  // 4. Phone sends media to play on TV
  if (action === 'send') {
    const media = body.media || query.media
    if (!media) {
      return res.status(400).json({ error: 'Media object required' })
    }
    session.media = {
      ...media,
      timestamp: Date.now(),
    }
    session.mediaSeq += 1
    session.senderConnected = true
    return res.status(200).json({ ok: true, mediaSeq: session.mediaSeq })
  }

  // 5. Phone sends command (play, pause, stop)
  if (action === 'command') {
    const cmd = body.command || query.command || 'play'
    session.command = {
      type: cmd,
      timestamp: Date.now(),
    }
    session.cmdSeq += 1
    return res.status(200).json({ ok: true, cmdSeq: session.cmdSeq })
  }

  // 6. Check status
  if (action === 'status') {
    return res.status(200).json({
      ok: true,
      active: true,
      senderConnected: session.senderConnected,
      hasMedia: Boolean(session.media),
    })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
