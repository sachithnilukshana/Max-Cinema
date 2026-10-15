// ── Max Cinema Content Report API ─────────────────────────────────────────────
// POST /api/report
// Body: { title, tmdbId, mediaType, reason, details, userAgent }
// Sends a Telegram notification to the admin chat.

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' })

  const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '8882793489:AAGs43RKRxS0qO3T_h-bpzprevpOLnLMh1E'
  const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '8963612786'

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' })
  }

  const {
    title = 'Unknown',
    tmdbId = '',
    mediaType = '',
    reason = 'Not specified',
    details = '',
    userAgent = '',
  } = body || {}

  const lines = [
    '⚠️ *Content Report*',
    '',
    `🎬 *Title:* ${title}`,
    tmdbId ? `🆔 *ID:* \`${tmdbId}\`` : null,
    mediaType ? `📂 *Type:* ${mediaType}` : null,
    `🔖 *Reason:* ${reason}`,
    details ? `📝 *Details:* ${details}` : null,
    userAgent ? `🖥 *UA:* ${userAgent.slice(0, 120)}` : null,
    '',
    `🕐 *Time:* ${new Date().toUTCString()}`,
  ].filter(l => l !== null)

  const message = lines.join('\n')

  if (BOT_TOKEN && ADMIN_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      })
    } catch (err) {
      // Fail silently — we still return ok to the client
      console.error('[report] Telegram send failed:', err)
    }
  } else {
    // Log to console in local/dev environments
    console.info('[report] (no Telegram config) Report received:\n', message)
  }

  return res.status(200).json({ ok: true })
}
