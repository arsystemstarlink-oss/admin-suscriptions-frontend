import type { User } from '@/types/api'

export type StorageMode = 'local' | 'session'

const STORAGE_MODE_KEY = 'auth.storageMode'
const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'user'
const REFRESH_LOCK_KEY = 'authRefreshLock'
const REFRESH_VERSION_KEY = 'authRefreshVersion'
const REFRESH_LOCK_TIMEOUT_MS = 15_000

const TAB_ID =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export function getStorageMode(): StorageMode {
  try {
    return window.localStorage.getItem(STORAGE_MODE_KEY) === 'session' ? 'session' : 'local'
  } catch {
    return 'local'
  }
}

export function setStorageMode(mode: StorageMode): void {
  try {
    window.localStorage.setItem(STORAGE_MODE_KEY, mode)
  } catch {
    // storage no disponible; se ignora
  }
}

function getTokenStorage(): Storage {
  return getStorageMode() === 'session' ? window.sessionStorage : window.localStorage
}

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  const storage = getTokenStorage()
  return {
    accessToken: storage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: storage.getItem(REFRESH_TOKEN_KEY),
  }
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  const storage = getTokenStorage()
  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  storage.setItem(REFRESH_VERSION_KEY, String(getRefreshVersion() + 1))
}

export function clearStoredTokens(): void {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY)
    storage.removeItem(REFRESH_TOKEN_KEY)
    storage.removeItem(USER_KEY)
    storage.removeItem(REFRESH_LOCK_KEY)
    storage.removeItem(REFRESH_VERSION_KEY)
  }
}

export function getStoredUser(): User | null {
  const raw = getTokenStorage().getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function setStoredUser(user: User): void {
  getTokenStorage().setItem(USER_KEY, JSON.stringify(user))
}

export function getRefreshVersion(): number {
  return Number(getTokenStorage().getItem(REFRESH_VERSION_KEY) ?? '0')
}

export function acquireRefreshLock(): boolean {
  const now = Date.now()
  try {
    const storage = getTokenStorage()
    const lockRaw = storage.getItem(REFRESH_LOCK_KEY)
    if (lockRaw) {
      const lock = JSON.parse(lockRaw) as { tabId: string; startedAt: number }
      if (lock.tabId === TAB_ID) return true
      if (now - lock.startedAt < REFRESH_LOCK_TIMEOUT_MS) return false
    }
    storage.setItem(REFRESH_LOCK_KEY, JSON.stringify({ tabId: TAB_ID, startedAt: now }))
    return true
  } catch {
    return true
  }
}

export function releaseRefreshLock(): void {
  try {
    const storage = getTokenStorage()
    const lockRaw = storage.getItem(REFRESH_LOCK_KEY)
    if (lockRaw) {
      const lock = JSON.parse(lockRaw) as { tabId: string }
      if (lock.tabId === TAB_ID) storage.removeItem(REFRESH_LOCK_KEY)
    }
  } catch {
    // lock corrupto; se ignora
  }
}
