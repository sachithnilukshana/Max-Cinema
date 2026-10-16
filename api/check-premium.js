// ── Max Cinema Premium Status Check ───────────────────────────────────────────
// GET /api/check-premium?uid=<userUid>
//
// Reads the admin's Firestore document's `premiumUsers` map.
// Returns { active, plan, expiresAt } for the requested uid.

const FIREBASE_API_KEY = 'AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg'
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/login-6a0e1/databases/(default)/documents'

let _cachedAdminToken = null
let _cachedAdminUid = null
let _tokenExpiry = 0

async function getAdminToken() {
  // Reuse token if still valid (Firebase tokens last 1h; reuse for 55 min)
  if (_cachedAdminToken && Date.now() < _tokenExpiry) {
    return { token: _cachedAdminToken, uid: _cachedAdminUid }
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sachithnilukshana64@gmail.com'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sachith@2011'

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, returnSecureToken: true }),
    }
  )
  const data = await res.json()
  if (!data.idToken) throw new Error('Admin auth failed')

  _cachedAdminToken = data.idToken
  _cachedAdminUid = data.localId
  _tokenExpiry = Date.now() + 55 * 60 * 1000 // 55 minutes

  return { token: data.idToken, uid: data.localId }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache')
  const origin = req.headers?.origin || ''
  const allowedOrigins = [
    'https://max-cinema-telegram-bot1.onrender.com',
    'https://max-cinema.vercel.app',
    'http://localhost:5173',
    'http://localhost:8787',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8787',
  ]
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }

  if (req.method === 'OPTIONS') return res.status(204).end()

  const uid = String(req.query?.uid || '').trim()
  if (!uid || uid.length < 10) {
    return res.status(400).json({ error: 'uid required' })
  }

  try {
    const { token, uid: adminUid } = await getAdminToken()

    const docRes = await fetch(`${FIRESTORE_BASE}/users/${adminUid}`, {
      headers: { Authorization: 'Bearer ' + token },
    })

    if (!docRes.ok) {
      return res.status(200).json({ active: false, credits: 0 })
    }

    const doc = await docRes.json()
    const premiumUsers = doc.fields?.premiumUsers?.mapValue?.fields || {}
    const grant = premiumUsers[uid]?.mapValue?.fields
    const credits = Number(grant?.credits?.integerValue || 0)

    if (!grant || grant.active?.booleanValue !== true) {
      return res.status(200).json({ active: false, credits })
    }

    const expiresAt = grant.expiresAt?.integerValue ? Number(grant.expiresAt.integerValue) : null
    if (expiresAt && Date.now() > expiresAt) {
      return res.status(200).json({ active: false, expired: true, credits })
    }

    return res.status(200).json({
      active: true,
      plan: grant.plan?.stringValue || 'monthly',
      expiresAt,
      credits,
    })
  } catch (err) {
    console.error('[check-premium]', err.message)
    // Fail open — client will use localStorage fallback
    return res.status(200).json({ active: false, credits: 0 })
  }
}

