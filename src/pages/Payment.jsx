import { useState, useEffect } from 'react'
import { getCredits, addCredits } from '../lib/credits.js'
import { usePremium } from '../lib/PremiumContext.jsx'
import styles from './Payment.module.css'

const CASH_SCAN_CONNECT_URL = 'https://cash-scan-connect.lovable.app/'

export const CREDIT_PACKS = [
  {
    id: 'pack_5',
    name: '5 VIP Credits',
    credits: 5,
    icon: '🎟️',
    price: '599',
    rawAmount: '599',
    loanAmount: '1.99',
    unitPrice: '$0.40 / title',
    period: '5 VIP movies or episodes',
    featured: false,
    saveText: null,
    features: [
      '5 Ad-Free Movies or Series',
      'High-Speed Premium Stream',
      'Full HD & 4K Quality',
      'Credits Never Expire',
      'Any Device (PC, Phone, Fire TV)',
    ],
  },
  {
    id: 'pack_15',
    name: '15 VIP Credits',
    credits: 15,
    icon: '⚡',
    price: '1,499',
    rawAmount: '1499',
    loanAmount: '4.99',
    unitPrice: '$0.33 / title',
    period: '15 VIP movies or episodes',
    featured: true,
    saveText: 'Most Popular',
    features: [
      '15 Ad-Free Movies or Series',
      'Save 18% per VIP title',
      'Instant Server Unlocking',
      'Credits Never Expire',
      'Watch anytime at your own pace',
    ],
  },
  {
    id: 'pack_50',
    name: '50 VIP Credits',
    credits: 50,
    icon: '👑',
    price: '3,899',
    rawAmount: '3899',
    loanAmount: '12.99',
    unitPrice: '$0.26 / title',
    period: '50 VIP movies or episodes',
    featured: false,
    saveText: 'Best Value',
    features: [
      '50 Ad-Free Movies or Series',
      'Unlock entire TV seasons',
      'Save 35% per VIP title',
      'Credits Never Expire',
      'Priority High-Speed Server',
    ],
  },
  {
    id: 'pack_120',
    name: '120 VIP Credits',
    credits: 120,
    icon: '💎',
    price: '7,499',
    rawAmount: '7499',
    loanAmount: '24.99',
    unitPrice: '$0.20 / title',
    period: '120 VIP movies or episodes',
    featured: false,
    saveText: 'Marathon Pack',
    features: [
      '120 Ad-Free Movies or Series',
      'Massive 50% discount per title',
      'Ultimate Binge-Watcher Bundle',
      'Credits Never Expire',
      'VIP Discord & Community Recognition',
    ],
  },
]

function getFamilyLoanCheckoutUrl(pack, user) {
  const uid = user?.uid || (typeof localStorage !== 'undefined' && localStorage.getItem('cs_user_id')) || 'guest_user'
  const ref = `${uid}__credits_${pack.credits}`
  const item = `${pack.name} (${pack.credits} Credits)`
  return `https://cash-scan-connect.lovable.app/checkout?merchant=max-cinema&amount=${pack.loanAmount}&item=${encodeURIComponent(item)}&ref=${encodeURIComponent(ref)}&return=${encodeURIComponent('https://max-cinema.vercel.app/payment-done')}`
}

export default function Payment({ user, onBack }) {
  const { credits, isPremium } = usePremium()
  const [userCredits, setUserCredits] = useState(() => getCredits(user?.uid))
  const [isSuccess, setIsSuccess] = useState(false)
  const [successCreditsAdded, setSuccessCreditsAdded] = useState(0)
  const [selectedPack, setSelectedPack] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Virtual Card Form State
  const [cardNumber, setCardNumber] = useState('')
  const [cardholderName, setCardholderName] = useState(user?.displayName || '')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setUserCredits(getCredits(user?.uid))
  }, [user, credits])

  const handleOpenCheckout = (pack) => {
    setSelectedPack(pack)
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
      const uid = user?.uid || (typeof localStorage !== 'undefined' && localStorage.getItem('cs_user_id')) || 'guest_user'
      const amount = selectedPack?.rawAmount || '599'
      const packCredits = selectedPack?.credits || 5

      // Call Virtual Card Payment API
      const res = await fetch('/api/virtual-card-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          credits: packCredits,
          planId: selectedPack?.id || 'pack_5',
          packName: selectedPack?.name || `${packCredits} VIP Credits`,
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

      // Add credits locally & dispatch sync
      const newBalance = addCredits(uid, packCredits)
      setUserCredits(newBalance)

      setSuccessCreditsAdded(packCredits)
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
        <h1 className={styles.successTitle}>Credits Added Successfully!</h1>
        <p className={styles.successText}>
          {successCreditsAdded} VIP Credits have been added to your account! You now have a total of{' '}
          <strong style={{ color: 'var(--gold)' }}>{userCredits} Credits</strong> to watch movies and series ad-free.
        </p>
        <button
          className={styles.successBtn}
          onClick={() => {
            if (onBack) onBack()
            else window.location.href = '/'
          }}
        >
          🎬 Start Watching Now
        </button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <span className={styles.crown}>🎟️</span>
        <h1 className={styles.title}>Buy VIP Streaming Credits</h1>
        <p className={styles.subtitle}>
          Watch any movie or TV episode 100% Ad-Free in high-definition. <strong>1 Credit = 1 VIP Title</strong>. Credits never expire!
        </p>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div className={styles.balanceBox}>
          <span>Your VIP Credit Balance:</span>
          <span className={styles.balanceCount}>🎟️ {userCredits} Credit{userCredits === 1 ? '' : 's'}</span>
          {isPremium && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>· (👑 VIP Pass Active)</span>}
        </div>
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

      {/* ── Credit Packs Grid ── */}
      <div className={styles.plansGrid}>
        {CREDIT_PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`${styles.planCard} ${pack.featured ? styles.featured : ''}`}
          >
            {pack.featured && <div className={styles.popularBadge}>Most Popular</div>}
            <span className={styles.planIcon}>{pack.icon}</span>
            <h2 className={styles.planName}>{pack.name}</h2>

            <div className={styles.loanPriceRow}>
              <span className={styles.loanCurrency}>$</span>
              <span className={styles.loanPrice}>{pack.loanAmount}</span>
            </div>
            <div className={styles.loanSubtext}>{pack.unitPrice} · or LKR {pack.price}</div>

            {pack.saveText && <div className={styles.saveBadge}>{pack.saveText}</div>}
            <div className={styles.divider} />
            <ul className={styles.features}>
              {pack.features.map((feat, i) => (
                <li key={i} className={styles.feature}>
                  <span className={styles.featureCheck}>✓</span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            {/* Pay with Family Loan button */}
            <a
              href={getFamilyLoanCheckoutUrl(pack, user)}
              className={styles.familyLoanBtn}
            >
              Pay with Family Loan card
            </a>

            <button
              type="button"
              className={styles.manualCardBtn}
              onClick={() => handleOpenCheckout(pack)}
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
      {isModalOpen && selectedPack && (
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
                Package: <strong>{selectedPack.name}</strong> · Amount: <strong>LKR {selectedPack.price}</strong> (${selectedPack.loanAmount})
              </p>
            </div>

            {/* Quick Family Loan link */}
            <div style={{ textAlign: 'center', margin: '-4px 0 16px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Have a loan balance? </span>
              <a
                href={getFamilyLoanCheckoutUrl(selectedPack, user)}
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
                {isProcessing ? 'Authorizing Virtual Card…' : `Pay LKR ${selectedPack.price} (${selectedPack.credits} Credits)`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
