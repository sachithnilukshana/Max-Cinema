const ADMIN_CONFIG_KEY = 'cs_admin_config'

export const defaultAdminConfig = { announcement: '', featuredMovieId: '', pinnedTvId: '5920' }

export function loadAdminConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_CONFIG_KEY))
    if (saved && typeof saved === 'object') return { ...defaultAdminConfig, ...saved }
  } catch {}
  return defaultAdminConfig
}

export function saveAdminConfig(config) {
  const next = { ...defaultAdminConfig, ...config }
  try { localStorage.setItem(ADMIN_CONFIG_KEY, JSON.stringify(next)) } catch {}
  return next
}
