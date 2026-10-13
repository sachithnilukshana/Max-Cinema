import React, { createContext, useContext, useEffect, useState } from 'react'
import { observePremiumStatus } from '../lib/firebase.js'

const PremiumContext = createContext({ isPremium: false, plan: null, loading: true })

export function PremiumProvider({ uid, children }) {
  const [state, setState] = useState({ isPremium: false, plan: null, loading: true })

  useEffect(() => {
    if (!uid) {
      setState({ isPremium: false, plan: null, loading: false })
      return
    }
    const unsub = observePremiumStatus(uid, status => {
      setState({ isPremium: Boolean(status.active), plan: status.plan || null, loading: false })
    })
    return unsub
  }, [uid])

  return <PremiumContext.Provider value={state}>{children}</PremiumContext.Provider>
}

export function usePremium() {
  return useContext(PremiumContext)
}

