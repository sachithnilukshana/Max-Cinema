import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { getDatabase, ref, get, set, onValue } from 'firebase/database'

export const firebaseConfig = {
  apiKey: "AIzaSyDKEaciYyTJM4j8B6QOq4nTB9Y6lhIeWBg",
  authDomain: "login-6a0e1.firebaseapp.com",
  databaseURL: "https://login-6a0e1-default-rtdb.firebaseio.com",
  projectId: "login-6a0e1",
  storageBucket: "login-6a0e1.firebasestorage.app",
  messagingSenderId: "808747038107",
  appId: "1:808747038107:web:358729c6155fc06637dd3e",
  measurementId: "G-4LH6R6DVC0",
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)

let rtdbInstance = null
try {
  rtdbInstance = getDatabase(app)
} catch (e) {
  console.warn('Firebase RTDB initialized in fallback mode:', e)
}
export const db = rtdbInstance

const LOCAL_USER_KEY = 'cs_firebase_user'
const LOCAL_PREMIUM_RECORDS_KEY = 'cs_premium_records'

function getSavedLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveLocalUser(user) {
  try {
    if (user) localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(LOCAL_USER_KEY)
  } catch {}
}

export function observeAuth(callback) {
  const saved = getSavedLocalUser()
  if (saved) {
    callback(saved)
  }

  const unsubscribe = onAuthStateChanged(auth, user => {
    if (user) {
      const normalizedUser = {
        uid: user.uid,
        id: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Member',
      }
      saveLocalUser(normalizedUser)
      callback(normalizedUser)
    } else if (!getSavedLocalUser()) {
      callback(null)
    }
  })

  return () => {
    unsubscribe()
  }
}

export async function signInWithEmail(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Please enter both email and password.')
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword)
    const user = {
      uid: cred.user.uid,
      id: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Member',
    }
    saveLocalUser(user)
    return user
  } catch (error) {
    // Admin fallback — handles offline/network issues with the known admin credentials
    const isAdminEmail = cleanEmail === 'sachithnilukshana64@gmail.com'
    const isAdminPw = cleanPassword === 'Sachith@2011' || cleanPassword === 'Sachith@2011.02.12'
    if (isAdminEmail && isAdminPw) {
      const adminUser = {
        uid: 's5q2j8XcSqWzwtk1nKVP0Ap09bs1',
        id: 's5q2j8XcSqWzwtk1nKVP0Ap09bs1',
        email: 'sachithnilukshana64@gmail.com',
        displayName: 'Sachith',
      }
      saveLocalUser(adminUser)
      window.dispatchEvent(new CustomEvent('Max Cinema:authchanged', { detail: adminUser }))
      return adminUser
    }
    throw error
  }
}

export async function createAccountWithEmail(email, password, displayName) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')
  const name = String(displayName || '').trim().slice(0, 32) || cleanEmail.split('@')[0] || 'Member'

  if (!cleanEmail) throw new Error('Please enter a valid email address.')
  if (cleanPassword.length < 6) throw new Error('Password must be at least 6 characters.')

  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword)
  if (cred.user) {
    await updateProfile(cred.user, { displayName: name }).catch(() => {})
    const user = {
      uid: cred.user.uid,
      id: cred.user.uid,
      email: cred.user.email,
      displayName: name,
    }
    saveLocalUser(user)
    return user
  }
  return cred.user
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const cred = await signInWithPopup(auth, provider)
  const user = {
    uid: cred.user.uid,
    id: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName || 'Member',
  }
  saveLocalUser(user)
  return user
}

export async function resetPassword(email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) throw new Error('Please provide an email address.')
  await sendPasswordResetEmail(auth, cleanEmail)
}

export async function signOutUser() {
  saveLocalUser(null)
  try {
    await signOut(auth)
  } catch {}
}

// ── Premium / Ad-Free Status Storage ────────────────────────────────────────

function getLocalPremiumRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_PREMIUM_RECORDS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveLocalPremiumRecord(uid, record) {
  try {
    const all = getLocalPremiumRecords()
    if (record) all[uid] = record
    else delete all[uid]
    localStorage.setItem(LOCAL_PREMIUM_RECORDS_KEY, JSON.stringify(all))
    window.dispatchEvent(new CustomEvent('Max Cinema:premiumchange', { detail: { uid, record } }))
  } catch {}
}

/**
 * Read premium status once for a user.
 */
export async function getPremiumStatus(uid) {
  if (!uid) return { active: false }

  // Check local store first
  const local = getLocalPremiumRecords()[uid]
  if (local?.active) {
    if (local.expiresAt && Date.now() > local.expiresAt) {
      return { active: false, expired: true }
    }
    return { active: true, plan: local.plan || 'monthly', expiresAt: local.expiresAt || null }
  }

  if (!db) return { active: false }
  try {
    const snap = await get(ref(db, `users/${uid}/premium`))
    if (!snap.exists()) return { active: false }
    const data = snap.val()
    if (data.expiresAt && Date.now() > data.expiresAt) return { active: false, expired: true }
    return { active: Boolean(data.active), plan: data.plan || 'monthly', expiresAt: data.expiresAt || null }
  } catch {
    return { active: false }
  }
}

/**
 * Live subscriber for premium status changes.
 * Checks: localStorage → /api/check-premium (Telegram grants) → Firebase RTDB
 */
export function observePremiumStatus(uid, callback) {
  if (!uid) {
    callback({ active: false })
    return () => {}
  }

  // 1. Fire immediately from local store
  const local = getLocalPremiumRecords()[uid]
  if (local?.active && (!local.expiresAt || Date.now() <= local.expiresAt)) {
    callback({ active: true, plan: local.plan || 'monthly', expiresAt: local.expiresAt || null })
  } else {
    callback({ active: false })
  }

  // 2. Listen to custom window events for local changes
  const onLocalChange = e => {
    if (e.detail?.uid === uid) {
      const rec = e.detail.record
      if (rec?.active && (!rec.expiresAt || Date.now() <= rec.expiresAt)) {
        callback({ active: true, plan: rec.plan || 'monthly', expiresAt: rec.expiresAt || null })
      } else {
        callback({ active: false })
      }
    }
  }
  window.addEventListener('Max Cinema:premiumchange', onLocalChange)

  // 3. Check server-side status (captures Telegram bot grants and credits)
  fetch(`/api/check-premium?uid=${encodeURIComponent(uid)}`)
    .then(r => r.json())
    .then(status => {
      if (status.active) {
        saveLocalPremiumRecord(uid, {
          active: true,
          plan: status.plan || 'monthly',
          expiresAt: status.expiresAt || null,
        })
      }
      callback({
        active: Boolean(status.active),
        plan: status.plan || 'monthly',
        expiresAt: status.expiresAt || null,
        credits: typeof status.credits === 'number' ? status.credits : undefined,
      })
    })
    .catch(() => {}) // Fail silently — localStorage is the fallback

  // 4. Listen to Firebase RTDB if available
  let unsubRtdb = () => {}
  if (db) {
    try {
      const premRef = ref(db, `users/${uid}/premium`)
      unsubRtdb = onValue(premRef, snap => {
        if (!snap.exists()) return
        const data = snap.val()
        if (data.expiresAt && Date.now() > data.expiresAt) {
          callback({ active: false, expired: true })
          return
        }
        callback({ active: Boolean(data.active), plan: data.plan || 'monthly', expiresAt: data.expiresAt || null })
        saveLocalPremiumRecord(uid, { active: true, plan: data.plan, expiresAt: data.expiresAt })
      }, () => {})
    } catch {}
  }

  return () => {
    window.removeEventListener('Max Cinema:premiumchange', onLocalChange)
    try { unsubRtdb() } catch {}
  }
}

/**
 * Grant premium to ANY user by user ID.
 * Works both for users activating their own subscription and for admin activating other users!
 */
export async function grantPremium(uid, plan = 'monthly', durationDays = 30) {
  const cleanUid = String(uid || '').trim()
  if (!cleanUid) throw new Error('A valid User ID is required.')

  const expiresAt = durationDays ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : null
  const record = { active: true, plan, expiresAt, grantedAt: Date.now() }

  // Always save locally
  saveLocalPremiumRecord(cleanUid, record)

  // Also sync to Firebase RTDB if available
  if (db) {
    try {
      await set(ref(db, `users/${cleanUid}/premium`), record)
    } catch (err) {
      console.warn('Realtime Database set warning (saved locally):', err)
    }
  }

  return record
}

export function readableAuthError(error) {
  const code = error?.code || ''
  const message = String(error?.message || '')

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password. Please check your credentials.'
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account already exists with this email address. Please sign in.'
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.'
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.'
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign in was cancelled.'
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return message.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '') || 'Authentication error. Please try again.'
}
