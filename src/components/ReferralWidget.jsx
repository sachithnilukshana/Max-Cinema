import { useState } from 'react'
import { getReferralLink, getReferralStats } from '../lib/referral.js'
import styles from './ReferralWidget.module.css'

export default function ReferralWidget({ user }) {
  const [copied, setCopied] = useState(false)
  const uid = user?.uid
  const stats = getReferralStats(uid)
  const link = getReferralLink(uid)

  const handleCopy = () => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareText = encodeURIComponent(
    'Watch free movies & TV series on Max Cinema with zero ads! Join with my link:'
  )
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}%20${encodeURIComponent(link)}`
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.icon}>🎁</span>
        <h3 className={styles.title}>Invite Friends, Get Free VIP!</h3>
      </div>
      <p className={styles.desc}>
        Share Max Cinema with your friends. For every friend who signs up with your link, you get <strong>7 Days of Free VIP</strong> ad-free streaming!
      </p>

      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <div className={styles.statVal}>{stats.referralCount}</div>
          <div className={styles.statLabel}>Friends Joined</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statVal}>{stats.earnedDays}d</div>
          <div className={styles.statLabel}>Free VIP Earned</div>
        </div>
      </div>

      <div className={styles.linkGroup}>
        <input
          type="text"
          readOnly
          value={link}
          className={styles.linkInput}
          onClick={(e) => e.target.select()}
        />
        <button onClick={handleCopy} className={styles.copyBtn}>
          {copied ? 'Copied! ✓' : 'Copy Link'}
        </button>
      </div>

      <div className={styles.shareRow}>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>
          💬 WhatsApp
        </a>
        <a href={fbUrl} target="_blank" rel="noopener noreferrer" className={styles.shareBtn}>
          🌐 Facebook
        </a>
      </div>
    </div>
  )
}

