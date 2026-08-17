import { Outlet } from 'react-router-dom'
import { PageSubNav, type PageSubNavTab } from '@/components/layout/PageSubNav'
import { Link2, Users, Package } from 'lucide-react'

const tabs: PageSubNavTab[] = [
  {
    to: '/subscriptions',
    icon: Link2,
    label: 'Suscripciones',
    title: 'Suscripciones',
    subtitle: 'Gestión de suscripciones de clientes',
    end: true,
  },
  {
    to: '/subscriptions/clients',
    icon: Users,
    label: 'Clientes',
    title: 'Clientes',
    subtitle: 'Gestión de clientes del sistema',
    end: false,
  },
  {
    to: '/subscriptions/plans',
    icon: Package,
    label: 'Planes',
    title: 'Planes',
    subtitle: 'Catálogo de planes de suscripción',
    end: false,
  },
]

export function SubscriptionsLayout() {
  return (
    <div className="space-y-4 md:space-y-6">
      <PageSubNav tabs={tabs} />
      <Outlet />
    </div>
  )
}
