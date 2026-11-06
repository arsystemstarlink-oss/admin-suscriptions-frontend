import { Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/guards/AuthGuard'
import { RoleGuard } from '@/guards/RoleGuard'
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout'
import { SettingsLayout } from '@/components/layout/SettingsLayout'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RouteErrorPage } from '@/pages/RouteErrorPage'
import { RootRedirect } from '@/routes/RootRedirect'
import { RouteTitle } from '@/routes/RouteTitle'
import {
  LegacyClientEditRedirect,
  LegacyClientRedirect,
  LegacyPlanRedirect,
} from '@/routes/LegacyRedirects'
import {
  LoginPage,
  InvitePage,
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
  PaymentsLayout,
  ProfilePage,
  AdminsPage,
  OrganizationsPage,
  SetupPage,
  ChatsPage,
  ConsultaPage,
  PlansPage,
  PlansSignupPage,
  PaymentReportsPage,
  OrganizationPlanReportsPage,
  PlanQuoteRequestsPage,
  PageLoader,
} from '@/routes/lazy-pages'

export const router = createBrowserRouter(
  [
  {
  element: <RouteTitle />,
  errorElement: <RouteErrorPage />,
  children: [
  {
    path: '/login',
    handle: { title: 'Iniciar sesión' },
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/invite/:token',
    handle: { title: 'Invitación' },
    element: (
      <Suspense fallback={<PageLoader />}>
        <InvitePage />
      </Suspense>
    ),
  },
  {
    path: '/setup',
    handle: { title: 'Configuración inicial' },
    element: (
      <Suspense fallback={<PageLoader />}>
        <SetupPage />
      </Suspense>
    ),
  },
  {
    path: '/planes',
    handle: { title: 'Planes' },
    element: (
      <Suspense fallback={<PageLoader />}>
        <PlansPage />
      </Suspense>
    ),
  },
  {
    path: '/planes/solicitar',
    handle: { title: 'Solicitar plan' },
    element: (
      <Suspense fallback={<PageLoader />}>
        <PlansSignupPage />
      </Suspense>
    ),
  },
  {
    path: '/consulta/:orgSlug',
    handle: { title: 'Consulta' },
    element: (
      <Suspense fallback={<PageLoader />}>
        <ConsultaPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    element: (
      <AuthGuard>
        <AuthenticatedLayout />
      </AuthGuard>
    ),
    children: [
      {
        path: 'dashboard',
        handle: { title: 'Inicio' },
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
            handle: { title: 'Suscripciones' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionsListPage />
              </Suspense>
            ),
          },
          {
            path: 'new',
            handle: { title: 'Nueva suscripción' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionFormPage />
              </Suspense>
            ),
          },
          {
            path: ':id',
            handle: { title: 'Suscripción' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionDetailPage />
              </Suspense>
            ),
          },
          {
            path: ':id/edit',
            handle: { title: 'Editar suscripción' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionEditPage />
              </Suspense>
            ),
          },
          {
            path: 'clients',
            handle: { title: 'Clientes' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientsListPage />
              </Suspense>
            ),
          },
          {
            path: 'clients/new',
            handle: { title: 'Nuevo cliente' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientFormPage />
              </Suspense>
            ),
          },
          {
            path: 'clients/:id',
            handle: { title: 'Cliente' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientDetailPage />
              </Suspense>
            ),
          },
          {
            path: 'clients/:id/edit',
            handle: { title: 'Editar cliente' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <ClientFormPage />
              </Suspense>
            ),
          },
          {
            path: 'plans',
            handle: { title: 'Planes' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <PlansListPage />
              </Suspense>
            ),
          },
          {
            path: 'plans/new',
            handle: { title: 'Nuevo plan' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <PlanFormPage />
              </Suspense>
            ),
          },
          {
            path: 'plans/:id/edit',
            handle: { title: 'Editar plan' },
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
              <Navigate to="/config/profile" replace />
            ),
          },
          {
            path: 'tasks',
            handle: { title: 'Tareas automáticas' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminToolsPage />
              </Suspense>
            ),
          },
          {
            path: 'profile',
            handle: { title: 'Perfil' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            ),
          },
          {
            path: 'notifications',
            element: <Navigate to="/config/profile" replace />,
          },
          {
            path: 'admins',
            handle: { title: 'Administradores' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <AdminsPage />
              </Suspense>
            ),
          },
          {
            path: 'organizations',
            handle: { title: 'Organizaciones' },
            element: (
              <RoleGuard allowedRoles={['super-admin']}>
                <Suspense fallback={<PageLoader />}>
                  <OrganizationsPage />
                </Suspense>
              </RoleGuard>
            ),
          },
          {
            path: 'plan-payments',
            element: <Navigate to="/payment-reports/plans" replace />,
          },
          {
            path: 'plan-quote-requests',
            handle: { title: 'Cotizaciones' },
            element: (
              <RoleGuard allowedRoles={['super-admin']}>
                <Suspense fallback={<PageLoader />}>
                  <PlanQuoteRequestsPage />
                </Suspense>
              </RoleGuard>
            ),
          },
        ],
      },
      {
        path: 'chats',
        handle: { title: 'Chats' },
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChatsPage />
          </Suspense>
        ),
      },
      {
        path: 'payment-reports',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PaymentsLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            handle: { title: 'Cobros de clientes' },
            element: (
              <Suspense fallback={<PageLoader />}>
                <PaymentReportsPage />
              </Suspense>
            ),
          },
          {
            path: 'plans',
            handle: { title: 'Pagos de planes' },
            element: (
              <RoleGuard allowedRoles={['super-admin']}>
                <Suspense fallback={<PageLoader />}>
                  <OrganizationPlanReportsPage />
                </Suspense>
              </RoleGuard>
            ),
          },
        ],
      },
      {
        path: 'clients',
        element: <Navigate to="/subscriptions/clients" replace />,
      },
      {
        path: 'clients/new',
        element: <Navigate to="/subscriptions/clients/new" replace />,
      },
      {
        path: 'clients/:id/edit',
        element: <LegacyClientEditRedirect />,
      },
      {
        path: 'clients/:id',
        element: <LegacyClientRedirect />,
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
        path: 'plans/new',
        element: <Navigate to="/subscriptions/plans/new" replace />,
      },
      {
        path: 'plans/:id/edit',
        element: <LegacyPlanRedirect />,
      },
      {
        path: 'plans/:id',
        element: <LegacyPlanRedirect />,
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
    handle: { title: 'Página no encontrada' },
    element: <NotFoundPage />,
  },
  ],
  },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
