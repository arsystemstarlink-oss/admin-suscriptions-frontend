import { create } from 'zustand'

interface OrganizationState {
  selectedOrganizationId: string | null
  setOrganization: (organizationId: string | null) => void
  loadFromStorage: () => void
}

const ORGANIZATION_STORAGE_KEY = 'selectedOrganizationId'

export const useOrganizationStore = create<OrganizationState>((set) => ({
  selectedOrganizationId: null,
  setOrganization: (organizationId) => {
    localStorage.setItem(ORGANIZATION_STORAGE_KEY, organizationId || '')
    set({ selectedOrganizationId: organizationId })
  },
  loadFromStorage: () => {
    const stored = localStorage.getItem(ORGANIZATION_STORAGE_KEY)
    const organizationId = stored || null
    set({ selectedOrganizationId: organizationId })
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === ORGANIZATION_STORAGE_KEY) {
      useOrganizationStore.getState().loadFromStorage()
    }
  })
}