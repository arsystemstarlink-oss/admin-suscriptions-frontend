import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, useSearchParams } from 'react-router-dom'
import { AuthGuard } from '@/guards/AuthGuard'
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'

const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ClientsListPage = lazy(() => import('@/pages/clients/ClientsListPage').then(m => ({ default: m.ClientsListPage })))
const ClientDetailPage = lazy(() => import('@/pages/clients/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })))
const ClientFormPage = lazy(() => import('@/pages/clients/ClientFormPage').then(m => ({ default: m.ClientFormPage })))
const PlansListPage = lazy(() => import('@/pages/plans/PlansListPage').then(m => ({ default: m.PlansListPage })))
const PlanFormPage = lazy(() => import('@/pages/plans/PlanFormPage').then(m => ({ default: m.PlanFormPage })))
const SubscriptionsListPage = lazy(() => import('@/pages/subscriptions/SubscriptionsListPage').then(m => ({ default: m.SubscriptionsListPage })))
const SubscriptionDetailPage = lazy(() => import('@/pages/subscriptions/SubscriptionDetailPage').then(m => ({ default: m.SubscriptionDetailPage })))
const SubscriptionFormPage = lazy(() => import('@/pages/subscriptions/SubscriptionFormPage').then(m => ({ default: m.SubscriptionFormPage })))
const SubscriptionEditPage = lazy(() => import('@/pages/subscriptions/SubscriptionEditPage').then(m => ({ default: m.SubscriptionEditPage })))
const BillingPeriodsPage = lazy(() => import('@/pages/billing/BillingPeriodsPage').then(m => ({ default: m.BillingPeriodsPage })))
const BillingLayout = lazy(() => import('@/components/layout/BillingLayout').then(m => ({ default: m.BillingLayout })))
const SubscriptionsLayout = lazy(() => import('@/components/layout/SubscriptionsLayout').then(m => ({ default: m.SubscriptionsLayout })))
const AdminToolsPage = lazy(() => import('@/pages/admin/AdminToolsPage').then(m => ({ default: m.AdminToolsPage })))
const ProfilePage = lazy(() => import('@/pages/admin/ProfilePage').then(m => ({ default: m.ProfilePage })))
const AdminsPage = lazy(() => import('@/pages/admin/AdminsPage').then(m => ({ default: m.AdminsPage })))
const SetupPage = lazy(() => import('@/pages/admin/SetupPage').then(m => ({ default: m.SetupPage })))
const ChatsPage = lazy(() => import('@/pages/chats/ChatsPage').then(m => ({ default: m.ChatsPage })))

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
}

function BillingIndexRedirect() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status')
  return <Navigate to={status === 'PAID' ? '/billing/paid' : '/billing/action'} replace />
}

export const router = createBrowserRouter(
  [
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/setup',
    element: (
      <Suspense fallback={<PageLoader />}>
        <SetupPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        <AuthenticatedLayout />
      </AuthGuard>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'subscriptions',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SubscriptionsLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionsListPage />
              </Suspense>
            ),
          },
          {
            path: 'new',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionFormPage />
              </Suspense>
            ),
          },
          {
            path: ':id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionDetailPage />
              </Suspense>
            ),
          },
          {
            path: ':id/edit',
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionEditPage />
              </Suspense>
            ),
          },
          {
            path: 'clients',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientsListPage />
              </Suspense>
            ),
          },
          {
            path: 'clients/new',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientFormPage />
              </Suspense>
            ),
          },
          {
            path: 'clients/:id',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'clients/:id/edit',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientFormPage />
              </Suspense>
            ),
          },
          {
            path: 'plans',
            element: (
              <Suspense fallback={<PageLoader />}>
                <PlansListPage />
              </Suspense>
            ),
          },
          {
            path: 'plans/new',
            element: (
              <Suspense fallback={<PageLoader />}>
                <PlanFormPage />
              </Suspense>
            ),
          },
          {
            path: 'plans/:id/edit',
            element: (
              <Suspense fallback={<PageLoader />}>
                <PlanFormPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'billing',
        element: (
          <Suspense fallback={<PageLoader />}>
            <BillingLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: <BillingIndexRedirect />,
          },
          {
            path: 'action',
            element: (
              <Suspense fallback={<PageLoader />}>
                <BillingPeriodsPage view="action" />
              </Suspense>
            ),
          },
          {
            path: 'paid',
            element: (
              <Suspense fallback={<PageLoader />}>
                <BillingPeriodsPage view="paid" />
              </Suspense>
            ),
          },
          {
            path: 'all',
            element: (
              <Suspense fallback={<PageLoader />}>
                <BillingPeriodsPage view="all" />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'config',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminToolsPage />
              </Suspense>
            ),
          },
          {
            path: 'profile',
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            ),
          },
          {
            path: 'admins',
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminsPage />
              </Suspense>
            ),
          },
        ],
      },
      {
        path: 'chats',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChatsPage />
          </Suspense>
        ),
      },
      {
        path: 'clients',
        element: <Navigate to="/subscriptions/clients" replace />,
      },
      {
        path: 'clients/*',
        element: <Navigate to="/subscriptions/clients" replace />,
      },
      {
        path: 'plans',
        element: <Navigate to="/subscriptions/plans" replace />,
      },
      {
        path: 'plans/*',
        element: <Navigate to="/subscriptions/plans" replace />,
      },
      {
        path: 'config/clients',
        element: <Navigate to="/subscriptions/clients" replace />,
      },
      {
        path: 'config/clients/*',
        element: <Navigate to="/subscriptions/clients" replace />,
      },
      {
        path: 'config/plans',
        element: <Navigate to="/subscriptions/plans" replace />,
      },
      {
        path: 'config/plans/*',
        element: <Navigate to="/subscriptions/plans" replace />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
