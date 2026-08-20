import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/guards/AuthGuard'
import { RoleGuard } from '@/guards/RoleGuard'
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import {
  LoginPage,
  DashboardPage,
  ClientsListPage,
  ClientDetailPage,
  ClientFormPage,
  PlansListPage,
  PlanFormPage,
  SubscriptionsListPage,
  SubscriptionDetailPage,
  SubscriptionFormPage,
  SubscriptionEditPage,
  AdminToolsPage,
  SubscriptionsLayout,
  ProfilePage,
  NotificationsPage,
  AdminsPage,
  OrganizationsPage,
  SetupPage,
  ChatsPage,
  PageLoader,
} from '@/routes/lazy-pages'

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
            path: 'notifications',
            element: (
              <Suspense fallback={<PageLoader />}>
                <NotificationsPage />
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
          {
            path: 'organizations',
            element: (
              <RoleGuard allowedRoles={['super-admin']}>
                <Suspense fallback={<PageLoader />}>
                  <OrganizationsPage />
                </Suspense>
              </RoleGuard>
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
