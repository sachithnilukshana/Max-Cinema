import { useEffect, useState } from 'react'
import { grantPremium } from '../lib/firebase.js'
import styles from './PaymentDone.module.css'

export default function PaymentDone({ user, onBack, onGoToPayment }) {
  const [state, setState] = useState('verifying') // 'verifying' | 'paid' | 'cancelled' | 'error' | 'not_found'
  const [paymentData, setPaymentData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const status = urlParams.get('status')
    const paymentId = urlParams.get('payment_id')

    if (status === 'cancelled') {
      setState('cancelled')
      return
    }

    if (!paymentId) {
      setState('not_found')
      return
    }

    async function verifyPayment() {
      try {
        setState('verifying')
        const res = await fetch(`https://cash-scan-connect.lovable.app/api/public/checkout/${paymentId}`)
        if (!res.ok) {
          throw new Error(`Verification service returned status ${res.status}`)
        }
        const p = await res.json()

        if (p && p.status === 'paid') {
          // Determine plan from item, ref, or amount
          const itemLower = (p.item || '').toLowerCase()
          const rawRef = p.ref || ''
          let planId = 'monthly'
          let planName = 'Monthly VIP'
          let durationDays = 30

          if (rawRef.includes('lifetime') || itemLower.includes('lifetime') || Number(p.amount) >= 90) {
            planId = 'lifetime'
            planName = 'Lifetime VIP'
            durationDays = 36500
          } else if (rawRef.includes('annual') || itemLower.includes('annual') || Number(p.amount) >= 40) {
            planId = 'annual'
            planName = 'Annual VIP'
            durationDays = 365
          }

          // Determine user UID to credit
          const refUid = rawRef.includes('__') ? rawRef.split('__')[0] : (rawRef && !rawRef.startsWith('guest_') ? rawRef : null)
          const targetUid = user?.uid || refUid || 'guest_user'

          // Activate VIP membership locally & in Firebase RTDB
          await grantPremium(targetUid, planId, durationDays)

          // Call backend verification to sync Firestore and trigger admin notification
          fetch('/api/family-loan-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              uid: targetUid,
              planId,
              durationDays,
              details: p,
            }),
          }).catch(err => console.warn('Family loan backend sync warning:', err))

          setPaymentData({
            ...p,
            id: paymentId,
            planName,
            planId,
            durationDays,
          })
          setState('paid')
        } else {
          setState('error')
          setErrorMessage(p?.error || 'Payment has not been completed or verified.')
        }
      } catch (err) {
        console.error('Payment verification failed:', err)
        setState('error')
        setErrorMessage(err.message || 'Could not verify payment with Cash Scan Connect.')
      }
    }

    verifyPayment()
  }, [user])

  if (state === 'verifying') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.spinnerWrapper}>
            <div className={styles.spinner} />
            <h2 className={styles.title}>Verifying Payment…</h2>
            <p className={styles.subtitle}>
              Contacting Cash Scan Connect to confirm your Family Loan transaction.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'cancelled') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <span className={styles.icon}>✕</span>
          <h1 className={styles.title}>Payment Cancelled</h1>
          <p className={styles.subtitle}>
            You cancelled the Family Loan card checkout. No virtual balance was charged.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => (onGoToPayment ? onGoToPayment() : (window.location.href = '/payment'))}
            >
              Choose a VIP Plan
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => (onBack ? onBack() : (window.location.href = '/'))}
            >
              Browse Movies &amp; Series
            </button>
          </div>

          <div className={styles.loanSourceNote}>
            Need balance? Check your loans on{' '}
            <a href="https://cash-scan-connect.lovable.app" target="_blank" rel="noopener noreferrer">
              Cash Scan Connect
            </a>
            .
          </div>
        </div>
      </div>
    )
  }

  if (state === 'paid' && paymentData) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <span className={styles.icon}>🎉</span>
          <h1 className={`${styles.title} ${styles.goldTitle}`}>VIP Membership Activated!</h1>
          <p className={styles.subtitle}>
            Your Family Loan payment has been confirmed. All advertisements are now removed and high-speed streaming is active!
          </p>

          <div className={styles.receipt}>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Status</span>
              <span className={styles.badgeSuccess}>✓ Paid &amp; Verified</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Membership</span>
              <span className={styles.receiptHighlight}>{paymentData.planName}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Amount Paid</span>
              <span className={styles.receiptValue}>${Number(paymentData.amount).toFixed(2)}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Payment Method</span>
              <span className={styles.receiptValue}>Family Loan Card</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Payment ID</span>
              <span className={styles.receiptValue} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                {paymentData.id}
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => (onBack ? onBack() : (window.location.href = '/'))}
            >
              🎬 Start Watching Ad-Free Now
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => (onGoToPayment ? onGoToPayment() : (window.location.href = '/payment'))}
            >
              View Membership Details
            </button>
          </div>

          <div className={styles.loanSourceNote}>
            This payment is recorded on your Virtual Card &amp; Card Payments page on{' '}
            <a href="https://cash-scan-connect.lovable.app" target="_blank" rel="noopener noreferrer">
              Cash Scan Connect
            </a>
            .
          </div>
        </div>
      </div>
    )
  }

  // Error / Not Found state
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon}>⚠️</span>
        <h1 className={styles.title}>Payment Not Verified</h1>
        <p className={styles.subtitle}>
          {errorMessage || 'No valid payment number was detected or the payment was not marked as paid.'}
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => (onGoToPayment ? onGoToPayment() : (window.location.href = '/payment'))}
          >
            Return to VIP Plans
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => (onBack ? onBack() : (window.location.href = '/'))}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
