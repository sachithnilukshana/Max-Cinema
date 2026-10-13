export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      uid,
      planId,
      cardNumber,
      cardholderName,
      expiry,
      cvv,
      amount,
    } = req.body || {}

    if (!uid) {
      return res.status(400).json({ error: 'Missing User ID' })
    }

    const cleanCard = (cardNumber || '').replace(/\s+/g, '')
    if (cleanCard.length < 12 || cleanCard.length > 19) {
      return res.status(400).json({ error: 'Invalid virtual card number. Must be a valid Cash Scan Connect Virtual Card.' })
    }

    if (!cvv || cvv.length < 3) {
      return res.status(400).json({ error: 'Invalid CVV / PIN code' })
    }

    // Mask card for logging/telegram
    const maskedCard = `${cleanCard.slice(0, 4)} **** **** ${cleanCard.slice(-4)}`

    // Determine duration
    let durationDays = 30
    if (planId === 'annual') durationDays = 365
    else if (planId === 'lifetime') durationDays = 36500

    const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000

    // Firebase Admin Auth & Firestore update
    const adminEmail = process.env.ADMIN_EMAIL || 'sachithnilukshana64@gmail.com'
    const adminPass = process.env.ADMIN_PASSWORD || 'Sachith@2011'
    const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg'
    const adminUid = process.env.ADMIN_UID || 's5q2j8XcSqWzwtk1nKVP0Ap09bs1'
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8882793489:AAGs43RKRxS0qO3T_h-bpzprevpOLnLMh1E'
    const adminChatId = process.env.ADMIN_CHAT_ID || '8963612786'

    try {
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: adminEmail, password: adminPass, returnSecureToken: true }),
        }
      )
      const authData = await authRes.json()

      if (authData.idToken) {
        const patchUrl = `https://firestore.googleapis.com/v1/projects/login-6a0e1/databases/(default)/documents/users/${adminUid}?updateMask.fieldPaths=premiumUsers.${uid}&key=${apiKey}`
        await fetch(patchUrl, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authData.idToken}`,
          },
          body: JSON.stringify({
            fields: {
              [`premiumUsers.${uid}`]: {
                mapValue: {
                  fields: {
                    plan: { stringValue: planId || 'vip' },
                    grantedAt: { integerValue: Date.now().toString() },
                    expiresAt: { integerValue: expiresAt.toString() },
                    paymentMethod: { stringValue: 'Cash Scan Connect Virtual Card' },
                    virtualCard: { stringValue: maskedCard },
                    cardholder: { stringValue: cardholderName || 'Cardholder' },
                  },
                },
              },
            },
          }),
        })
      }
    } catch (err) {
      console.warn('Firestore update error:', err)
    }

    // Telegram Notification
    try {
      const tgText = `💳 *Cash Scan Connect Virtual Card Payment!*\n\n` +
        `👤 *User ID:* \`${uid}\`\n` +
        `🏷 *Plan:* ${planId ? planId.toUpperCase() : 'VIP'}\n` +
        `💰 *Amount:* LKR ${amount || '299'}\n` +
        `💳 *Virtual Card:* \`${maskedCard}\`\n` +
        `👤 *Cardholder:* ${cardholderName || 'Virtual Account'}\n` +
        `🌐 *Source:* [Cash Scan Connect](https://cash-scan-connect.lovable.app/)\n` +
        `⏳ *Duration:* ${durationDays} days`

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
      console.warn('Telegram notification error:', err)
    }

    return res.status(200).json({
      ok: true,
      plan: planId,
      expiresAt,
      durationDays,
    })
  } catch (err) {
    console.error('Virtual card payment error:', err)
    return res.status(500).json({ error: err.message })
  }
}

