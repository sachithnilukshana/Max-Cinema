import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const data = req.body || {}
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1: uid,
      custom_2: planId,
    } = data

    // Verify hash if PAYHERE_SECRET is provided
    const secret = process.env.PAYHERE_SECRET
    if (secret && md5sig) {
      const hashedSecret = crypto.createHash('md5').update(secret).digest('hex').toUpperCase()
      const hashStr = `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`
      const localHash = crypto.createHash('md5').update(hashStr).digest('hex').toUpperCase()

      if (localHash !== md5sig) {
        console.warn('PayHere MD5 verification mismatch')
        return res.status(400).json({ error: 'Invalid signature' })
      }
    }

    // status_code 2 = success in PayHere
    if (String(status_code) === '2' && uid) {
      const adminEmail = process.env.ADMIN_EMAIL || 'sachithnilukshana64@gmail.com'
      const adminPass = process.env.ADMIN_PASSWORD || 'Sachith@2011'
      const apiKey = process.env.FIREBASE_API_KEY || 'AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg'
      const adminUid = process.env.ADMIN_UID || 's5q2j8XcSqWzwtk1nKVP0Ap09bs1'
      const botToken = process.env.TELEGRAM_BOT_TOKEN || '8538036210:AAFtVHOJflTWidvJJXY_IEMMEz0HNQa4BJU'
      const adminChatId = process.env.ADMIN_CHAT_ID || '8963612786'

      // Calculate expiry
      let durationDays = 30
      if (planId === 'annual') durationDays = 365
      else if (planId === 'lifetime') durationDays = 36500
      const expiresAt = Date.now() + durationDays * 24 * 60 * 60 * 1000

      // Firebase Admin Auth via REST
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
          // Update admin doc's premiumUsers map
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
                      paymentId: { stringValue: payment_id || 'manual' },
                    },
                  },
                },
              },
            }),
          })
        }
      } catch (err) {
        console.error('Failed to grant premium in Firestore:', err)
      }

      // Notify Telegram
      try {
        const tgText = `💳 *New VIP Payment Received!*\n\n👤 *User ID:* \`${uid}\`\n📦 *Plan:* ${planId || 'VIP'}\n💰 *Amount:* LKR ${payhere_amount}\n🧾 *Payment ID:* \`${payment_id}\`\n⏳ *Expires in:* ${durationDays} days`
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
        console.error('Failed to send Telegram message:', err)
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('PayHere notify handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}

