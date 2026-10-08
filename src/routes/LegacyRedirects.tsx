import { Navigate, useParams } from 'react-router-dom'

export function LegacyClientRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/subscriptions/clients/${id}`} replace />
}

export function LegacyClientEditRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/subscriptions/clients/${id}/edit`} replace />
}

export function LegacyPlanRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/subscriptions/plans/${id}/edit`} replace />
}
