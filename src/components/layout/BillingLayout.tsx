import { Outlet } from 'react-router-dom'
import { PageSubNav, type PageSubNavTab } from '@/components/layout/PageSubNav'
import { useUIStore } from '@/stores/ui.store'
import { Zap, CheckCircle2, FileText } from 'lucide-react'

const TITLE = 'Centro de Cobranzas'
const SUBTITLE = 'Gestión inteligente de pagos y facturación'

export function BillingLayout() {
  const actionCount = useUIStore((s) => s.billingActionCount)

  const tabs: PageSubNavTab[] = [
    { to: '/billing/action', icon: Zap, label: 'Acción Requerida', end: false, badge: actionCount },
    { to: '/billing/paid', icon: CheckCircle2, label: 'Pagados', end: false },
    { to: '/billing/all', icon: FileText, label: 'Todos', end: false },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <PageSubNav tabs={tabs} title={TITLE} subtitle={SUBTITLE} />
      <Outlet />
    </div>
  )
}
