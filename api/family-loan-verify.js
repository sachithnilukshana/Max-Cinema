// ── Max Cinema Family Loan Verification & Activation ─────────────────────────
// POST /api/family-loan-verify
// Body: { paymentId, uid, planId, durationDays, details }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache')
  const origin = req.headers?.origin || ''
  const allowedOrigins = [
    'https://max-cinema.vercel.app',
    'https://max-cinema-telegram-bot1.onrender.com',
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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }

    const { paymentId, uid, planId, durationDays, details } = body || {}

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' })
    }

    // 1. Verify with Cash Scan Connect public checkout API
    const verifyRes = await fetch(`https://cash-scan-connect.lovable.app/api/public/checkout/${paymentId}`)
    if (!verifyRes.ok) {
      return res.status(400).json({ error: 'Failed to verify payment with Cash Scan Connect' })
    }

    const p = await verifyRes.json()
    if (p?.status !== 'paid') {
      return res.status(400).json({ error: 'Payment status is not paid', status: p?.status })
    }

    const targetUid = uid || (p.ref?.includes('__') ? p.ref.split('__')[0] : p.ref) || 'guest_user'
    const days = Number(durationDays) || (planId === 'annual' ? 365 : planId === 'lifetime' ? 36500 : 30)
    const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000

    // 2. Firebase Admin Auth & Firestore update
    const adminEmail = process.env.ADMIN_EMAIL || 'sachithnilukshana64@gmail.com'
    const adminPass = process.env.ADMIN_PASSWORD || 'Sachith@2011.02.12'
    const passwords = [adminPass, 'Sachith@2011.02.12', 'Sachith@2011'].filter(Boolean)
    const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg'
    const adminUid = process.env.ADMIN_UID || 's5q2j8XcSqWzwtk1nKVP0Ap09bs1'
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8882793489:AAGs43RKRxS0qO3T_h-bpzprevpOLnLMh1E'
    const adminChatId = process.env.ADMIN_CHAT_ID || '8963612786'

    let authData = null
    for (const pw of passwords) {
      try {
        const authRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: pw, returnSecureToken: true }),
          }
        )
        const data = await authRes.json()
        if (data.idToken) {
          authData = data
          break
        }
      } catch {}
    }

    if (authData?.idToken) {
      try {
        const docUrl = `https://firestore.googleapis.com/v1/projects/login-6a0e1/databases/(default)/documents/users/${adminUid}?key=${apiKey}`
        const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.idToken}` }

        const docRes = await fetch(docUrl, { headers: authHeaders })
        const doc = docRes.ok ? await docRes.json() : {}
        const existingPremiumUsers = doc.fields?.premiumUsers?.mapValue?.fields || {}

        existingPremiumUsers[targetUid] = {
          mapValue: {
            fields: {
              active: { booleanValue: true },
              plan: { stringValue: planId || 'monthly' },
              grantedAt: { integerValue: String(Date.now()) },
              expiresAt: { integerValue: String(expiresAt) },
              paymentMethod: { stringValue: 'Cash Scan Connect Family Loan' },
              paymentId: { stringValue: String(paymentId) },
              amount: { stringValue: String(p.amount) },
              item: { stringValue: String(p.item || 'VIP Membership') },
            },
          },
        }

        await fetch(`${docUrl}&updateMask.fieldPaths=premiumUsers`, {
          method: 'PATCH',
          headers: authHeaders,
          body: JSON.stringify({
            fields: {
              premiumUsers: { mapValue: { fields: existingPremiumUsers } },
            },
          }),
        })
      } catch (err) {
        console.warn('Firestore update warning:', err)
      }
    }

    // 3. Telegram notification
    try {
      const tgText =
        `⚡ *Cash Scan Connect Family Loan Payment!*\n\n` +
        `👤 *User ID:* \`${targetUid}\`\n` +
        `🏷 *Plan:* *${(planId || 'vip').toUpperCase()} VIP*\n` +
        `💰 *Amount:* *$${p.amount}*\n` +
        `📦 *Item:* ${p.item || 'VIP Membership'}\n` +
        `🆔 *Payment ID:* \`${paymentId}\`\n` +
        `⏳ *Duration:* ${days} days`

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: tgText,
          parse_mode: 'Markdown',
        }),
      })
    } catch (err) {
      console.warn('Telegram notification warning:', err)
    }

    return res.status(200).json({
      ok: true,
      status: 'paid',
      plan: planId,
      expiresAt,
      durationDays: days,
      paymentId,
    })
  } catch (err) {
    console.error('Family loan verify error:', err)
    return res.status(500).json({ error: err.message })
  }
}
