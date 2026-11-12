import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardCopy,
  LoaderCircle,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatLocalDate } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { qk } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import {
  useSendWhatsAppTestMessage,
  useSubmitMissingWhatsAppTemplates,
  useSubmitWhatsAppTemplate,
  useWhatsAppConnectionCheck,
  useWhatsAppFailures,
  useWhatsAppTemplates,
} from '@/hooks/useOrganizations'
import type { OrganizationWhatsAppConfig, WhatsAppTemplateState } from '@/types/api'

type Tone = 'success' | 'warning' | 'destructive' | 'muted'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
  muted: 'border-border bg-surface-muted text-muted-foreground',
}

function Notice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'destructive' ? XCircle : AlertTriangle
  return (
    <div className={cn('flex items-start gap-2 rounded-md border p-3 text-sm', TONE_CLASSES[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function StepHeading({ step, title, description }: { step?: number; title: string; description: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-foreground">
        {step !== undefined && <span className="text-muted-foreground">{step}. </span>}
        {title}
      </h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export function WhatsAppConnectionStatus({ organizationId }: { organizationId: string }) {
  const check = useWhatsAppConnectionCheck(organizationId)

  if (check.isLoading) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Comprobando la conexión con Twilio...
      </p>
    )
  }
  if (check.isError || !check.data) {
    return <Notice tone="warning">No se pudo comprobar la conexión.</Notice>
  }
  if (check.data.status === 'not_configured') return null

  const tone: Tone =
    check.data.status === 'ok' ? 'success' : check.data.status === 'invalid_credentials' ? 'destructive' : 'warning'
  return (
    <Notice tone={tone}>
      <p>{check.data.message}</p>
      <button
        type="button"
        className="mt-1 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
        disabled={check.isFetching}
        onClick={() => check.refetch()}
      >
        <RefreshCw className={cn('h-3 w-3', check.isFetching && 'animate-spin')} />
        Comprobar de nuevo
      </button>
    </Notice>
  )
}

const REQUEST_BADGES = {
  active: { label: 'Activa', tone: 'success', Icon: CheckCircle2 },
  pending: { label: 'En revisión', tone: 'warning', Icon: Clock },
  rejected: { label: 'Rechazada', tone: 'destructive', Icon: XCircle },
  blocked: { label: 'Pausada por WhatsApp', tone: 'destructive', Icon: AlertTriangle },
  none: { label: 'Sin solicitar', tone: 'muted', Icon: Clock },
} as const

function getTemplateDisplayStatus(template: WhatsAppTemplateState): keyof typeof REQUEST_BADGES {
  const status = template.request?.status
  if (status === 'pending' || status === 'rejected' || status === 'blocked') return status
  return template.activeContentSid ? 'active' : 'none'
}

function TemplateCard({
  template,
  organizationId,
  twilioReady,
}: {
  template: WhatsAppTemplateState
  organizationId: string
  twilioReady: boolean
}) {
  const submit = useSubmitWhatsAppTemplate()
  const displayStatus = getTemplateDisplayStatus(template)
  const badge = REQUEST_BADGES[displayStatus]
  const [body, setBody] = useState(template.request?.body ?? template.defaultBody)
  const [editing, setEditing] = useState(false)
  const textareaId = `whatsapp-template-${organizationId}-${template.key}`

  const pending = displayStatus === 'pending'
  const showEditor = !pending && (editing || displayStatus !== 'active')

  const requestApproval = () => {
    submit.mutate(
      { id: organizationId, key: template.key, body },
      { onSuccess: () => setEditing(false) },
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{template.label}</span>
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', TONE_CLASSES[badge.tone])}>
          <badge.Icon className="h-3 w-3" />
          {badge.label}
        </span>
      </div>

      {pending && (
        <>
          <p className="rounded-md bg-surface-muted p-2 text-sm text-foreground">{template.request?.body}</p>
          <p className="text-xs text-muted-foreground">
            Se activará sola cuando WhatsApp la apruebe. No tienes que copiar nada.
            {template.activeContentSid && ' Mientras tanto se sigue usando la plantilla actual.'}
          </p>
        </>
      )}

      {displayStatus === 'rejected' && (
        <p className="text-xs text-destructive">
          {template.request?.rejectionReason
            ? `Motivo de WhatsApp: ${template.request.rejectionReason}`
            : 'WhatsApp no indicó el motivo.'}{' '}
          Ajusta el texto y vuelve a solicitarla.
          {template.activeContentSid && ' Mientras tanto se sigue usando la plantilla anterior.'}
        </p>
      )}

      {displayStatus === 'blocked' && (
        <p className="text-xs text-destructive">
          WhatsApp dejó de permitir esta plantilla. Ajusta el texto y solicita una nueva.
        </p>
      )}

      {showEditor && (
        <div className="space-y-2">
          <Label htmlFor={textareaId} className="sr-only">
            Texto de {template.label}
          </Label>
          <textarea
            id={textareaId}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            className="w-full resize-y rounded-md border border-input bg-surface-muted px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Conserva {template.variables.map((variable) => `${variable.placeholder} ${variable.description}`).join(', ')}.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={requestApproval}
              disabled={!twilioReady || submit.isPending || !body.trim()}
            >
              {submit.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Solicitar aprobación
            </Button>
            {editing && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}

      {displayStatus === 'active' && !editing && (
        <button
          type="button"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          onClick={() => setEditing(true)}
        >
          Cambiar el texto
        </button>
      )}
    </div>
  )
}

export function WhatsAppTemplatesStep({
  organizationId,
  twilioReady,
}: {
  organizationId: string
  twilioReady: boolean
}) {
  const queryClient = useQueryClient()
  const templates = useWhatsAppTemplates(organizationId)
  const submitMissing = useSubmitMissingWhatsAppTemplates()
  const missingCount =
    templates.data?.templates.filter((template) => getTemplateDisplayStatus(template) === 'none').length ?? 0

  // Una plantilla aprobada cambia los requisitos que muestra el resumen de arriba.
  const activeSignature = templates.data?.templates.map((template) => template.activeContentSid).join('|')
  const previousSignature = useRef(activeSignature)
  useEffect(() => {
    if (previousSignature.current !== undefined && previousSignature.current !== activeSignature) {
      queryClient.invalidateQueries({ queryKey: qk.organizations.whatsappConfig(organizationId) })
    }
    previousSignature.current = activeSignature
  }, [activeSignature, organizationId, queryClient])

  return (
    <div className="space-y-3">
      <StepHeading
        step={2}
        title="Plantillas"
        description="WhatsApp debe aprobar cada mensaje. Puedes ajustar el texto; la app lo envía a revisión por ti."
      />
      {!twilioReady && (
        <Notice tone="muted">Conecta primero tu cuenta de Twilio para poder solicitar la aprobación.</Notice>
      )}
      {templates.isLoading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando plantillas...
        </p>
      )}
      {templates.isError && (
        <div className="space-y-2">
          <Notice tone="destructive">No se pudieron cargar las plantillas.</Notice>
          <Button type="button" variant="outline" size="sm" onClick={() => templates.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {twilioReady && missingCount > 1 && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={submitMissing.isPending}
          onClick={() => submitMissing.mutate(organizationId)}
        >
          {submitMissing.isPending && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
          Solicitar las {missingCount} con el texto sugerido
        </Button>
      )}
      {templates.data?.templates.map((template) => (
        <TemplateCard
          key={template.key}
          template={template}
          organizationId={organizationId}
          twilioReady={twilioReady}
        />
      ))}
    </div>
  )
}

export function WhatsAppWebhooksStep({
  organizationId,
  webhooks,
}: {
  organizationId: string
  webhooks: OrganizationWhatsAppConfig['webhooks']
}) {
  const check = useWhatsAppConnectionCheck(organizationId)
  const connected = check.data?.inboundWebhookConnected

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('URL copiada.')
    } catch {
      toast.error('No se pudo copiar la URL. Revisa los permisos del portapapeles.')
    }
  }

  return (
    <div className="space-y-3">
      <StepHeading
        step={3}
        title="Recibir respuestas"
        description="Para que los mensajes de tus clientes lleguen a Chats. Los estados de entrega ya se configuran solos."
      />
      {webhooks ? (
        <>
          <div className="flex items-center gap-2">
            <Input readOnly aria-label="URL para mensajes entrantes" value={webhooks.inbound} />
            <Button type="button" variant="outline" onClick={() => copyUrl(webhooks.inbound)}>
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            En Twilio, abre tu número (Messaging › Senders › WhatsApp senders) y pega esta URL como webhook de
            mensajes entrantes, con método POST.
          </p>
          {connected === true && <Notice tone="success">Tu número ya usa esta URL.</Notice>}
          {connected === false && (
            <Notice tone="warning">
              Aún no vemos esta URL en tu número. Si la configuraste en un Messaging Service, puedes ignorar este
              aviso y comprobarlo respondiendo al mensaje de prueba.
            </Notice>
          )}
        </>
      ) : (
        <Notice tone="muted">
          Este servidor no tiene una dirección pública https. La URL aparecerá aquí cuando se configure.
        </Notice>
      )}
    </div>
  )
}

export function WhatsAppTestStep({ organizationId, disabled }: { organizationId: string; disabled: boolean }) {
  const send = useSendWhatsAppTestMessage()
  const [phone, setPhone] = useState('')
  const inputId = `whatsapp-test-phone-${organizationId}`

  return (
    <div className="space-y-3">
      <StepHeading
        step={4}
        title="Enviar una prueba"
        description="Recibirás una plantilla activa con datos de ejemplo. Twilio la cobra como un mensaje normal."
      />
      <div className="space-y-2">
        <Label htmlFor={inputId}>Tu número de WhatsApp</Label>
        <div className="flex items-center gap-2">
          <Input
            id={inputId}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+584123456789"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || send.isPending || !phone.trim()}
            onClick={() => send.mutate({ id: organizationId, to: phone.trim() })}
          >
            {send.isPending ? (
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar
          </Button>
        </div>
        {disabled && (
          <p className="text-xs text-muted-foreground">Necesitas al menos una plantilla activa para enviar la prueba.</p>
        )}
      </div>
    </div>
  )
}

export function WhatsAppFailuresSection({ organizationId }: { organizationId: string }) {
  const failures = useWhatsAppFailures(organizationId)

  return (
    <div className="space-y-3">
      <StepHeading title="Avisos que no salieron" description="Últimos 7 días, agrupados por causa." />
      {failures.isLoading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Revisando envíos...
        </p>
      )}
      {failures.isError && <Notice tone="warning">No se pudieron cargar los fallos de envío.</Notice>}
      {failures.data?.failures.length === 0 && (
        <p className="text-sm text-muted-foreground">Ningún fallo en los últimos 7 días.</p>
      )}
      {failures.data?.failures.map((failure) => (
        <Notice key={failure.message} tone="destructive">
          <p className="font-medium">
            {failure.count === 1 ? '1 aviso no salió' : `${failure.count} avisos no salieron`}: {failure.message}
          </p>
          <p className="mt-1 text-xs">
            Último el {formatLocalDate(failure.lastAt)} · {failure.recipients.join(', ')}
            {failure.count > failure.recipients.length && ' y otros'}
            {failure.errorCode ? ` · Código Twilio ${failure.errorCode}` : ''}
          </p>
        </Notice>
      ))}
    </div>
  )
}
