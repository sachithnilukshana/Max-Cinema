export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { refCode, newUserUid, newUserEmail } = req.body || {}
    if (!refCode || !newUserUid) {
      return res.status(400).json({ error: 'Missing refCode or newUserUid' })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN || '8882793489:AAGs43RKRxS0qO3T_h-bpzprevpOLnLMh1E'
    const adminChatId = process.env.ADMIN_CHAT_ID || '8963612786'

    // Notify Telegram Admin about the new referral
    try {
      const msg = `👥 *New User Referral!*\n\n🔗 *Ref Code:* \`${refCode}\`\n👤 *New User UID:* \`${newUserUid}\`\n📧 *Email:* ${newUserEmail || 'N/A'}\n🎁 *Reward:* +7 Days VIP added`
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: msg,
          parse_mode: 'Markdown',
        }),
      })
    } catch (err) {
      console.warn('Telegram notification for referral failed:', err)
    }

    return res.status(200).json({ ok: true, bonusDays: 7 })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

