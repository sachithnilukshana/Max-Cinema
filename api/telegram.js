// ── Max Cinema Telegram Bot Webhook ───────────────────────────────────────────
// POST /api/telegram
//
// Commands (admin only):
//   /grant <uid> [monthly|annual|lifetime]  → activate premium
//   /revoke <uid>                           → remove premium
//   /check <uid>                            → check premium status
//   /help                                   → usage guide
//   <uid>                                   → shorthand for /grant <uid> monthly

const FIREBASE_API_KEY = 'AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg'
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/login-6a0e1/databases/(default)/documents'

// ── helpers ───────────────────────────────────────────────────────────────────

async function adminSignIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  )
  const data = await res.json()
  if (!data.idToken) throw new Error('Admin sign-in failed: ' + (data.error?.message || 'unknown'))
  return data
}

async function readAdminDoc(adminUid, token) {
  const res = await fetch(`${FIRESTORE_BASE}/users/${adminUid}`, {
    headers: { Authorization: 'Bearer ' + token },
  })
  if (!res.ok) throw new Error('Firestore read failed: ' + res.status)
  return res.json()
}

async function writeAdminDoc(adminUid, token, fields) {
  const res = await fetch(
    `${FIRESTORE_BASE}/users/${adminUid}?updateMask.fieldPaths=premiumUsers`,
    {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }
  )
  return res.status
}

async function lookupUidByEmail(token, email) {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token, email: [email] }),
      }
    )
    const data = await res.json()
    return data.users?.[0]?.localId || null
  } catch {
    return null
  }
}

function buildCreditFields(existingFields, targetUid, newCredits) {
  const fields = { ...existingFields }
  const current = fields[targetUid]?.mapValue?.fields || {}
  fields[targetUid] = {
    mapValue: {
      fields: {
        active: current.active || { booleanValue: false },
        ...(current.plan ? { plan: current.plan } : {}),
        ...(current.expiresAt ? { expiresAt: current.expiresAt } : {}),
        ...(current.grantedAt ? { grantedAt: current.grantedAt } : {}),
        credits: { integerValue: String(Math.max(0, newCredits)) },
        updatedAt: { integerValue: String(Date.now()) },
      },
    },
  }
  return fields
}

function buildGrantFields(existingFields, targetUid, plan, expiresAt) {
  const fields = { ...existingFields }
  const current = fields[targetUid]?.mapValue?.fields || {}
  fields[targetUid] = {
    mapValue: {
      fields: {
        ...current,
        active: { booleanValue: true },
        plan: { stringValue: plan },
        grantedAt: { integerValue: String(Date.now()) },
        ...(expiresAt ? { expiresAt: { integerValue: String(expiresAt) } } : {}),
      },
    },
  }
  return fields
}

function buildRevokeFields(existingFields, targetUid) {
  const fields = { ...existingFields }
  if (fields[targetUid]) {
    fields[targetUid] = {
      mapValue: {
        fields: {
          ...fields[targetUid].mapValue.fields,
          active: { booleanValue: false },
          revokedAt: { integerValue: String(Date.now()) },
        },
      },
    }
  }
  return fields
}

async function tgSend(botToken, chatId, text) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  }).catch(() => {})
}

// ── handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Telegram only sends POST
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '8882793489:AAGs43RKRxS0qO3T_h-bpzprevpOLnLMh1E'
  const ADMIN_CHAT_ID = String(process.env.ADMIN_CHAT_ID || '8963612786')
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'sachithnilukshana64@gmail.com'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sachith@2011'

  if (!BOT_TOKEN) return res.status(500).send('BOT_TOKEN not configured')

  let update
  try {
    update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(200).send('ok')
  }

  const message = update?.message || update?.edited_message
  if (!message) return res.status(200).send('ok')

  const chatId = String(message.chat?.id || '')
  const text = (message.text || '').trim()

  // ── Access control ─────────────────────────────────────────────────────────
  if (chatId !== ADMIN_CHAT_ID) {
    await tgSend(BOT_TOKEN, chatId,
      '⛔ Access denied. This bot is private.'
    )
    return res.status(200).send('ok')
  }

  // ── Parse command ──────────────────────────────────────────────────────────
  const parts = text.split(/\s+/).filter(Boolean)
  const cmd = parts[0]?.toLowerCase() || ''

  const HELP_TEXT =
    `🎬 *Max Cinema Admin Bot*\n\n` +
    `*VIP Subscription Commands:*\n` +
    `\`/grant <uid|email> [plan]\` — Activate VIP subscription\n` +
    `\`/revoke <uid|email>\` — Revoke VIP subscription\n` +
    `\`/check <uid|email>\` — Check VIP & credits status\n\n` +
    `*🎟️ Pay-per-View Credits Commands:*\n` +
    `\`/addcredit <uid|email> [amount]\` — Add credits (e.g. \`/addcredit heshan 5\`)\n` +
    `\`/setcredit <uid|email> <amount>\` — Set exact credit balance\n` +
    `\`/credits <uid|email>\` — Check credit balance\n\n` +
    `*Plans:* \`monthly\` (30d) · \`annual\` (365d) · \`lifetime\` (∞)\n` +
    `*Shorthand:* paste any raw UID to grant monthly VIP.`

  if (cmd === '/start' || cmd === '/help') {
    await tgSend(BOT_TOKEN, chatId, HELP_TEXT)
    return res.status(200).send('ok')
  }

  // ── Grant premium ──────────────────────────────────────────────────────────
  if (cmd === '/grant' || cmd === '/activate' || cmd === '/premium') {
    const targetInput = parts[1]
    if (!targetInput) {
      await tgSend(BOT_TOKEN, chatId, '❌ Usage: `/grant <uid|email> [monthly|annual|lifetime]`')
      return res.status(200).send('ok')
    }
    const planArg = (parts[2] || 'monthly').toLowerCase()
    let plan = 'monthly'
    let durationDays = 30
    if (planArg === 'annual' || planArg === 'year' || planArg === '365') {
      plan = 'annual'; durationDays = 365
    } else if (planArg === 'lifetime' || planArg === 'life' || planArg === 'vip') {
      plan = 'lifetime'; durationDays = 0
    }
    const expiresAt = durationDays > 0 ? Date.now() + durationDays * 86400000 : null

    try {
      const auth = await adminSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)
      const targetUid = (await lookupUidByEmail(auth.idToken, targetInput)) || targetInput
      const doc = await readAdminDoc(auth.localId, auth.idToken)
      const existingFields = doc.fields?.premiumUsers?.mapValue?.fields || {}
      const newFields = buildGrantFields(existingFields, targetUid, plan, expiresAt)
      const status = await writeAdminDoc(auth.localId, auth.idToken, { premiumUsers: { mapValue: { fields: newFields } } })

      if (status === 200) {
        const expiryText = expiresAt
          ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : '∞ Lifetime'
        await tgSend(BOT_TOKEN, chatId,
          `✅ *Premium Activated!*\n\n` +
          `👤 UID: \`${targetUid}\`${targetInput !== targetUid ? ` (${targetInput})` : ''}\n` +
          `📦 Plan: *${plan.charAt(0).toUpperCase() + plan.slice(1)} VIP*\n` +
          `⏱ Expires: *${expiryText}*\n\n` +
          `User gets the premium player on their next page load.`
        )
      } else {
        await tgSend(BOT_TOKEN, chatId, `❌ Firestore write failed (status ${status}).`)
      }
    } catch (err) {
      await tgSend(BOT_TOKEN, chatId, `❌ Error: ${err.message}`)
    }
    return res.status(200).send('ok')
  }

  // ── Add Credits ────────────────────────────────────────────────────────────
  if (cmd === '/addcredit' || cmd === '/addcredits' || cmd === '/credit') {
    const targetInput = parts[1]
    const amountArg = parseInt(parts[2] || '1', 10)
    const amount = Number.isFinite(amountArg) && amountArg > 0 ? amountArg : 1

    if (!targetInput) {
      await tgSend(BOT_TOKEN, chatId, '❌ Usage: `/addcredit <uid|email> [amount]`\nExample: `/addcredit heshan@example.com 5`')
      return res.status(200).send('ok')
    }

    try {
      const auth = await adminSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)
      const targetUid = (await lookupUidByEmail(auth.idToken, targetInput)) || targetInput

      const doc = await readAdminDoc(auth.localId, auth.idToken)
      const existingFields = doc.fields?.premiumUsers?.mapValue?.fields || {}
      const current = existingFields[targetUid]?.mapValue?.fields || {}
      const currentCredits = Number(current.credits?.integerValue || 0)
      const newCredits = currentCredits + amount

      const newFields = buildCreditFields(existingFields, targetUid, newCredits)
      const status = await writeAdminDoc(auth.localId, auth.idToken, { premiumUsers: { mapValue: { fields: newFields } } })

      if (status === 200) {
        await tgSend(BOT_TOKEN, chatId,
          `🎟️ *Credits Added Successfully!*\n\n` +
          `👤 User: \`${targetUid}\`${targetInput !== targetUid ? ` (${targetInput})` : ''}\n` +
          `➕ Added: *+${amount} credit(s)*\n` +
          `💰 Total Balance: *${newCredits} credit(s)*\n\n` +
          `User can now watch ${newCredits} movie(s) as Premium VIP!`
        )
      } else {
        await tgSend(BOT_TOKEN, chatId, `❌ Firestore write failed (status ${status}).`)
      }
    } catch (err) {
      await tgSend(BOT_TOKEN, chatId, `❌ Error: ${err.message}`)
    }
    return res.status(200).send('ok')
  }

  // ── Set Credits ────────────────────────────────────────────────────────────
  if (cmd === '/setcredit' || cmd === '/setcredits') {
    const targetInput = parts[1]
    const amountArg = parseInt(parts[2], 10)

    if (!targetInput || !Number.isFinite(amountArg) || amountArg < 0) {
      await tgSend(BOT_TOKEN, chatId, '❌ Usage: `/setcredit <uid|email> <amount>`\nExample: `/setcredit user 3`')
      return res.status(200).send('ok')
    }

    try {
      const auth = await adminSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)
      const targetUid = (await lookupUidByEmail(auth.idToken, targetInput)) || targetInput

      const doc = await readAdminDoc(auth.localId, auth.idToken)
      const existingFields = doc.fields?.premiumUsers?.mapValue?.fields || {}
      const newFields = buildCreditFields(existingFields, targetUid, amountArg)
      const status = await writeAdminDoc(auth.localId, auth.idToken, { premiumUsers: { mapValue: { fields: newFields } } })

      if (status === 200) {
        await tgSend(BOT_TOKEN, chatId,
          `🎟️ *Credit Balance Updated!*\n\n` +
          `👤 User: \`${targetUid}\`${targetInput !== targetUid ? ` (${targetInput})` : ''}\n` +
          `💰 New Balance: *${amountArg} credit(s)*`
        )
      } else {
        await tgSend(BOT_TOKEN, chatId, `❌ Firestore write failed (status ${status}).`)
      }
    } catch (err) {
      await tgSend(BOT_TOKEN, chatId, `❌ Error: ${err.message}`)
    }
    return res.status(200).send('ok')
  }

  // ── Revoke premium ─────────────────────────────────────────────────────────
  if (cmd === '/revoke' || cmd === '/remove') {
    const targetInput = parts[1]
    if (!targetInput) {
      await tgSend(BOT_TOKEN, chatId, '❌ Usage: `/revoke <uid|email>`')
      return res.status(200).send('ok')
    }
    try {
      const auth = await adminSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)
      const targetUid = (await lookupUidByEmail(auth.idToken, targetInput)) || targetInput
      const doc = await readAdminDoc(auth.localId, auth.idToken)
      const existingFields = doc.fields?.premiumUsers?.mapValue?.fields || {}

      if (!existingFields[targetUid]) {
        await tgSend(BOT_TOKEN, chatId, `ℹ️ UID \`${targetUid}\` has no premium grant on record.`)
        return res.status(200).send('ok')
      }

      const newFields = buildRevokeFields(existingFields, targetUid)
      const status = await writeAdminDoc(auth.localId, auth.idToken, { premiumUsers: { mapValue: { fields: newFields } } })

      if (status === 200) {
        await tgSend(BOT_TOKEN, chatId, `🚫 *Premium Revoked*\n\nUID: \`${targetUid}\` has been deactivated.`)
      } else {
        await tgSend(BOT_TOKEN, chatId, `❌ Firestore write failed (status ${status}).`)
      }
    } catch (err) {
      await tgSend(BOT_TOKEN, chatId, `❌ Error: ${err.message}`)
    }
    return res.status(200).send('ok')
  }

  // ── Check status ───────────────────────────────────────────────────────────
  if (cmd === '/check' || cmd === '/status' || cmd === '/credits') {
    const targetInput = parts[1]
    if (!targetInput) {
      await tgSend(BOT_TOKEN, chatId, '❌ Usage: `/check <uid|email>`')
      return res.status(200).send('ok')
    }
    try {
      const auth = await adminSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)
      const targetUid = (await lookupUidByEmail(auth.idToken, targetInput)) || targetInput
      const doc = await readAdminDoc(auth.localId, auth.idToken)
      const premiumUsers = doc.fields?.premiumUsers?.mapValue?.fields || {}
      const grant = premiumUsers[targetUid]?.mapValue?.fields
      const credits = Number(grant?.credits?.integerValue || 0)
      const isSubActive = grant?.active?.booleanValue === true

      const expiresAt = grant?.expiresAt?.integerValue ? Number(grant.expiresAt.integerValue) : null
      const expired = expiresAt && Date.now() > expiresAt
      const expiryText = expiresAt
        ? new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '∞ Lifetime'

      let msg = `👤 *User:* \`${targetUid}\`${targetInput !== targetUid ? ` (${targetInput})` : ''}\n\n`
      if (isSubActive && !expired) {
        msg += `👑 *VIP Subscription:* Active\n📦 *Plan:* ${grant?.plan?.stringValue || 'monthly'}\n⏱ *Expires:* ${expiryText}\n`
      } else if (expired) {
        msg += `⚠️ *VIP Subscription:* Expired (${expiryText})\n`
      } else {
        msg += `⚪ *VIP Subscription:* Inactive\n`
      }
      msg += `🎟️ *Premium Credits:* *${credits} credit(s)*`

      await tgSend(BOT_TOKEN, chatId, msg)
    } catch (err) {
      await tgSend(BOT_TOKEN, chatId, `❌ Error: ${err.message}`)
    }
    return res.status(200).send('ok')
  }

  // ── Shorthand: raw UID pasted ──────────────────────────────────────────────
  if (/^[a-zA-Z0-9_-]{15,}$/.test(text) && !text.startsWith('/')) {
    const targetUid = text
    const plan = 'monthly'
    const expiresAt = Date.now() + 30 * 86400000

    try {
      const auth = await adminSignIn(ADMIN_EMAIL, ADMIN_PASSWORD)
      const doc = await readAdminDoc(auth.localId, auth.idToken)
      const existingFields = doc.fields?.premiumUsers?.mapValue?.fields || {}
      const newFields = buildGrantFields(existingFields, targetUid, plan, expiresAt)
      const status = await writeAdminDoc(auth.localId, auth.idToken, { premiumUsers: { mapValue: { fields: newFields } } })

      if (status === 200) {
        await tgSend(BOT_TOKEN, chatId,
          `✅ *Monthly Premium Activated!*\n\nUID: \`${targetUid}\`\nExpires: *${new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}*`
        )
      } else {
        await tgSend(BOT_TOKEN, chatId, `❌ Firestore write failed (status ${status}).`)
      }
    } catch (err) {
      await tgSend(BOT_TOKEN, chatId, `❌ Error: ${err.message}`)
    }
    return res.status(200).send('ok')
  }

  // ── Unknown command ────────────────────────────────────────────────────────
  await tgSend(BOT_TOKEN, chatId, `❓ Unknown command.\n\n${HELP_TEXT}`)
  return res.status(200).send('ok')
}

