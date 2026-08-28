import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { OmniSearch } from '@/components/command/OmniSearch'
import { QuickPayModal } from '@/components/payment/QuickPayModal'
import MobileAppShell from './MobileAppShell'
import { useUIStore } from '@/stores/ui.store'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useAuthStore } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { cn } from '@/lib/utils'

const SIDEBAR_STORAGE_KEY = 'sidebarCollapsed'

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  if (window.innerWidth < 1024) return true
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
}

export function AuthenticatedLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isSuperAdmin = useIsSuperAdmin()
  const user = useAuthStore((state) => state.user)
  const { selectedOrganizationId, setOrganization } = useOrganizationStore()

  const { data: organizationsData } = useOrganizations(
    { limit: 100 },
    { enabled: isSuperAdmin },
  )
  const organizations = (organizationsData?.organizations || []).filter((org) => org.active)

  useEffect(() => {
    if (!isSuperAdmin && user?.organizationId && !selectedOrganizationId) {
      setOrganization(user.organizationId)
    }
  }, [isSuperAdmin, user, selectedOrganizationId, setOrganization])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0)
  }, [location.pathname])

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next))
      return next
    })
  }

  const { openOmniSearch } = useUIStore()
  const isChatsPage = location.pathname.startsWith('/chats')
  useTokenRefresh()

  if (isMobile) {
    return (
      <>
        <MobileAppShell
          onOpenSearch={openOmniSearch}
          isSuperAdmin={isSuperAdmin}
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          onOrganizationChange={setOrganization}
        />
        <OmniSearch />
        <QuickPayModal />
      </>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar
        isMobile={isMobile}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
        isSuperAdmin={isSuperAdmin}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setOrganization}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={collapsed}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          onToggleSidebar={toggleSidebar}
        />
        <main
          ref={mainRef}
          className={cn(
            'flex-1 p-4 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]',
            isChatsPage ? 'flex min-h-0 flex-col overflow-hidden' : 'overflow-auto'
          )}
        >
          <Outlet />
        </main>
      </div>
      <OmniSearch />
      <QuickPayModal />
    </div>
  )
}
