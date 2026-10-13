import { useState, useEffect } from 'react'
import { getUnlockedBadges, getNewBadges, saveBadgesSeen } from '../lib/badges.js'
import styles from './BadgesDisplay.module.css'

export default function BadgesDisplay({ uid, isPremium = false, compact = false }) {
  const [badges, setBadges] = useState([])
  const [newBadgeIds, setNewBadgeIds] = useState([])

  useEffect(() => {
    if (!uid) return
    const all = getUnlockedBadges(uid, isPremium)
    const fresh = getNewBadges(uid, isPremium)
    setBadges(all)
    setNewBadgeIds(fresh.map((b) => b.id))

    // Mark seen after 3 seconds of viewing
    if (fresh.length > 0) {
      const timer = setTimeout(() => {
        saveBadgesSeen(uid, fresh.map((b) => b.id))
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [uid, isPremium])

  if (!badges || badges.length === 0) {
    return <div className={styles.empty}>Start watching movies & series to earn badges!</div>
  }

  const earnedCount = badges.filter((b) => b.earned).length

  return (
    <div>
      {!compact && (
        <div className={styles.heading}>
          Badges & Achievements ({earnedCount}/{badges.length} Unlocked)
        </div>
      )}
      <div className={compact ? styles.gridCompact : styles.grid}>
        {badges.map((badge) => {
          const isNew = newBadgeIds.includes(badge.id)
          return (
            <div
              key={badge.id}
              className={`${styles.card} ${compact ? styles.cardCompact : ''} ${
                badge.earned ? styles.earned : styles.locked
              }`}
              tabIndex={0}
              aria-label={`${badge.name}: ${badge.desc} (${badge.earned ? 'Unlocked' : 'Locked'})`}
            >
              {isNew && <span className={styles.newBadge}>NEW!</span>}
              {!badge.earned && <span className={styles.lockIcon}>🔒</span>}
              <span className={compact ? styles.iconCompact : styles.icon}>
                {badge.icon}
              </span>
              <span className={compact ? styles.nameCompact : styles.name}>
                {badge.name}
              </span>

              {/* Tooltip */}
              <div className={styles.tooltip}>
                <div className={styles.tooltipName}>{badge.name}</div>
                <div className={styles.tooltipDesc}>{badge.desc}</div>
                <div className={styles.tooltipStatus}>
                  {badge.earned ? '✓ Unlocked' : '🔒 Locked'}
                </div>
                <div className={styles.tooltipArrow} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

