import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'
import { OmniSearch } from '@/components/command/OmniSearch'
import { QuickPayModal } from '@/components/payment/QuickPayModal'

const SIDEBAR_STORAGE_KEY = 'sidebarCollapsed'

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  if (window.innerWidth < 1024) return true
  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
}

export function AuthenticatedLayout() {
  useTokenRefresh()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <TopBar
        isMobile={isMobile}
        onMobileToggle={() => setMobileOpen(!mobileOpen)}
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
          className="flex-1 overflow-auto p-4 md:p-6 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <Outlet />
        </main>
      </div>
      <OmniSearch />
      <QuickPayModal />
    </div>
  )
}
