import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Building2, Edit, ExternalLink, Link2, MessageCircle, ReceiptText, Trash2, Users } from 'lucide-react'
import { useOrganizationDetail, useDeleteOrganization } from '@/hooks/useOrganizations'
import { useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import { useOrganizationStore } from '@/stores/organization.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog, DetailNav, ErrorState, DetailSkeleton } from '@/components/design-system'
import { EditOrganizationSheet } from '@/components/organizations/EditOrganizationSheet'
import { OrganizationPlanPaymentSheet } from '@/components/organizations/OrganizationPlanPaymentSheet'
import { OrganizationAdminsSection } from '@/components/organizations/OrganizationAdminsSection'
import { formatDate, ORGANIZATION_PLAN_STATUS_LABELS } from '@/lib/constants'
import { getPlanAdminLimit, getPlanLabel } from '@/lib/business-plan-catalog'

export function OrganizationDetailPage() {
  const { organizationId = '' } = useParams<{ organizationId: string }>()
  const navigate = useNavigate()
  const setOrganization = useOrganizationStore((state) => state.setOrganization)
  const { data, isLoading, isError, refetch, isFetching } = useOrganizationDetail(organizationId)
  const { data: catalogData } = useBusinessPlans()
  const [editing, setEditing] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useDeleteOrganization()

  useEffect(() => {
    if (organizationId) setOrganization(organizationId)
  }, [organizationId, setOrganization])

  if (isLoading) return <DetailSkeleton label="Cargando organización" stats={3} sections={2} />

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <DetailNav backTo="/config/organization" backLabel="Volver a organizaciones" />
        <ErrorState title="No se pudo cargar la organización" onRetry={() => void refetch()} isRetrying={isFetching} />
      </div>
    )
  }

  const { organization, users } = data
  const planLabel = organization.plan ? getPlanLabel(catalogData?.plans, organization.plan) : 'Pendiente'
  const planStatus = organization.planStatus ? ORGANIZATION_PLAN_STATUS_LABELS[organization.planStatus] : 'Pendiente'
  const adminLimit = getPlanAdminLimit(catalogData?.plans, organization.plan ?? 'basico')
  const consultationUrl = organization.slug
    ? `${window.location.origin}${import.meta.env.BASE_URL}consulta/${organization.slug}`
    : null

  const copyLink = async () => {
    if (!consultationUrl) return
    try {
      await navigator.clipboard.writeText(consultationUrl)
    } catch {
      window.prompt('Copia el enlace de consulta:', consultationUrl)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DetailNav
        backTo="/config/organization"
        backLabel="Volver a organizaciones"
        title={<span className="truncate text-sm font-semibold">{organization.name}</span>}
        actions={
          <>
            <Button variant="outline" size="icon" onClick={() => setEditing(true)} title="Editar organización" aria-label="Editar organización">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setDeleteOpen(true)} title="Eliminar organización" aria-label="Eliminar organización">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader className="bg-surface-muted/50 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <CardTitle className="truncate text-xl">{organization.name}</CardTitle>
                <p className="mt-1 truncate text-sm text-muted-foreground">{organization.slug || 'Sin slug configurado'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={organization.active ? 'text-success bg-success/10 border-success/20' : 'text-destructive bg-destructive/10 border-destructive/20'}>
                {organization.active ? 'Activa' : 'Inactiva'}
              </Badge>
              <Badge variant="outline">Plan {planLabel} · {planStatus}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6">
          <div><p className="text-xs text-muted-foreground">Clientes</p><p className="mt-1 text-lg font-semibold">{organization.clientCount ?? '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Límite del plan</p><p className="mt-1 text-lg font-semibold">{organization.clientLimit ?? 'A medida'}</p></div>
          <div><p className="text-xs text-muted-foreground">Creada</p><p className="mt-1 text-lg font-semibold">{formatDate(organization.createdAt)}</p></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <Card>
          <CardHeader><CardTitle className="text-base">Administración</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline" className="justify-between">
              <Link to="/config/organization/whatsapp"><span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Configurar WhatsApp</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link to="/config/organization/tasks"><span className="flex items-center gap-2"><Users className="h-4 w-4" /> Tareas automáticas</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button variant="outline" className="justify-between" onClick={() => setPaymentOpen(true)}><span className="flex items-center gap-2"><ReceiptText className="h-4 w-4" /> Registrar pago</span><ArrowRight className="h-4 w-4" /></Button>
            {consultationUrl && <Button variant="outline" className="justify-between" onClick={() => void copyLink()}><span className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Copiar enlace público</span><ExternalLink className="h-4 w-4" /></Button>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{users.length} {users.length === 1 ? 'administrador registrado' : 'administradores registrados'}.</p>
            <p>{organization.planExpiresAt ? `Vencimiento del plan: ${formatDate(organization.planExpiresAt)}.` : 'Sin vencimiento de plan registrado.'}</p>
            {organization.slug && <a className="inline-flex items-center gap-1 font-medium text-primary hover:underline" href={consultationUrl ?? '#'} target="_blank" rel="noreferrer">Abrir consulta pública <ExternalLink className="h-3 w-3" /></a>}
          </CardContent>
        </Card>
      </div>

      {adminLimit !== null && <Card><CardContent className="p-4 sm:p-6"><OrganizationAdminsSection organizationId={organization.id} organizationName={organization.name} organizationActive={organization.active} adminLimit={adminLimit} /></CardContent></Card>}

      <EditOrganizationSheet organization={organization} open={editing} onOpenChange={setEditing} />
      <OrganizationPlanPaymentSheet organization={organization} open={paymentOpen} onOpenChange={setPaymentOpen} />
      <ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Eliminar organización" description={`Se eliminará ${organization.name} y todos sus datos. Esta acción es irreversible.`} confirmLabel="Eliminar organización" pendingLabel="Eliminando..." isPending={deleteMutation.isPending} destructive onConfirm={() => deleteMutation.mutate(organization.id, { onSuccess: () => navigate('/config/organization') })} />
    </div>
  )
}
