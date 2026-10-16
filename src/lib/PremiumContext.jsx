import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { observePremiumStatus } from '../lib/firebase.js'
import {
  getCredits,
  syncCreditsFromServer,
  useCreditForTitle,
  isTitleUnlockedWithCredit,
} from '../lib/credits.js'

const ADMIN_EMAIL = 'sachithnilukshana64@gmail.com'
const ADMIN_UID_PREFIX = 's5q2j8XcSqWz'

const PremiumContext = createContext({
  isPremium: false,
  plan: null,
  loading: true,
  credits: 1,
  hasCredits: true,
  isUnlocked: () => false,
  spendCredit: async () => {},
})

export function PremiumProvider({ uid, email, children }) {
  const [state, setState] = useState(() => ({
    isPremium: false,
    plan: null,
    loading: true,
    credits: getCredits(uid),
  }))

  // Listen for local credits updates (e.g. spent or awarded)
  useEffect(() => {
    const handleCreditsChange = e => {
      if (!e.detail || e.detail.uid === uid || !e.detail.uid) {
        setState(prev => ({ ...prev, credits: getCredits(uid) }))
      }
    }
    const handleTitleUnlocked = () => {
      setState(prev => ({ ...prev, credits: getCredits(uid) }))
    }
    window.addEventListener('Max Cinema:creditschange', handleCreditsChange)
    window.addEventListener('Max Cinema:titleunlocked', handleTitleUnlocked)
    return () => {
      window.removeEventListener('Max Cinema:creditschange', handleCreditsChange)
      window.removeEventListener('Max Cinema:titleunlocked', handleTitleUnlocked)
    }
  }, [uid])

  useEffect(() => {
    // Admin is permanently ad-free VIP with unlimited access
    const isAdmin = (email && email.toLowerCase() === ADMIN_EMAIL) || (uid && uid.startsWith(ADMIN_UID_PREFIX))
    if (isAdmin) {
      setState(prev => ({ ...prev, isPremium: true, plan: 'admin_vip', loading: false, credits: 999 }))
      return
    }

    if (!uid) {
      setState(prev => ({
        ...prev,
        isPremium: false,
        plan: null,
        loading: false,
        credits: getCredits(null),
      }))
      return
    }

    const unsub = observePremiumStatus(uid, status => {
      if (typeof status.credits === 'number') {
        syncCreditsFromServer(uid, status.credits)
      }
      setState(prev => ({
        ...prev,
        isPremium: Boolean(status.active),
        plan: status.plan || null,
        loading: false,
        credits: getCredits(uid),
      }))
    })
    return unsub
  }, [uid, email])

  const spendCredit = useCallback(
    async media => {
      return useCreditForTitle(uid, media)
    },
    [uid]
  )

  const isUnlocked = useCallback(tmdbId => {
    return isTitleUnlockedWithCredit(tmdbId)
  }, [])

  const value = {
    ...state,
    hasCredits: state.credits > 0,
    spendCredit,
    isUnlocked,
  }

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
}

export function usePremium() {
  return useContext(PremiumContext)
}
