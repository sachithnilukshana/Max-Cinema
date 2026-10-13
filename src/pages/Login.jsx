import React, { useState } from 'react'
import {
  signInWithEmail,
  createAccountWithEmail,
  signInWithGoogle,
  resetPassword,
  signOutUser,
  readableAuthError,
  grantPremium,
} from '../lib/firebase.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import styles from './Login.module.css'

export default function Login({ user, onBack, onBrowseMovies, onBrowseHistory }) {
  const { isPremium, plan: currentPlan } = usePremium()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Payment / Premium upgrade state
  const [selectedPlan, setSelectedPlan] = useState('yearly') // 'monthly' | 'yearly' | 'lifetime'
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  // Admin User ID Premium Activation state
  const [adminTargetUid, setAdminTargetUid] = useState('')
  const [adminTargetPlan, setAdminTargetPlan] = useState('lifetime')
  const [adminActivating, setAdminActivating] = useState(false)
  const [adminSuccess, setAdminSuccess] = useState('')
  const [adminError, setAdminError] = useState('')

  const isAdmin = user?.email?.toLowerCase() === 'sachithnilukshana64@gmail.com' || user?.uid?.startsWith('s5q2j8XcSqWz')

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setSuccess('')
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.')
      return
    }

    setLoading(true)
    try {
      await signInWithEmail(email, password)
      setSuccess('Successfully signed in!')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim()) {
      setError('Please provide a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.')
      return
    }

    setLoading(true)
    try {
      await createAccountWithEmail(email, password, displayName)
      setSuccess('Account created successfully! Welcome to Max Cinema.')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim()) {
      setError('Please enter your email address to receive a reset link.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(email)
      setSuccess('Password reset link sent! Please check your inbox.')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await signInWithGoogle()
      setSuccess('Successfully signed in with Google!')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      await signOutUser()
      setSuccess('You have been signed out.')
      setMode('signin')
    } catch (err) {
      setError(readableAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleActivatePremium(e) {
    e?.preventDefault?.()
    if (!user?.uid) {
      setError('Please sign in or create an account first to enable Ad-Free.')
      return
    }

    setPaymentProcessing(true)
    setError('')
    try {
      const days = selectedPlan === 'monthly' ? 30 : selectedPlan === 'yearly' ? 365 : 3650
      await grantPremium(user.uid, selectedPlan, days)
      setSuccess('🎉 Payment successful! Ad-Free Premium is now active on your account.')
      setPayModalOpen(false)
    } catch (err) {
      setError('Payment processing encountered an issue: ' + (err.message || 'Please try again.'))
    } finally {
      setPaymentProcessing(false)
    }
  }

  async function handleAdminActivateUser(e) {
    e.preventDefault()
    setAdminError('')
    setAdminSuccess('')
    const target = adminTargetUid.trim()
    if (!target) {
      setAdminError('Please enter a target User ID.')
      return
    }

    setAdminActivating(true)
    try {
      const days = adminTargetPlan === 'monthly' ? 30 : adminTargetPlan === 'yearly' ? 365 : 3650
      await grantPremium(target, adminTargetPlan, days)
      setAdminSuccess(`✓ Successfully granted ${adminTargetPlan.toUpperCase()} Ad-Free VIP to User ID: ${target}`)
      setAdminTargetUid('')
    } catch (err) {
      setAdminError('Activation failed: ' + (err.message || 'Please check the User ID.'))
    } finally {
      setAdminActivating(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerBar}>
        <button type="button" className={styles.backBtn} onClick={onBack}>
          ← Back to Movies
        </button>
      </div>

      <div className={styles.card}>
        {user ? (
          /* ── Signed-in profile view ── */
          <div className={styles.profileSection}>
            <div className={styles.avatar}>
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <h1 className={styles.title}>{user.displayName || 'Cinema Member'}</h1>
            <p className={styles.subtitle}>{user.email}</p>
            <div className={styles.badgeRow}>
              <span className={styles.vipBadge}>
                {user.email?.toLowerCase() === 'sachithnilukshana64@gmail.com' || user.uid?.startsWith('s5q2j8XcSqWz')
                  ? '👑 Admin & Owner'
                  : '★ Max Cinema Member'}
              </span>
              <span className={isPremium ? styles.premiumBadge : styles.statusBadge}>
                {isPremium ? '✨ Ad-Free Active' : 'Free Tier (Ads)'}
              </span>
            </div>

            <div className={styles.profileMeta}>
              <div className={styles.metaItemFull}>
                <span className={styles.metaLabel}>User ID</span>
                <div className={styles.uidWrapper}>
                  <code className={styles.uidValue}>{user.uid || 'member'}</code>
                  {user.uid && (
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => {
                        navigator.clipboard?.writeText?.(user.uid)
                        setSuccess('Copied User ID to clipboard!')
                        setTimeout(() => setSuccess(''), 2500)
                      }}
                      title="Copy full User ID"
                    >
                      📋 Copy
                    </button>
                  )}
                </div>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Player Profile</span>
                <span className={styles.metaValue}>
                  {user.email?.toLowerCase() === 'sachithnilukshana64@gmail.com' || user.uid?.startsWith('s5q2j8XcSqWz')
                    ? 'Admin (v2acgdm…)'
                    : 'Customer (v23rgj…)'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Ads Status</span>
                <span className={styles.metaValue}>{isPremium ? 'Blocked' : 'Enabled'}</span>
              </div>
            </div>

            {/* ── Ad-Free Premium Management Card ── */}
            <div className={styles.premiumCard}>
              <div className={styles.premiumHeader}>
                <span className={styles.premiumIcon}>{isPremium ? '🛡️' : '💎'}</span>
                <div>
                  <h3 className={styles.premiumTitle}>
                    {isPremium ? 'Ad-Free Premium Active' : 'Upgrade to Ad-Free'}
                  </h3>
                  <p className={styles.premiumSub}>
                    {isPremium
                      ? `Enjoy zero banner ads and uninterrupted playback (${currentPlan || 'Active'} Plan).`
                      : 'Remove all Google AdSense and promotional ads completely.'}
                  </p>
                </div>
              </div>

              {isPremium ? (
                <div className={styles.premiumActiveInfo}>
                  <span>✓ All Google AdSense ads disabled</span>
                  <span>✓ High-speed streaming activated</span>
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.upgradeBtn}
                  onClick={() => setPayModalOpen(true)}
                >
                  ⚡ Remove Ads ($2.99 / mo)
                </button>
              )}
            </div>

            {/* ── Admin Tool: Activate Premium by User ID ── */}
            {isAdmin && (
              <div className={styles.adminBox}>
                <div className={styles.adminBoxHeader}>
                  <span className={styles.adminCrown}>👑</span>
                  <div>
                    <h4 className={styles.adminBoxTitle}>Admin Command: Grant Premium</h4>
                    <p className={styles.adminBoxSub}>Activate Ad-Free status for any customer using their User ID.</p>
                  </div>
                </div>

                <form onSubmit={handleAdminActivateUser} className={styles.adminForm}>
                  <div className={styles.inputGroup}>
                    <label>Target Customer User ID</label>
                    <input
                      type="text"
                      placeholder="Paste customer Firebase UID"
                      value={adminTargetUid}
                      onChange={e => setAdminTargetUid(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <label>Plan Duration</label>
                    <select
                      value={adminTargetPlan}
                      onChange={e => setAdminTargetPlan(e.target.value)}
                      className={styles.planDropdown}
                    >
                      <option value="monthly">Monthly Pass (30 Days)</option>
                      <option value="yearly">Annual Pass (365 Days)</option>
                      <option value="lifetime">Lifetime VIP (Permanent)</option>
                    </select>
                  </div>

                  {adminError && <div className={styles.alertError}><span>⚠</span> {adminError}</div>}
                  {adminSuccess && <div className={styles.alertSuccess}><span>✓</span> {adminSuccess}</div>}

                  <button
                    type="submit"
                    className={styles.adminSubmitBtn}
                    disabled={adminActivating}
                  >
                    {adminActivating ? 'Granting VIP…' : '⚡ Activate Premium for User'}
                  </button>
                </form>
              </div>
            )}

            <div className={styles.actionGrid}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={onBrowseMovies || onBack}
              >
                Browse Movies &amp; Shows
              </button>
              {onBrowseHistory && (
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onBrowseHistory}
                >
                  View Watch History
                </button>
              )}
              <button
                type="button"
                className={styles.signOutBtn}
                disabled={loading}
                onClick={handleSignOut}
              >
                {loading ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Authentication form view ── */
          <>
            <div className={styles.branding}>
              <img className={styles.logoImage} src="/max-cinema-logo.png" alt="" />
              <h1 className={styles.title}>
                {mode === 'signin' && 'Sign in to Max Cinema'}
                {mode === 'signup' && 'Create your account'}
                {mode === 'forgot' && 'Reset your password'}
              </h1>
              <p className={styles.subtitle}>
                {mode === 'signin' && 'Sync your watch history, favorites, and watchlist across all devices.'}
                {mode === 'signup' && 'Join Max Cinema for unlimited movie tracking and personalized recommendations.'}
                {mode === 'forgot' && 'Enter your email address and we will send you a reset link.'}
              </p>
            </div>

            {/* Mode switch tabs */}
            {mode !== 'forgot' && (
              <div className={styles.tabGroup}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${mode === 'signin' ? styles.tabActive : ''}`}
                  onClick={() => switchMode('signin')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${mode === 'signup' ? styles.tabActive : ''}`}
                  onClick={() => switchMode('signup')}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Status alerts */}
            {error && (
              <div className={styles.alertError} role="alert">
                <span>⚠</span> {error}
              </div>
            )}
            {success && (
              <div className={styles.alertSuccess} role="status">
                <span>✓</span> {success}
              </div>
            )}

            {/* Google One-Click Login */}
            {mode !== 'forgot' && (
              <>
                <button
                  type="button"
                  className={styles.googleBtn}
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                >
                  <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className={styles.divider}>
                  <span>or with email</span>
                </div>
              </>
            )}

            {/* Email / Password Forms */}
            {mode === 'signin' && (
              <form onSubmit={handleEmailSignIn} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="signin-email">Email Address</label>
                  <input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <div className={styles.labelRow}>
                    <label htmlFor="signin-password">Password</label>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => switchMode('forgot')}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.togglePwBtn}
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="signup-name">Display Name (Optional)</label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Sachith"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="signup-email">Email Address</label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="signup-password">Password (minimum 6 characters)</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.togglePwBtn}
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="signup-confirm">Confirm Password</label>
                  <input
                    id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={loading}
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="forgot-email">Account Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={loading}
                >
                  {loading ? 'Sending link…' : 'Send Reset Link'}
                </button>

                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => switchMode('signin')}
                >
                  ← Back to Sign In
                </button>
              </form>
            )}

            <div className={styles.adFreePromo}>
              <span>✨ <b>Want 100% Ad-Free Streaming?</b> Sign in to activate Max Cinema Premium and remove all ads.</span>
            </div>

            <div className={styles.footerNote}>
              <span>Powered by Firebase Authentication · Max Cinema</span>
            </div>
          </>
        )}
      </div>

      {/* ── Payment / Upgrade Modal ── */}
      {payModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setPayModalOpen(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Upgrade to Ad-Free</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setPayModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <p className={styles.modalDesc}>
              Select your plan to remove all Google AdSense and third-party promotional ads on all your devices.
            </p>

            <div className={styles.planSelector}>
              <button
                type="button"
                className={`${styles.planOption} ${selectedPlan === 'monthly' ? styles.planActive : ''}`}
                onClick={() => setSelectedPlan('monthly')}
              >
                <div className={styles.planName}>Monthly Pass</div>
                <div className={styles.planPrice}>$2.99<span>/mo</span></div>
                <div className={styles.planSub}>Cancel anytime</div>
              </button>

              <button
                type="button"
                className={`${styles.planOption} ${selectedPlan === 'yearly' ? styles.planActive : ''}`}
                onClick={() => setSelectedPlan('yearly')}
              >
                <span className={styles.bestValueBadge}>Best Value</span>
                <div className={styles.planName}>Annual Pass</div>
                <div className={styles.planPrice}>$24.99<span>/yr</span></div>
                <div className={styles.planSub}>Save 30%</div>
              </button>
            </div>

            <form onSubmit={handleActivatePremium} className={styles.payForm}>
              <div className={styles.inputGroup}>
                <label>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="Full Name"
                  defaultValue={user?.displayName || ''}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Card Number</label>
                <input
                  type="text"
                  placeholder="•••• •••• •••• ••••"
                  maxLength="19"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  required
                />
              </div>

              <div className={styles.cardRow}>
                <div className={styles.inputGroup}>
                  <label>Expiry</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    maxLength="5"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>CVC</label>
                  <input
                    type="text"
                    placeholder="CVC"
                    maxLength="4"
                    value={cardCvc}
                    onChange={e => setCardCvc(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.paySubmitBtn}
                disabled={paymentProcessing}
              >
                {paymentProcessing
                  ? 'Activating Premium…'
                  : `Complete Payment (${selectedPlan === 'monthly' ? '$2.99' : '$24.99'})`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
