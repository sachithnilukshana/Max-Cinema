// ── Max Cinema Use Credit Endpoint ───────────────────────────────────────────
// POST /api/use-credit
// Body: { uid, tmdbId, mediaType, title }
//
// Consumes 1 credit for watching a title as Premium VIP.
// Decrements user's credit balance in Firestore and returns updated count.

const FIREBASE_API_KEY = 'AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg'
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/login-6a0e1/databases/(default)/documents'

let _cachedAdminToken = null
let _cachedAdminUid = null
let _tokenExpiry = 0

async function getAdminToken() {
  if (_cachedAdminToken && Date.now() < _tokenExpiry) {
    return { token: _cachedAdminToken, uid: _cachedAdminUid }
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sachithnilukshana64@gmail.com'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sachith@2011.02.12'
  const passwords = [ADMIN_PASSWORD, 'Sachith@2011.02.12', 'Sachith@2011'].filter(Boolean)

  let authData = null
  for (const pw of passwords) {
    try {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ADMIN_EMAIL, password: pw, returnSecureToken: true }),
        }
      )
      const data = await res.json()
      if (data.idToken) {
        authData = data
        break
      }
    } catch {}
  }
  if (!authData?.idToken) throw new Error('Admin auth failed')

  _cachedAdminToken = data.idToken
  _cachedAdminUid = data.localId
  _tokenExpiry = Date.now() + 55 * 60 * 1000

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  let body = req.body
  try {
    if (typeof body === 'string') body = JSON.parse(body)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const uid = String(body?.uid || '').trim()
  const tmdbId = body?.tmdbId || ''
  const title = body?.title || 'Unknown Title'

  if (!uid || uid.length < 5) {
    return res.status(400).json({ error: 'Valid uid is required' })
  }

  try {
    const { token, uid: adminUid } = await getAdminToken()

    // 1. Fetch current admin document
    const docRes = await fetch(`${FIRESTORE_BASE}/users/${adminUid}`, {
      headers: { Authorization: 'Bearer ' + token },
    })

    if (!docRes.ok) {
      return res.status(500).json({ error: 'Failed to access Firestore' })
    }

    const doc = await docRes.json()
    const premiumUsers = doc.fields?.premiumUsers?.mapValue?.fields || {}
    const current = premiumUsers[uid]?.mapValue?.fields || {}
    const currentCredits = Number(current.credits?.integerValue || 0)

    // Even if server credits record is 0, allow local fallback to deduct or report insufficient
    if (currentCredits <= 0) {
      return res.status(403).json({
        ok: false,
        error: 'No credits remaining on your account.',
        credits: 0,
      })
    }

    const newCredits = Math.max(0, currentCredits - 1)

    // 2. Build updated fields
    const updatedUsers = { ...premiumUsers }
    updatedUsers[uid] = {
      mapValue: {
        fields: {
          ...current,
          credits: { integerValue: String(newCredits) },
          lastUsedCreditAt: { integerValue: String(Date.now()) },
          lastUsedTitle: { stringValue: String(title).slice(0, 100) },
        },
      },
    }

    // 3. Patch Firestore
    const patchRes = await fetch(
      `${FIRESTORE_BASE}/users/${adminUid}?updateMask.fieldPaths=premiumUsers`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { premiumUsers: { mapValue: { fields: updatedUsers } } } }),
      }
    )

    if (!patchRes.ok) {
      return res.status(500).json({ error: 'Failed to update credit in Firestore' })
    }

    return res.status(200).json({
      ok: true,
      credits: newCredits,
      consumed: 1,
      tmdbId,
      title,
    })
  } catch (err) {
    console.error('[use-credit]', err.message)
    // If server fails or offline, return a graceful response so client local storage handles deduction
    return res.status(200).json({
      ok: true,
      fallback: true,
      error: err.message,
    })
  }
}

