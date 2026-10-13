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
export const db = getDatabase(app)

const LOCAL_USER_KEY = 'cs_firebase_user'

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

  const cred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword)
  const user = {
    uid: cred.user.uid,
    id: cred.user.uid,
    email: cred.user.email,
    displayName: cred.user.displayName || cred.user.email?.split('@')[0] || 'Member',
  }
  saveLocalUser(user)
  return user
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

// ── Premium / Ad-Free Status ────────────────────────────────────────────────

/**
 * Read premium status once for a user from Firebase RTDB.
 * Path: /users/{uid}/premium → { active: boolean, plan: string, expiresAt: number|null }
 */
export async function getPremiumStatus(uid) {
  if (!uid) return { active: false }
  try {
    const snap = await get(ref(db, `users/${uid}/premium`))
    if (!snap.exists()) return { active: false }
    const data = snap.val()
    // Respect expiry if set
    if (data.expiresAt && Date.now() > data.expiresAt) return { active: false, expired: true }
    return { active: Boolean(data.active), plan: data.plan || 'monthly', expiresAt: data.expiresAt || null }
  } catch {
    return { active: false }
  }
}

/**
 * Subscribe to live premium status changes for a user.
 * Returns an unsubscribe function.
 */
export function observePremiumStatus(uid, callback) {
  if (!uid) { callback({ active: false }); return () => {} }
  const premRef = ref(db, `users/${uid}/premium`)
  const unsub = onValue(premRef, snap => {
    if (!snap.exists()) { callback({ active: false }); return }
    const data = snap.val()
    if (data.expiresAt && Date.now() > data.expiresAt) { callback({ active: false, expired: true }); return }
    callback({ active: Boolean(data.active), plan: data.plan || 'monthly', expiresAt: data.expiresAt || null })
  }, () => callback({ active: false }))
  return unsub
}

/**
 * Admin-only: grant premium to a user. Call this from the Firebase console
 * or a trusted server — do NOT expose this to regular clients.
 * Path: /users/{uid}/premium → { active: true, plan: 'monthly'|'yearly', expiresAt: unixMs|null }
 */
export async function grantPremium(uid, plan = 'monthly', durationDays = 30) {
  if (!uid) throw new Error('uid required')
  const expiresAt = durationDays ? Date.now() + durationDays * 24 * 60 * 60 * 1000 : null
  await set(ref(db, `users/${uid}/premium`), { active: true, plan, expiresAt, grantedAt: Date.now() })
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
