import { lazy } from 'react'

export const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
export const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
export const ClientsListPage = lazy(() => import('@/pages/clients/ClientsListPage').then(m => ({ default: m.ClientsListPage })))
export const ClientDetailPage = lazy(() => import('@/pages/clients/ClientDetailPage').then(m => ({ default: m.ClientDetailPage })))
export const ClientFormPage = lazy(() => import('@/pages/clients/ClientFormPage').then(m => ({ default: m.ClientFormPage })))
export const PlansListPage = lazy(() => import('@/pages/plans/PlansListPage').then(m => ({ default: m.PlansListPage })))
export const PlanFormPage = lazy(() => import('@/pages/plans/PlanFormPage').then(m => ({ default: m.PlanFormPage })))
export const SubscriptionsListPage = lazy(() => import('@/pages/subscriptions/SubscriptionsListPage').then(m => ({ default: m.SubscriptionsListPage })))
export const SubscriptionDetailPage = lazy(() => import('@/pages/subscriptions/SubscriptionDetailPage').then(m => ({ default: m.SubscriptionDetailPage })))
export const SubscriptionFormPage = lazy(() => import('@/pages/subscriptions/SubscriptionFormPage').then(m => ({ default: m.SubscriptionFormPage })))
export const SubscriptionEditPage = lazy(() => import('@/pages/subscriptions/SubscriptionEditPage').then(m => ({ default: m.SubscriptionEditPage })))
export const AdminToolsPage = lazy(() => import('@/pages/admin/AdminToolsPage').then(m => ({ default: m.AdminToolsPage })))
export const SubscriptionsLayout = lazy(() => import('@/components/layout/SubscriptionsLayout').then(m => ({ default: m.SubscriptionsLayout })))
export const ProfilePage = lazy(() => import('@/pages/admin/ProfilePage').then(m => ({ default: m.ProfilePage })))
export const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage').then(m => ({ default: m.NotificationsPage })))
export const AdminsPage = lazy(() => import('@/pages/admin/AdminsPage').then(m => ({ default: m.AdminsPage })))
export const OrganizationsPage = lazy(() => import('@/pages/admin/OrganizationsPage').then(m => ({ default: m.OrganizationsPage })))
export const SetupPage = lazy(() => import('@/pages/admin/SetupPage').then(m => ({ default: m.SetupPage })))
export const ChatsPage = lazy(() => import('@/pages/chats/ChatsPage').then(m => ({ default: m.ChatsPage })))

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  )
}
