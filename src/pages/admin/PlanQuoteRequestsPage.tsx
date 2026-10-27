import { useState } from 'react'
import { CheckCircle, Clock, Inbox, MessageCircle, XCircle } from 'lucide-react'
import { usePlanQuoteRequests, useUpdatePlanQuoteRequest } from '@/hooks/usePlanQuoteRequests'
import { formatDate } from '@/lib/constants'
import { ListCard, ListPageLayout } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { PlanQuoteRequest, PlanQuoteRequestStatus } from '@/types/api'

const STATUS_FILTERS: { value: PlanQuoteRequestStatus | 'ALL'; label: string }[] = [
  { value: 'NEW', label: 'Nuevas' },
  { value: 'CONTACTED', label: 'Contactadas' },
  { value: 'CLOSED', label: 'Cerradas' },
  { value: 'ALL', label: 'Todas' },
]

function QuoteStatusBadge({ status }: { status: PlanQuoteRequestStatus }) {
  if (status === 'CONTACTED') {
    return (
      <Badge variant="outline" className="border-info/20 bg-info/10 text-info">
        <MailIcon />
        Contactada
      </Badge>
    )
  }
  if (status === 'CLOSED') {
    return (
      <Badge variant="outline" className="border-border bg-surface-muted text-muted-foreground">
        <CheckCircle className="mr-1 h-3 w-3 shrink-0" />
        Cerrada
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning">
      <Clock className="mr-1 h-3 w-3 shrink-0" />
      Nueva
    </Badge>
  )
}

function MailIcon() {
  return <MessageCircle className="mr-1 h-3 w-3 shrink-0" />
}

function whatsappUrl(request: PlanQuoteRequest): string {
  const phone = (request.phone || '').replace(/\D/g, '')
  const message = `Hola ${request.name}, te escribimos de A|R SYSTEM por tu solicitud de cotización.`
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function PlanQuoteRequestsPage() {
  const [status, setStatus] = useState<PlanQuoteRequestStatus | 'ALL'>('NEW')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PlanQuoteRequest | null>(null)
  const [notes, setNotes] = useState('')
  const { data, isLoading } = usePlanQuoteRequests(status)
  const updateMutation = useUpdatePlanQuoteRequest()
  const requests = data?.requests ?? []
  const searchLower = search.trim().toLowerCase()
  const filtered = searchLower
    ? requests.filter((request) =>
        [request.name, request.organizationName, request.email]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchLower)),
      )
    : requests

  const closeSheet = () => {
    setSelected(null)
    setNotes('')
  }

  const updateSelected = async (nextStatus: 'CONTACTED' | 'CLOSED') => {
    if (!selected) return
    try {
      await updateMutation.mutateAsync({
        id: selected.id,
        data: { status: nextStatus, reviewNotes: notes.trim() || undefined },
      })
      closeSheet()
    } catch {
      // toast handled in hook
    }
  }

  return (
    <>
      <ListPageLayout
        title="Cotizaciones"
        description="Solicitudes del plan A medida enviadas desde /planes."
        searchProps={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar por nombre, organización o correo...',
        }}
        filters={
          <>
            {STATUS_FILTERS.map((filter) => (
              <FilterPill
                key={filter.value}
                active={status === filter.value}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </FilterPill>
            ))}
          </>
        }
        isLoading={isLoading}
        isEmpty={!isLoading && filtered.length === 0}
        emptyIcon={<Inbox className="h-16 w-16 text-subtle-foreground" />}
        emptyTitle="Sin solicitudes"
        emptyDescription={
          status === 'NEW'
            ? 'No hay solicitudes nuevas de cotización.'
            : 'No encontramos solicitudes con ese estado.'
        }
      >
        <div className="space-y-3">
          {filtered.map((request) => (
            <ListCard key={request.id} onClick={() => setSelected(request)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {request.organizationName || request.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                    {request.name} · {request.email}
                  </p>
                </div>
                <QuoteStatusBadge status={request.status} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{request.estimatedClients} clientes estimados</span>
                <span>{formatDate(request.createdAt)}</span>
              </div>
            </ListCard>
          ))}
        </div>
      </ListPageLayout>

      <Sheet open={!!selected} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Solicitud de cotización</SheetTitle>
                <SheetDescription>
                  {selected.organizationName || selected.name}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-4">
                <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-4 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Nombre</span>
                    <span className="font-semibold">{selected.name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Correo</span>
                    <span className="break-all text-right font-medium">{selected.email}</span>
                  </div>
                  {selected.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">WhatsApp</span>
                      <span className="font-medium">{selected.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Clientes estimados</span>
                    <span className="font-semibold">{selected.estimatedClients}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Recibida</span>
                    <span className="font-medium">{formatDate(selected.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Estado</span>
                    <QuoteStatusBadge status={selected.status} />
                  </div>
                </div>

                {selected.message && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Mensaje</p>
                    <p className="whitespace-pre-wrap rounded-xl border border-border-subtle bg-surface-muted p-4 text-sm text-muted-foreground">
                      {selected.message}
                    </p>
                  </div>
                )}

                {selected.status === 'CLOSED' ? (
                  <div className="rounded-xl border border-border-subtle bg-surface-muted p-4 text-sm">
                    <p className="flex items-center gap-1 font-semibold">
                      <XCircle className="h-4 w-4" />
                      Cerrada
                      {selected.handledAt ? ` · ${formatDate(selected.handledAt)}` : ''}
                    </p>
                    {selected.reviewNotes && (
                      <p className="mt-1 text-muted-foreground">Nota: {selected.reviewNotes}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="quote-review-notes">Notas de revisión</Label>
                    <Input
                      id="quote-review-notes"
                      value={notes || selected.reviewNotes || ''}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Ej: contactado por WhatsApp el 27/10"
                    />
                  </div>
                )}
              </div>

              <SheetFooter className="border-t border-border pt-4">
                <div className="flex w-full flex-col gap-2">
                  <Button asChild variant="outline" className="h-11 w-full">
                    <a href={whatsappUrl(selected)} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Abrir WhatsApp
                    </a>
                  </Button>
                  {selected.status !== 'CLOSED' && (
                    <div className="flex w-full gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 flex-1"
                        onClick={() => updateSelected('CLOSED')}
                        disabled={updateMutation.isPending}
                      >
                        Cerrar
                      </Button>
                      {selected.status === 'NEW' && (
                        <Button
                          type="button"
                          className="h-11 flex-1"
                          onClick={() => updateSelected('CONTACTED')}
                          disabled={updateMutation.isPending}
                        >
                          Marcar contactada
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
