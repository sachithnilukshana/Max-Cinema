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

export function observeAuth(callback) {
  if (!supabase) {
    callback(null)
    return () => {}
  }
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => callback(session?.user || null), 0)
  })
  return () => subscription.unsubscribe()
}

export function signInWithGoogle() {
  return requireSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signInWithEmail(email, password) {
  const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

export async function createAccountWithEmail(email, password, displayName) {
  const { error } = await requireSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: { data: { display_name: displayName.trim().slice(0, 32) } },
  })
  if (error) throw error
}

export async function signOutUser() {
  const { error } = await requireSupabase().auth.signOut()
  if (error) throw error
}

export async function readCloudProfile(uid) {
  const { data, error } = await requireSupabase()
    .from('user_profiles')
    .select('data')
    .eq('id', uid)
    .maybeSingle()
  if (error) throw error
  return data?.data || null
}

export async function writeCloudProfile(uid, profile) {
  const { error } = await requireSupabase()
    .from('user_profiles')
    .upsert({ id: uid, data: profile, updated_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) throw error
}

export function readableAuthError(error) {
  const message = String(error?.message || '')
  if (/invalid login credentials/i.test(message)) return 'The email or password is incorrect.'
  if (/already registered/i.test(message)) return 'An account already uses this email address.'
  if (/password should be at least/i.test(message)) return 'Use a stronger password with at least six characters.'
  if (/email not confirmed/i.test(message)) return 'Confirm your email address, then sign in.'
  if (/provider.*not enabled|unsupported provider/i.test(message)) return 'Enable Google sign-in in Supabase Authentication first.'
  return 'We could not sign you in right now. Please try again.'
}
