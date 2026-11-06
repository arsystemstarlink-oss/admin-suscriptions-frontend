import { Outlet } from 'react-router-dom'
import { ReceiptText, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/design-system/PageHeader'
import { PageSubNav, type PageSubNavTab } from '@/components/layout/PageSubNav'
import { usePendingCollectionsCount } from '@/hooks/usePendingCollectionsCount'
import { useIsSuperAdmin } from '@/stores/auth.store'

const CLIENT_REPORTS_TITLE = 'Cobros de clientes'
const CLIENT_REPORTS_SUBTITLE = 'Aprueba o rechaza los pagos reportados por los clientes desde el portal público.'

export function PaymentsLayout() {
  const isSuperAdmin = useIsSuperAdmin()
  const { clientReports, planReports } = usePendingCollectionsCount()

  const tabs: PageSubNavTab[] = [
    {
      to: '/payment-reports',
      icon: ReceiptText,
      label: CLIENT_REPORTS_TITLE,
      title: CLIENT_REPORTS_TITLE,
      subtitle: CLIENT_REPORTS_SUBTITLE,
      end: true,
      badge: clientReports,
    },
    {
      to: '/payment-reports/plans',
      icon: Wallet,
      label: 'Pagos de planes',
      title: 'Pagos de planes',
      subtitle: 'Aprueba o rechaza los pagos de plan reportados por los administradores.',
      end: false,
      badge: planReports,
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      {isSuperAdmin ? (
        <PageSubNav tabs={tabs} />
      ) : (
        <PageHeader title={CLIENT_REPORTS_TITLE} description={CLIENT_REPORTS_SUBTITLE} />
      )}
      <Outlet />
    </div>
  )
}
