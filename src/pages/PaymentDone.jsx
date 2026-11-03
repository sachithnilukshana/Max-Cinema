import { useEffect, useState } from 'react'
import { addCredits, getCredits } from '../lib/credits.js'
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
          // Determine credit quantity from ref or item
          const rawRef = p.ref || ''
          const rawItem = p.item || ''
          let creditsCount = 15

          const creditRefMatch = rawRef.match(/__credits_(\d+)/)
          const creditItemMatch = rawItem.match(/(\d+)\s*(?:VIP\s*)?Credit/i)

          if (creditRefMatch) {
            creditsCount = parseInt(creditRefMatch[1], 10)
          } else if (creditItemMatch) {
            creditsCount = parseInt(creditItemMatch[1], 10)
          } else {
            const amt = Number(p.amount) || 0
            if (amt >= 20) creditsCount = 120
            else if (amt >= 10) creditsCount = 50
            else if (amt >= 4) creditsCount = 15
            else creditsCount = 5
          }

          // Determine user UID to credit
          const refUid = rawRef.includes('__') ? rawRef.split('__')[0] : (rawRef && !rawRef.startsWith('guest_') ? rawRef : null)
          const targetUid = user?.uid || refUid || (typeof localStorage !== 'undefined' && localStorage.getItem('cs_user_id')) || 'guest_user'

          // Add credits to user's local balance & trigger event
          const updatedBalance = addCredits(targetUid, creditsCount)

          // Call backend verification to sync Firestore and trigger Telegram admin notification
          fetch('/api/family-loan-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              uid: targetUid,
              credits: creditsCount,
              details: p,
            }),
          }).catch(err => console.warn('Family loan backend sync warning:', err))

          setPaymentData({
            ...p,
            id: paymentId,
            creditsAdded: creditsCount,
            newBalance: updatedBalance,
            packName: `${creditsCount} VIP Credits`,
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
              Choose a Credit Pack
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
          <span className={styles.icon}>🎟️</span>
          <h1 className={`${styles.title} ${styles.goldTitle}`}>VIP Credits Added!</h1>
          <p className={styles.subtitle}>
            Your Family Loan payment of <strong>${Number(paymentData.amount).toFixed(2)}</strong> has been confirmed. <strong>+{paymentData.creditsAdded} VIP Credits</strong> were added to your account!
          </p>

          <div className={styles.receipt}>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Status</span>
              <span className={styles.badgeSuccess}>✓ Paid &amp; Verified</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Package</span>
              <span className={styles.receiptHighlight}>{paymentData.packName}</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>Credits Added</span>
              <span className={styles.receiptHighlight}>+{paymentData.creditsAdded} Credits</span>
            </div>
            <div className={styles.receiptRow}>
              <span className={styles.receiptLabel}>New Credit Balance</span>
              <span className={styles.receiptHighlight}>🎟️ {paymentData.newBalance} Credits</span>
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
              🎬 Start Watching Movies &amp; Series
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => (onGoToPayment ? onGoToPayment() : (window.location.href = '/payment'))}
            >
              🎟️ Buy More Credits
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
            Return to Credit Packs
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
