// ── Referral System Library ─────────────────────────────────────────────────
// Handles referral code generation, links, stats, and recording.

const BASE_URL = 'https://max-cinema.vercel.app'
const DAYS_PER_REFERRAL = 7

/**
 * Simple djb2 hash — produces a stable integer from a string.
 * @param {string} str
 * @returns {number}
 */
function djb2Hash(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0 // keep unsigned 32-bit
  }
  return hash
}

/**
 * Generate a stable 8-character alphanumeric referral code from a uid.
 * @param {string} uid
 * @returns {string}
 */
export function generateReferralCode(uid) {
  if (!uid) return ''
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const hash1 = djb2Hash(uid)
  const hash2 = djb2Hash(uid.split('').reverse().join('') + 'mc')
  const combined = String(hash1) + String(hash2)

  let code = ''
  for (let i = 0; i < 8; i++) {
    const idx = parseInt(combined.slice(i * 2, i * 2 + 2) || '0') % CHARS.length
    code += CHARS[idx]
  }
  return code
}

/**
 * Returns the full referral link for a user.
 * @param {string} uid
 * @returns {string}
 */
export function getReferralLink(uid) {
  const code = generateReferralCode(uid)
  return `${BASE_URL}/?ref=${code}`
}

/**
 * Read referral stats from localStorage.
 * @param {string} uid
 * @returns {{ code: string, referralCount: number, earnedDays: number }}
 */
export function getReferralStats(uid) {
  if (!uid) return { code: '', referralCount: 0, earnedDays: 0 }
  try {
    const raw = localStorage.getItem(`cs_referrals_${uid}`)
    const data = raw ? JSON.parse(raw) : {}
    const code = generateReferralCode(uid)
    const referralCount = Number(data.referralCount || 0)
    return {
      code,
      referralCount,
      earnedDays: getReferralReward(referralCount),
    }
  } catch {
    return { code: generateReferralCode(uid), referralCount: 0, earnedDays: 0 }
  }
}

/**
 * Save updated referral stats for a user in localStorage.
 * @param {string} uid
 * @param {{ referralCount: number }} data
 */
export function saveReferralStats(uid, data) {
  if (!uid) return
  try {
    const existing = getReferralStats(uid)
    localStorage.setItem(
      `cs_referrals_${uid}`,
      JSON.stringify({ ...existing, ...data })
    )
    window.dispatchEvent(
      new CustomEvent('Max Cinema:referralupdate', { detail: { uid, ...data } })
    )
  } catch {}
}

/**
 * Called when a new user signs up with ?ref=code.
 * Sends the referral to the API endpoint.
 * @param {string} refCode - The referral code from URL
 * @param {string} newUserUid
 * @param {string} newUserEmail
 * @returns {Promise<{ ok: boolean, bonusDays: number }>}
 */
export async function recordReferral(refCode, newUserUid, newUserEmail) {
  if (!refCode || !newUserUid) return { ok: false, bonusDays: 0 }
  try {
    const res = await fetch('/api/record-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refCode, newUserUid, newUserEmail }),
    })
    if (!res.ok) return { ok: false, bonusDays: 0 }
    return await res.json()
  } catch {
    return { ok: false, bonusDays: 0 }
  }
}

/**
 * Returns the number of free VIP days earned for a given referral count.
 * @param {number} count
 * @returns {number}
 */
export function getReferralReward(count) {
  return Math.max(0, Math.floor(count)) * DAYS_PER_REFERRAL
}

/**
 * Reads ?ref= from the current URL and returns the code if present.
 * @returns {string|null}
 */
export function getRefCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get('ref') || null
  } catch {
    return null
  }
}
