import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useTokenRefresh } from '@/hooks/useTokenRefresh'
import { OmniSearch } from '@/components/command/OmniSearch'
import { QuickPayModal } from '@/components/payment/QuickPayModal'

export function AuthenticatedLayout() {
  useTokenRefresh()
  const [collapsed, setCollapsed] = useState(false)
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
          onToggleSidebar={() => setCollapsed(!collapsed)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <OmniSearch />
      <QuickPayModal />
    </div>
  )
}
