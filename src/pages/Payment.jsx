import { useState, useEffect } from 'react'
import { grantPremium } from '../lib/firebase.js'
import styles from './Payment.module.css'

const CASH_SCAN_CONNECT_URL = 'https://cash-scan-connect.lovable.app/'

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly VIP',
    icon: '⚡',
    price: '299',
    rawAmount: '299',
    loanAmount: '9.99',
    period: '/ month',
    days: 30,
    featured: false,
    saveText: null,
    features: [
      '100% Ad-Free Streaming',
      'High-Speed Premium Player',
      'Full HD & 4K Quality',
      'Multi-Device Synchronization',
      'Watch Party Access',
    ],
  },
  {
    id: 'annual',
    name: 'Annual VIP',
    icon: '👑',
    price: '2,499',
    rawAmount: '2499',
    loanAmount: '49.99',
    period: '/ year',
    days: 365,
    featured: true,
    saveText: 'Save 30%',
    features: [
      'Everything in Monthly',
      '30% Discount (Best Value)',
      'VIP Discord & Community Badge',
      'Early Access to New Releases',
      'Priority High-Speed CDN',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime VIP',
    icon: '💎',
    price: '4,999',
    rawAmount: '4999',
    loanAmount: '99.99',
    period: 'one-time payment',
    days: 36500,
    featured: false,
    saveText: 'Forever Access',
    features: [
      'Permanent Lifetime Access',
      'Never pay a subscription again',
      'Exclusive Golden Diamond Badge',
      'VIP Feature Requests Priority',
      'All Future Updates Included',
    ],
  },
]

function getFamilyLoanCheckoutUrl(plan, user) {
  const uid = user?.uid || (typeof localStorage !== 'undefined' && localStorage.getItem('cs_user_id')) || 'USER123'
  const ref = `${uid}__${plan.id}`
  const item = `${plan.name} Membership`
  return `https://cash-scan-connect.lovable.app/checkout?merchant=max-cinema&amount=${plan.loanAmount}&item=${encodeURIComponent(item)}&ref=${encodeURIComponent(ref)}&return=${encodeURIComponent('https://max-cinema.vercel.app/payment-done')}`
}

export default function Payment({ user, isPremium = false, onBack }) {
  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Virtual Card Form State
  const [cardNumber, setCardNumber] = useState('')
  const [cardholderName, setCardholderName] = useState(user?.displayName || '')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('payment') === 'success') {
      setIsSuccess(true)
    }
  }, [])

  const handleOpenCheckout = (plan) => {
    setSelectedPlan(plan)
    setIsModalOpen(true)
    setErrorMessage('')
  }

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ')
    setCardNumber(formatted)
  }

  // Format expiry MM/YY
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (raw.length > 2) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`
    }
    setExpiry(raw)
  }

  const handleVirtualCardSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')

    const cleanCard = cardNumber.replace(/\s+/g, '')
    if (cleanCard.length < 16) {
      setErrorMessage('Please enter a complete 16-digit Virtual Card Number.')
      return
    }

    if (!cardholderName.trim()) {
      setErrorMessage('Please enter the Cardholder Name.')
      return
    }

    if (!expiry || expiry.length < 5) {
      setErrorMessage('Please enter a valid Expiry Date (MM/YY).')
      return
    }

    if (!cvv || cvv.length < 3) {
      setErrorMessage('Please enter a valid 3-digit CVV / Security PIN.')
      return
    }

    setIsProcessing(true)

    try {
      const uid = user?.uid || 'guest_user'
      const amount = selectedPlan?.rawAmount || '299'

      // Call Virtual Card Payment API
      const res = await fetch('/api/virtual-card-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          planId: selectedPlan?.id || 'monthly',
          cardNumber: cleanCard,
          cardholderName: cardholderName.trim(),
          expiry,
          cvv,
          amount,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Payment failed with this Virtual Card.')
      }

      // Activate VIP locally & in Firebase
      await grantPremium(uid, selectedPlan?.id, selectedPlan?.days)

      setIsProcessing(false)
      setIsModalOpen(false)
      setIsSuccess(true)
    } catch (err) {
      setIsProcessing(false)
      setErrorMessage(err.message || 'Payment failed. Please check your Virtual Card details.')
    }
  }

  if (isSuccess) {
    return (
      <div className={styles.successPage}>
        <div className={styles.successIcon}>🎉</div>
        <h1 className={styles.successTitle}>Payment Successful!</h1>
        <p className={styles.successText}>
          Your payment has been authorized and your Max Cinema VIP subscription is now active! All ads are blocked.
        </p>
        <button
          className={styles.successBtn}
          onClick={() => {
            if (onBack) onBack()
            else window.location.href = '/'
          }}
        >
          Start Watching Now
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.crown}>👑</span>
        <h1 className={styles.title}>Max Cinema VIP Membership</h1>
        <p className={styles.subtitle}>
          Stream without ads on our high-speed premium server with pure cinematic quality.
        </p>
      </div>

      {/* ── Virtual Card & Family Loan Notice ── */}
      <div className={styles.virtualCardNotice}>
        <div className={styles.vcContent}>
          <span className={styles.vcIcon}>⚡</span>
          <div>
            <div className={styles.vcTitle}>Family Loan &amp; Virtual Cards Accepted</div>
            <p className={styles.vcDesc}>
              Pay instantly using your <strong>Family Loan balance</strong> or Virtual Card from{' '}
              <a href={CASH_SCAN_CONNECT_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>
                Cash Scan Connect (Smart Loan ATM)
              </a>
              . Virtual balance only — no real money is charged.
            </p>
          </div>
        </div>
        <a
          href={CASH_SCAN_CONNECT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.vcActionBtn}
        >
          Open Loan ATM ↗
        </a>
      </div>

      {isPremium && (
        <div className={styles.premiumBanner}>
          <span>💎</span>
          <div>
            <strong>You are an active VIP Member!</strong>
            <div>Your account currently has active VIP privileges with ad-free playback.</div>
          </div>
        </div>
      )}

      {/* ── Plans Grid ── */}
      <div className={styles.plansGrid}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${plan.featured ? styles.featured : ''}`}
          >
            {plan.featured && <div className={styles.popularBadge}>Most Popular</div>}
            <span className={styles.planIcon}>{plan.icon}</span>
            <h2 className={styles.planName}>{plan.name}</h2>

            <div className={styles.loanPriceRow}>
              <span className={styles.loanCurrency}>$</span>
              <span className={styles.loanPrice}>{plan.loanAmount}</span>
              <span className={styles.planPeriod}>{plan.period}</span>
            </div>
            <div className={styles.loanSubtext}>or LKR {plan.price} via Virtual Card</div>

            {plan.saveText && <div className={styles.saveBadge}>{plan.saveText}</div>}
            <div className={styles.divider} />
            <ul className={styles.features}>
              {plan.features.map((feat, i) => (
                <li key={i} className={styles.feature}>
                  <span className={styles.featureCheck}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {/* Pay with Family Loan button */}
            <a
              href={getFamilyLoanCheckoutUrl(plan, user)}
              className={styles.familyLoanBtn}
            >
              Pay with Family Loan card
            </a>

            <button
              type="button"
              className={styles.manualCardBtn}
              onClick={() => handleOpenCheckout(plan)}
            >
              Or enter Virtual Card manually
            </button>
          </div>
        ))}
      </div>

      <div className={styles.sandboxNotice}>
        Payments securely verified via{' '}
        <a href={CASH_SCAN_CONNECT_URL} target="_blank" rel="noopener noreferrer">
          Cash Scan Connect Smart Loan ATM
        </a>
        . Virtual balance authorization only.
      </div>

      {/* ── Virtual Card Checkout Modal ── */}
      {isModalOpen && selectedPlan && (
        <div className={styles.modalOverlay} onClick={() => !isProcessing && setIsModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => !isProcessing && setIsModalOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Virtual Card Checkout</h3>
              <p className={styles.modalSub}>
                Plan: <strong>{selectedPlan.name}</strong> · Amount: <strong>LKR {selectedPlan.price}</strong> (${selectedPlan.loanAmount})
              </p>
            </div>

            {/* Quick Family Loan link */}
            <div style={{ textAlign: 'center', margin: '-4px 0 16px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Have a loan balance? </span>
              <a
                href={getFamilyLoanCheckoutUrl(selectedPlan, user)}
                style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}
              >
                Pay with Family Loan card ↗
              </a>
            </div>

            {/* ── Stylized Virtual Card Preview ── */}
            <div className={styles.cardVisual}>
              <div className={styles.cardTopRow}>
                <span className={styles.cardBrand}>CASH SCAN CONNECT · VIRTUAL</span>
                <div className={styles.cardChip} />
              </div>

              <div className={styles.cardNumberDisplay}>
                {cardNumber || '•••• •••• •••• ••••'}
              </div>

              <div className={styles.cardBottomRow}>
                <div>
                  <div className={styles.cardHolderLabel}>CARDHOLDER</div>
                  <div className={styles.cardHolderName}>
                    {cardholderName || 'VIRTUAL MEMBER'}
                  </div>
                </div>
                <div>
                  <div className={styles.cardHolderLabel}>EXPIRES</div>
                  <div className={styles.cardExpiry}>{expiry || 'MM/YY'}</div>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className={styles.errorBanner}>
                <span>⚠ </span> {errorMessage}
              </div>
            )}

            {/* ── Virtual Card Form ── */}
            <form onSubmit={handleVirtualCardSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Virtual Card Number</label>
                <input
                  type="text"
                  placeholder="5521 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className={styles.formInput}
                  disabled={isProcessing}
                  autoFocus
                />
                <div className={styles.cardHelpRow}>
                  <span style={{ color: 'var(--text-dim)' }}>Cash Scan Connect 16-digit Virtual Card</span>
                  <a
                    href={CASH_SCAN_CONNECT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.cardHelpLink}
                  >
                    Get Virtual Card ↗
                  </a>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Cardholder Name</label>
                <input
                  type="text"
                  placeholder="e.g. SACHITH NILUKSHANA"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className={styles.formInput}
                  disabled={isProcessing}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    className={styles.formInput}
                    disabled={isProcessing}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>CVV / PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    className={styles.formInput}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <button
                type="submit"
                className={styles.submitCardBtn}
                disabled={isProcessing}
              >
                {isProcessing ? 'Authorizing Virtual Card…' : `Pay LKR ${selectedPlan.price} with Virtual Card`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
