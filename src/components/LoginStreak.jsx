import { useState, useEffect, useRef } from 'react'
import styles from './LoginStreak.module.css'

const STREAK_KEY = 'cs_streak'

function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

/**
 * Records today's login and updates the streak stored in localStorage.
 * Schema: { streak: number, lastDate: 'YYYY-MM-DD', longestStreak: number }
 * @returns {{ streak: number, longestStreak: number, isNew: boolean }}
 */
function recordLogin() {
  const today = new Date().toISOString().slice(0, 10)
  const stored = safeGet(STREAK_KEY) || {}
  const last = stored.lastDate || null
  let streak = typeof stored.streak === 'number' ? stored.streak : 0
  let longest = typeof stored.longestStreak === 'number' ? stored.longestStreak : streak
  let isNew = false

  if (last === today) {
    // already recorded today — no change
    return { streak, longestStreak: longest, isNew: false }
  }

  if (last) {
    const lastMs = new Date(last).getTime()
    const todayMs = new Date(today).getTime()
    const diffDays = Math.round((todayMs - lastMs) / 86_400_000)

    if (diffDays === 1) {
      // consecutive day
      streak += 1
      isNew = true
    } else if (diffDays > 1) {
      // streak broken
      streak = 1
      isNew = true
    }
  } else {
    streak = 1
    isNew = true
  }

  longest = Math.max(longest, streak)
  safeSet(STREAK_KEY, { streak, lastDate: today, longestStreak: longest })
  return { streak, longestStreak: longest, isNew }
}

/**
 * LoginStreak — displays current login streak with animated flame.
 * Records today's visit on mount.
 *
 * Props:
 *   uid        {string}  — user/profile id (for future Firestore sync)
 */
export default function LoginStreak({ uid }) {
  const [streak, setStreak] = useState(0)
  const recorded = useRef(false)

  useEffect(() => {
    if (recorded.current) return
    recorded.current = true
    const { streak: s } = recordLogin()
    setStreak(s)
  }, [uid])

  const isHot = streak > 3
  const flameClass = isHot ? styles.flameAnimated : styles.flame

  return (
    <div className={styles.widget} title={streak > 0 ? `${streak}-day login streak` : 'Start your streak today!'}>
      <span className={flameClass} aria-hidden="true">🔥</span>
      {streak > 0 ? (
        <>
          <span className={styles.label}>{streak}-day</span>
          <span className={styles.sub}>streak</span>
        </>
      ) : (
        <span className={styles.zero}>No streak yet</span>
      )}
    </div>
  )
}
