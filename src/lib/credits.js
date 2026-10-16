// ── Max Cinema Pay-per-View Credits System ──────────────────────────────────
// Allows users to watch a movie or episode in VIP Premium (Ad-Free HD) using 1 credit.
// Every new user receives 1 complimentary welcome credit!

const CREDITS_STORAGE_KEY = 'cs_credits_'
const UNLOCKED_TITLES_KEY = 'cs_credit_unlocked_titles'
const DEFAULT_WELCOME_CREDITS = 1

function getStorageKey(uid) {
  return `${CREDITS_STORAGE_KEY}${uid || 'guest'}`
}

export function getCredits(uid) {
  if (typeof window === 'undefined') return DEFAULT_WELCOME_CREDITS
  try {
    const raw = localStorage.getItem(getStorageKey(uid))
    if (raw === null) {
      // First time user: initialize with welcome credit
      localStorage.setItem(getStorageKey(uid), String(DEFAULT_WELCOME_CREDITS))
      return DEFAULT_WELCOME_CREDITS
    }
    const parsed = parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return DEFAULT_WELCOME_CREDITS
  }
}

export function setCredits(uid, amount) {
  if (typeof window === 'undefined') return
  const safeAmount = Math.max(0, parseInt(amount, 10) || 0)
  try {
    localStorage.setItem(getStorageKey(uid), String(safeAmount))
    window.dispatchEvent(
      new CustomEvent('Max Cinema:creditschange', {
        detail: { uid, credits: safeAmount },
      })
    )
  } catch {}
}

export function syncCreditsFromServer(uid, serverCredits) {
  if (!uid || typeof serverCredits !== 'number') return
  const current = getCredits(uid)
  // If server has more credits (e.g. added via Telegram bot), update local balance
  if (serverCredits > current || (serverCredits === 0 && current === 0)) {
    setCredits(uid, serverCredits)
  }
}

export function getUnlockedTitles() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(UNLOCKED_TITLES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isTitleUnlockedWithCredit(tmdbId) {
  if (!tmdbId) return false
  const list = getUnlockedTitles()
  const idStr = String(tmdbId)
  return list.some(item => String(item.tmdbId) === idStr)
}

export async function useCreditForTitle(uid, { tmdbId, mediaType = 'movie', title = '' }) {
  if (!tmdbId) throw new Error('A movie or TV ID is required.')

  // 1. If already unlocked in this browser, don't charge again
  if (isTitleUnlockedWithCredit(tmdbId)) {
    return { ok: true, alreadyUnlocked: true, credits: getCredits(uid) }
  }

  // 2. Check local credit balance
  const current = getCredits(uid)
  if (current <= 0) {
    throw new Error('You do not have enough credits. Please contact admin or upgrade to VIP!')
  }

  // 3. Attempt server deduction
  let newBalance = current - 1
  try {
    const res = await fetch('/api/use-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid || 'guest', tmdbId, mediaType, title }),
    })
    if (res.ok) {
      const data = await res.json()
      if (typeof data.credits === 'number') {
        newBalance = data.credits
      }
    }
  } catch (err) {
    console.warn('[credits] Server sync error, applying local deduction:', err)
  }

  // 4. Update local storage and record unlock
  setCredits(uid, newBalance)

  try {
    const list = getUnlockedTitles()
    list.push({
      tmdbId: String(tmdbId),
      mediaType,
      title,
      unlockedAt: Date.now(),
    })
    localStorage.setItem(UNLOCKED_TITLES_KEY, JSON.stringify(list.slice(-100)))
  } catch {}

  window.dispatchEvent(
    new CustomEvent('Max Cinema:titleunlocked', {
      detail: { tmdbId, mediaType, title, remainingCredits: newBalance },
    })
  )

  return { ok: true, consumed: 1, credits: newBalance }
}
