import { useState, useEffect, useRef, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { OmniSearch } from '@/components/command/OmniSearch'
import { QuickPayModal } from '@/components/payment/QuickPayModal'
import MobileAppShell from './MobileAppShell'
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

  const { data: organizationsData, isLoading: organizationsLoading, isError: organizationsError, refetch: refetchOrganizations } = useOrganizations(
    { limit: 100 },
    { enabled: isSuperAdmin },
  )
  const allOrganizations = useMemo(
    () => organizationsData?.organizations || [],
    [organizationsData],
  )
  // Tolerante: si algún documento legacy no trae `active`, se trata como activa
  // para no ocultar el selector. Solo se excluyen las explícitamente inactivas.
  const organizations = useMemo(
    () => allOrganizations.filter((org) => org.active !== false),
    [allOrganizations],
  )

  // El super-admin no tiene organización propia: si el ID guardado en
  // localStorage ya no existe en el backend (dato stale de otro entorno),
  // se limpia para no pedir datos con un ID fantasma. Solo se valida cuando
  // se tiene la lista completa (paginación total) para no borrar un ID válido
  // que quedó fuera de la primera página.
  useEffect(() => {
    if (!isSuperAdmin || !selectedOrganizationId || !organizationsData) return
    const total = organizationsData.pagination?.total ?? allOrganizations.length
    if (allOrganizations.length < total) return
    if (!allOrganizations.some((org) => org.id === selectedOrganizationId)) {
      setOrganization(null)
    }
  }, [isSuperAdmin, selectedOrganizationId, organizationsData, allOrganizations, setOrganization])

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

  const isChatsPage = location.pathname.startsWith('/chats')
  useTokenRefresh()

  if (isMobile) {
    return (
      <>
        <MobileAppShell
          isSuperAdmin={isSuperAdmin}
          organizations={organizations}
          organizationsLoading={organizationsLoading}
          organizationsError={organizationsError}
          onRetryOrganizations={() => refetchOrganizations()}
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
        organizationsLoading={organizationsLoading}
        organizationsError={organizationsError}
        onRetryOrganizations={() => refetchOrganizations()}
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
