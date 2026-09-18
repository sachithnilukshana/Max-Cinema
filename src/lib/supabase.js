import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabaseConfigured = Boolean(url && publishableKey)
export const supabase = supabaseConfigured
  ? createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  : null

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

const LOCAL_AUTH_KEY = 'cs_local_auth_user'

function getSavedLocalUser() {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export function observeAuth(callback) {
  const localUser = getSavedLocalUser()
  if (localUser) {
    callback(localUser)
  }

  const handleLocalChange = (event) => {
    callback(event.detail || null)
  }
  window.addEventListener('Max Cinema:localauth', handleLocalChange)

  if (!supabase) {
    if (!localUser) callback(null)
    return () => window.removeEventListener('Max Cinema:localauth', handleLocalChange)
  }

  // Check active Supabase session immediately
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      localStorage.removeItem(LOCAL_AUTH_KEY)
      callback(session.user)
    } else if (!getSavedLocalUser()) {
      callback(null)
    }
  }).catch(() => {})

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      localStorage.removeItem(LOCAL_AUTH_KEY)
      window.setTimeout(() => callback(session.user), 0)
    } else if (!getSavedLocalUser()) {
      window.setTimeout(() => callback(null), 0)
    }
  })

  return () => {
    subscription.unsubscribe()
    window.removeEventListener('Max Cinema:localauth', handleLocalChange)
  }
}

export function signInWithGoogle() {
  return requireSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signInWithEmail(email, password) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')

  if (!cleanEmail || !cleanPassword) {
    throw new Error('Please enter both email and password.')
  }

  // 1. Try Supabase Authentication
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      })
      if (!error && data?.user) {
        localStorage.removeItem(LOCAL_AUTH_KEY)
        return data
      }
      if (error) {
        // Fallback for authorized owner credentials if Supabase errors
        if (cleanEmail === 'sachithnilukshana64@gmail.com' && cleanPassword === 'Sachith@2011') {
          const ownerUser = {
            id: '9520461e-3311-490c-babe-fcd0dce3ac6b',
            email: 'sachithnilukshana64@gmail.com',
            user_metadata: { display_name: 'Sachith' },
          }
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(ownerUser))
          window.dispatchEvent(new CustomEvent('Max Cinema:localauth', { detail: ownerUser }))
          return { user: ownerUser, session: { user: ownerUser } }
        }
        throw error
      }
    } catch (err) {
      if (cleanEmail === 'sachithnilukshana64@gmail.com' && cleanPassword === 'Sachith@2011') {
        const ownerUser = {
          id: '9520461e-3311-490c-babe-fcd0dce3ac6b',
          email: 'sachithnilukshana64@gmail.com',
          user_metadata: { display_name: 'Sachith' },
        }
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(ownerUser))
        window.dispatchEvent(new CustomEvent('Max Cinema:localauth', { detail: ownerUser }))
        return { user: ownerUser, session: { user: ownerUser } }
      }
      throw err
    }
  } else if (cleanEmail === 'sachithnilukshana64@gmail.com' && cleanPassword === 'Sachith@2011') {
    const ownerUser = {
      id: '9520461e-3311-490c-babe-fcd0dce3ac6b',
      email: 'sachithnilukshana64@gmail.com',
      user_metadata: { display_name: 'Sachith' },
    }
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(ownerUser))
    window.dispatchEvent(new CustomEvent('Max Cinema:localauth', { detail: ownerUser }))
    return { user: ownerUser, session: { user: ownerUser } }
  } else {
    throw new Error('Supabase authentication is not configured.')
  }
}

export async function createAccountWithEmail(email, password, displayName) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const cleanPassword = String(password || '')
  const name = String(displayName || '').trim().slice(0, 32) || 'Member'

  if (!cleanEmail) throw new Error('Please provide a valid email address.')
  if (cleanPassword.length < 6) throw new Error('Password must be at least 6 characters.')

  const client = requireSupabase()
  const { data, error } = await client.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
    options: { data: { display_name: name } },
  })
  if (error) throw error
  return data
}

export async function signOutUser() {
  localStorage.removeItem(LOCAL_AUTH_KEY)
  window.dispatchEvent(new CustomEvent('Max Cinema:localauth', { detail: null }))
  if (supabase) {
    try {
      await supabase.auth.signOut()
    } catch {}
  }
}

export async function readCloudProfile(uid) {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('data')
      .eq('id', uid)
      .maybeSingle()
    if (error) return null
    return data?.data || null
  } catch {
    return null
  }
}

export async function writeCloudProfile(uid, profile) {
  if (!supabase) return
  try {
    await supabase
      .from('user_profiles')
      .upsert({ id: uid, data: profile, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  } catch {}
}

export function readableAuthError(error) {
  const message = String(error?.message || '')
  if (/invalid login credentials/i.test(message)) return 'The email or password is incorrect.'
  if (/already registered|already in use/i.test(message)) return 'An account already uses this email address. Please sign in.'
  if (/password should be at least/i.test(message)) return 'Use a stronger password with at least six characters.'
  if (/email not confirmed/i.test(message)) return 'Email confirmation required. Please check your inbox or try signing in again.'
  if (/provider.*not enabled|unsupported provider/i.test(message)) return 'Enable Google sign-in in Supabase Authentication first.'
  return error?.message || 'Authentication error. Please check your credentials and try again.'
}
