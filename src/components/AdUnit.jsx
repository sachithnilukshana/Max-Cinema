import { useEffect, useRef } from 'react'
import { usePremium } from '../lib/PremiumContext.jsx'
import styles from './AdUnit.module.css'

const AD_CLIENT = 'ca-pub-1450329989131749'

export default function AdUnit({ slot, format = 'auto', responsive = true, className = '' }) {
  const { isPremium } = usePremium()
  const adRef = useRef(null)
  const requested = useRef(false)

  useEffect(() => {
    if (isPremium || !slot || requested.current || !adRef.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      requested.current = true
    } catch {
      // Ad blockers and unavailable ad inventory should not interrupt the app.
    }
  }, [slot, isPremium])

  if (isPremium || !slot) return null

  return (
    <aside className={`${styles.wrap} ${className}`} aria-label="Advertisement">
      <span className={styles.label}>Advertisement</span>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </aside>
  )
}
