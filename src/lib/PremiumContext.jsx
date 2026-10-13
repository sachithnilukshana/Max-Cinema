import React, { createContext, useContext, useEffect, useState } from 'react'
import { observePremiumStatus } from '../lib/firebase.js'

const ADMIN_EMAIL = 'sachithnilukshana64@gmail.com'
const ADMIN_UID_PREFIX = 's5q2j8XcSqWz'

const PremiumContext = createContext({ isPremium: false, plan: null, loading: true })

export function PremiumProvider({ uid, email, children }) {
  const [state, setState] = useState({ isPremium: false, plan: null, loading: true })

  useEffect(() => {
    // Admin is permanently ad-free VIP
    const isAdmin = (email && email.toLowerCase() === ADMIN_EMAIL) || (uid && uid.startsWith(ADMIN_UID_PREFIX))
    if (isAdmin) {
      setState({ isPremium: true, plan: 'admin_vip', loading: false })
      return
    }

    if (!uid) {
      setState({ isPremium: false, plan: null, loading: false })
      return
    }

    const unsub = observePremiumStatus(uid, status => {
      setState({ isPremium: Boolean(status.active), plan: status.plan || null, loading: false })
    })
    return unsub
  }, [uid, email])

  return <PremiumContext.Provider value={state}>{children}</PremiumContext.Provider>
}

export function usePremium() {
  return useContext(PremiumContext)
}
