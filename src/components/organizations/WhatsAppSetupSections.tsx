import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  ClipboardCopy,
  Link2,
  LoaderCircle,
  RefreshCw,
  Send,
  Smartphone,
  XCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatLocalDate, PLAN_USAGE_WARNING_PERCENT } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { qk } from '@/lib/query-keys'
import { cn } from '@/lib/utils'
import {
  buildTemplatePreview,
  describeTemplateUsage,
  getTemplateDisplayStatus,
  MAX_TEMPLATE_BODY_LENGTH,
  PLATFORM_WHATSAPP_ID,
  validateTemplateBody,
} from '@/lib/whatsapp-setup'
import { ConfirmDialog } from '@/components/design-system'
import {
  useConnectWhatsAppInboundWebhook,
  useSendWhatsAppTestMessage,
  useSubmitMissingWhatsAppTemplates,
  useSubmitWhatsAppTemplate,
  useWhatsAppConnectionCheck,
  useWhatsAppFailures,
  useWhatsAppTemplates,
} from '@/hooks/useOrganizations'
import type {
  OrganizationWhatsAppConfig,
  OrganizationWhatsAppRules,
  PlatformWhatsAppSummary,
  WhatsAppMode,
  WhatsAppTemplateState,
} from '@/types/api'

type Tone = 'success' | 'warning' | 'destructive' | 'muted'

const TONE_CLASSES: Record<Tone, string> = {
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  destructive: 'border-destructive/20 bg-destructive/10 text-destructive',
  muted: 'border-border bg-surface-muted text-muted-foreground',
}

export function Notice({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'destructive' ? XCircle : AlertTriangle
  return (
    <div className={cn('flex items-start gap-2 rounded-md border p-3 text-sm', TONE_CLASSES[tone])}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function StepHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

/** `loading` no muestra etiqueta: evita anunciar "Pendiente" antes de saberlo. */
export type SetupStepState = 'done' | 'todo' | 'attention' | 'waiting' | 'optional' | 'loading'

const STEP_STATE_BADGES: Record<Exclude<SetupStepState, 'loading'>, { label: string; tone: Tone }> = {
  done: { label: 'Listo', tone: 'success' },
  todo: { label: 'Pendiente', tone: 'warning' },
  attention: { label: 'Revisar', tone: 'destructive' },
  waiting: { label: 'En revisión', tone: 'warning' },
  optional: { label: 'Opcional', tone: 'muted' },
}

export function SetupStep({
  id,
  number,
  title,
  summary,
  state,
  open,
  onToggle,
  children,
}: {
  id: string
  number: number
  title: string
  summary: string
  state: SetupStepState
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const badge = state === 'loading' ? null : STEP_STATE_BADGES[state]
  return (
    <div className="rounded-xl border border-border bg-surface text-surface-foreground">
      <h4>
        <button
          type="button"
          id={`${id}-header`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold',
              state === 'done' ? TONE_CLASSES.success : TONE_CLASSES.muted,
            )}
          >
            {state === 'done' ? <Check className="h-4 w-4" /> : number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">{title}</span>
            <span className="block text-xs text-muted-foreground">{summary}</span>
          </span>
          {badge && (
            <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-xs', TONE_CLASSES[badge.tone])}>
              {badge.label}
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
          />
        </button>
      </h4>
      {/* Oculto en vez de desmontado: conserva lo que se estaba escribiendo al cambiar de paso. */}
      <div
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-header`}
        hidden={!open}
        className="space-y-4 border-t border-border p-3 sm:p-4"
      >
        {children}
      </div>
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

/** El mensaje como lo recibirá el cliente, con cada dato variable resaltado. */
function MessagePreview({
  body,
  variables,
  caption,
}: {
  body: string
  variables: WhatsAppTemplateState['variables']
  caption: string
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{caption}</p>
      <div className="rounded-xl border border-border-subtle bg-surface-muted p-3">
        <p className="w-fit max-w-full whitespace-pre-wrap wrap-break-word rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
          {buildTemplatePreview(body, variables).map((part, index) => (
            <span
              key={index}
              className={cn(
                part.isVariable && 'rounded bg-primary-foreground/20 px-1 font-medium',
                part.bold && 'font-bold',
              )}
            >
              {part.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  )
}

function TemplateCard({
  template,
  organizationId,
  twilioReady,
  rules,
}: {
  template: WhatsAppTemplateState
  organizationId: string
  twilioReady: boolean
  rules: OrganizationWhatsAppRules
}) {
  const submit = useSubmitWhatsAppTemplate()
  const displayStatus = getTemplateDisplayStatus(template)
  const badge = REQUEST_BADGES[displayStatus]
  const usage = describeTemplateUsage(template.key, rules)
  const [body, setBody] = useState(template.request?.body ?? template.defaultBody)
  const [editing, setEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaId = `whatsapp-template-${organizationId}-${template.key}`
  const errorId = `${textareaId}-error`

  const pending = displayStatus === 'pending'
  const showEditor = !pending && (editing || displayStatus !== 'active')
  const validationError = validateTemplateBody(body, template.variables)
  // Solo se conoce el texto activo si se aprobó desde aquí; un Content SID pegado a mano no lo trae.
  const activeBody =
    template.request?.status === 'approved' && template.request.contentSid === template.activeContentSid
      ? template.request.body
      : null

  const requestApproval = () => {
    submit.mutate(
      { id: organizationId, key: template.key, body },
      { onSuccess: () => setEditing(false) },
    )
  }

  const insertVariable = (placeholder: string) => {
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? body.length
    const end = textarea?.selectionEnd ?? body.length
    setBody(body.slice(0, start) + placeholder + body.slice(end))
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + placeholder.length, start + placeholder.length)
    })
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{template.label}</span>
          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', TONE_CLASSES[badge.tone])}>
            <badge.Icon className="h-3 w-3" />
            {badge.label}
          </span>
        </div>
        {usage && <p className="text-xs text-muted-foreground">{usage.when}</p>}
      </div>

      {pending && (
        <>
          <MessagePreview
            body={template.request?.body ?? ''}
            variables={template.variables}
            caption="Texto enviado a revisión"
          />
          <p className="text-xs text-muted-foreground">
            WhatsApp suele responder en minutos, a veces tarda hasta un día. Se activará sola al aprobarse: no
            tienes que hacer nada más.
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

      {displayStatus === 'active' && !editing && (
        <>
          {activeBody ? (
            <MessagePreview body={activeBody} variables={template.variables} caption="Así lo recibe tu cliente" />
          ) : (
            <p className="text-xs text-muted-foreground">
              Usa una plantilla creada directamente en Twilio, por eso no mostramos su texto aquí.
            </p>
          )}
          <button
            type="button"
            className="text-xs font-medium text-primary-text underline-offset-2 hover:underline"
            onClick={() => setEditing(true)}
          >
            Cambiar el texto
          </button>
        </>
      )}

      {showEditor && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={textareaId}>Texto del mensaje</Label>
              {body !== template.defaultBody && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary-text underline-offset-2 hover:underline"
                  onClick={() => setBody(template.defaultBody)}
                >
                  Usar el texto sugerido
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              id={textareaId}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              maxLength={MAX_TEMPLATE_BODY_LENGTH}
              aria-invalid={validationError ? true : undefined}
              aria-describedby={validationError ? errorId : undefined}
              className="w-full resize-y rounded-md border border-input bg-surface-muted px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Insertar dato:</span>
              {template.variables.map((variable) => (
                <button
                  key={variable.placeholder}
                  type="button"
                  title={`Inserta ${variable.placeholder}`}
                  onClick={() => insertVariable(variable.placeholder)}
                  className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {variable.placeholder} {variable.description}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Los códigos como {template.variables[0]?.placeholder ?? '{{1}}'} se reemplazan por el dato real de cada
              cliente. Este mensaje debe incluirlos todos.
            </p>
            <p className="text-xs text-muted-foreground">
              WhatsApp muestra *texto* en negrita; la vista previa oculta esos asteriscos. El carácter | sí se envía
              como texto.
            </p>
            {validationError && (
              <p id={errorId} role="alert" className="text-xs text-destructive">
                {validationError}
              </p>
            )}
          </div>

          <MessagePreview
            body={body}
            variables={template.variables}
            caption="Así lo recibirá tu cliente (los datos resaltados son de ejemplo)"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={requestApproval}
              disabled={!twilioReady || submit.isPending || Boolean(validationError)}
            >
              {submit.isPending && <LoaderCircle className="animate-spin" />}
              {submit.isPending ? 'Enviando...' : 'Enviar a aprobación'}
            </Button>
            {editing && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function WhatsAppTemplatesStep({
  organizationId,
  twilioReady,
  rules,
}: {
  organizationId: string
  twilioReady: boolean
  rules: OrganizationWhatsAppRules
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
      <p className="text-sm text-muted-foreground">
        WhatsApp solo deja escribirle primero a un cliente con un mensaje que haya aprobado antes: una plantilla.
        Hay una por cada tipo de aviso. Puedes usar el texto sugerido o adaptarlo; la app lo envía a revisión y lo
        activa sola.
      </p>
      <Notice tone="muted">
        El recordatorio sugerido ahora incluye el número de kit. Si ya tienes un recordatorio aprobado, envía la nueva
        versión a aprobación; la anterior seguirá activa hasta que WhatsApp apruebe el cambio.
      </Notice>
      {organizationId === PLATFORM_WHATSAPP_ID && (
        <Notice tone="muted">
          Los textos sugeridos de la plataforma incluyen al final la firma «A|R SYSTEM» y el aviso de notificación
          automática.
        </Notice>
      )}
      {!twilioReady && (
        <Notice tone="muted">Completa primero el paso 1 para poder enviar los mensajes a aprobación.</Notice>
      )}
      {templates.isLoading && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Cargando plantillas...
        </p>
      )}
      {templates.isError && !templates.data && (
        <div className="space-y-2">
          <Notice tone="destructive">No se pudieron cargar las plantillas.</Notice>
          <Button type="button" variant="outline" size="sm" onClick={() => templates.refetch()}>
            Reintentar
          </Button>
        </div>
      )}
      {twilioReady && missingCount > 1 && (
        <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            ¿No quieres cambiar nada? Envía las {missingCount} con el texto sugerido.
          </p>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            disabled={submitMissing.isPending}
            onClick={() => submitMissing.mutate(organizationId)}
          >
            {submitMissing.isPending && <LoaderCircle className="animate-spin" />}
            {submitMissing.isPending ? 'Enviando...' : `Enviar las ${missingCount} a aprobación`}
          </Button>
        </div>
      )}
      {templates.data?.templates.map((template) => (
        <TemplateCard
          key={template.key}
          template={template}
          organizationId={organizationId}
          twilioReady={twilioReady}
          rules={rules}
        />
      ))}
    </div>
  )
}

export function WhatsAppWebhooksStep({
  organizationId,
  webhooks,
  twilioReady,
}: {
  organizationId: string
  webhooks: OrganizationWhatsAppConfig['webhooks']
  twilioReady: boolean
}) {
  const check = useWhatsAppConnectionCheck(organizationId)
  const connect = useConnectWhatsAppInboundWebhook()
  const [confirmingReplace, setConfirmingReplace] = useState(false)
  const connected = check.data?.inboundWebhookConnected
  // Otra dirección ya recibe las respuestas: conectarla aquí la deja sin ellas.
  const currentUrl = connected === false ? check.data?.inboundWebhookUrl : null

  const connectNow = () =>
    connect.mutate(organizationId, { onSettled: () => setConfirmingReplace(false) })

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
      <p className="text-sm text-muted-foreground">
        Cuando un cliente responde a un aviso, Twilio necesita saber a dónde entregar ese mensaje. Con esta
        dirección, las respuestas aparecen en{' '}
        <Link to="/chats" className="font-medium text-primary-text underline-offset-2 hover:underline">
          Chats
        </Link>
        . Sin ella los avisos se envían igual, pero no verás lo que te contestan.
      </p>
      {webhooks ? (
        <>
          {connected === true ? (
            <Notice tone="success">Conectado: tu número ya entrega las respuestas a esta app.</Notice>
          ) : (
            <div className="space-y-2">
              <Button
                type="button"
                disabled={!twilioReady || connect.isPending}
                onClick={() => (currentUrl ? setConfirmingReplace(true) : connectNow())}
              >
                {connect.isPending ? <LoaderCircle className="animate-spin" /> : <Link2 />}
                {connect.isPending ? 'Conectando...' : 'Conectar automáticamente'}
              </Button>
              <p className="text-xs text-muted-foreground">
                {twilioReady
                  ? 'La app lo configura en tu cuenta de Twilio por ti. No tienes que copiar nada.'
                  : 'Completa primero el paso 1.'}
              </p>
            </div>
          )}
          <details className="rounded-md border border-border-subtle bg-surface-muted p-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Hacerlo a mano en Twilio
            </summary>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Input readOnly aria-label="URL para mensajes entrantes" value={webhooks.inbound} />
                <Button type="button" variant="outline" className="shrink-0" onClick={() => copyUrl(webhooks.inbound)}>
                  <ClipboardCopy />
                  Copiar
                </Button>
              </div>
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                <li>Copia la dirección de arriba.</li>
                <li>En Twilio, entra en Messaging › Senders › WhatsApp senders y abre tu número.</li>
                <li>Pégala en el campo del webhook para mensajes entrantes, con método POST, y guarda.</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Si recibes los mensajes a través de un Messaging Service, pégala allí. En ese caso este paso seguirá
                sin marcarse como listo: compruébalo respondiendo al mensaje de prueba.
              </p>
            </div>
          </details>
          <ConfirmDialog
            open={confirmingReplace}
            onOpenChange={setConfirmingReplace}
            title="¿Reemplazar la dirección actual?"
            description={`Tu número entrega hoy las respuestas a ${currentUrl}. Si otro sistema las usa, dejará de recibirlas.`}
            confirmLabel="Reemplazar"
            pendingLabel="Conectando..."
            isPending={connect.isPending}
            onConfirm={connectNow}
          />
        </>
      ) : (
        <Notice tone="muted">
          Este servidor no tiene una dirección pública https. La URL aparecerá aquí cuando se configure.
        </Notice>
      )}
    </div>
  )
}

export function WhatsAppTestStep({
  organizationId,
  disabled,
  disabledReason = 'Disponible cuando WhatsApp apruebe al menos una plantilla.',
}: {
  organizationId: string
  disabled: boolean
  disabledReason?: string
}) {
  const send = useSendWhatsAppTestMessage()
  const [phone, setPhone] = useState('')
  const inputId = `whatsapp-test-phone-${organizationId}`

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Te enviamos uno de tus mensajes aprobados con datos de ejemplo, para que veas lo mismo que verá tu cliente.
        Twilio lo cobra como un mensaje normal.
      </p>
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
            className="shrink-0"
            disabled={disabled || send.isPending || !phone.trim()}
            onClick={() => send.mutate({ id: organizationId, to: phone.trim() })}
          >
            {send.isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
            {send.isPending ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {disabled
            ? disabledReason
            : 'Con código de país, por ejemplo +58. Si respondes a la prueba, compruebas también que las respuestas llegan a Chats.'}
        </p>
      </div>
    </div>
  )
}

const MODE_OPTIONS: { mode: WhatsAppMode; Icon: typeof Zap; title: string; points: string[] }[] = [
  {
    mode: 'platform',
    Icon: Zap,
    title: 'WhatsApp de la plataforma',
    points: ['Listo al instante, sin configurar nada', 'Mensajes incluidos en tu plan, con un tope mensual'],
  },
  {
    mode: 'own',
    Icon: Smartphone,
    title: 'Tu propio número',
    points: [
      'Requiere una cuenta Twilio y un número exclusivo, distinto al de la plataforma',
      'Tus clientes ven tu número; pagas los mensajes a Twilio',
    ],
  },
]

export function WhatsAppModePicker({
  mode,
  pending,
  ownReady,
  onChange,
}: {
  mode: WhatsAppMode
  pending: boolean
  ownReady: boolean
  onChange: (mode: WhatsAppMode) => void
}) {
  const [confirmOwnChange, setConfirmOwnChange] = useState(false)

  return (
    <>
      <div role="radiogroup" aria-label="Desde dónde se envían los avisos" className="grid gap-2 sm:grid-cols-2">
        {MODE_OPTIONS.map(({ mode: option, Icon, title, points }) => {
          const selected = option === mode
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending}
              onClick={() => {
                if (selected) return
                if (option === 'own' && !ownReady) {
                  setConfirmOwnChange(true)
                  return
                }
                onChange(option)
              }}
              className={cn(
                'rounded-xl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                selected
                  ? 'border-border-strong bg-surface-active text-surface-foreground'
                  : 'border-border bg-surface text-surface-foreground hover:bg-surface-hover',
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
                {title}
                {selected && (
                  <span className="ml-auto rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    Seleccionado
                  </span>
                )}
              </span>
              {option === 'own' && !ownReady && (
                <span className="mt-1 block text-xs font-medium text-warning">Pendiente de configurar</span>
              )}
              <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                {points.map((point) => <li key={point}>{point}</li>)}
              </ul>
            </button>
          )
        })}
      </div>
      <ConfirmDialog
        open={confirmOwnChange}
        onOpenChange={setConfirmOwnChange}
        title="Cambiar al número propio"
        description="Si todavía falta configurar Twilio o alguna plantilla requerida, los avisos por WhatsApp de esta organización quedarán en pausa. Al cambiar, dejará de usar el WhatsApp de la plataforma."
        confirmLabel="Cambiar igualmente"
        onConfirm={() => {
          setConfirmOwnChange(false)
          onChange('own')
        }}
      />
    </>
  )
}

function UsageMeter({ usage }: { usage: PlatformWhatsAppSummary['usage'] }) {
  const percent = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 100
  const exhausted = usage.used >= usage.limit
  const tone: Tone = exhausted ? 'destructive' : percent >= PLAN_USAGE_WARNING_PERCENT ? 'warning' : 'success'
  const barClass = { success: 'bg-success', warning: 'bg-warning', destructive: 'bg-destructive', muted: 'bg-muted' }[tone]
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Mensajes de este mes</span>
        <span className="text-sm text-foreground">
          <span className="font-semibold">{usage.used}</span> de {usage.limit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Mensajes usados este mes"
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={Math.min(usage.used, usage.limit)}
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div className={cn('h-full rounded-full', barClass)} style={{ width: `${percent}%` }} />
      </div>
      <p className={cn('text-xs', exhausted ? 'text-destructive' : 'text-muted-foreground')}>
        {exhausted
          ? 'Llegaste al tope: los avisos están en pausa hasta el día 1. Para seguir enviando, sube de plan o usa tu propio número.'
          : 'Cuenta cada aviso, cada respuesta que envías desde Chats y cada prueba. Se renueva el día 1 de cada mes.'}
      </p>
    </div>
  )
}

/** Lo que ve una organización que envía con la cuenta de la plataforma: nada que configurar. */
export function WhatsAppPlatformPanel({
  organizationId,
  platform,
  rules,
}: {
  organizationId: string
  platform: PlatformWhatsAppSummary
  rules: OrganizationWhatsAppRules
}) {
  const exhausted = platform.usage.used >= platform.usage.limit
  const hasTemplate = platform.templates.some((template) => template.contentSid)
  const testDisabledReason = !platform.available || !hasTemplate
    ? 'Disponible cuando la plataforma termine de activar el servicio.'
    : 'Llegaste al tope de mensajes de este mes.'

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Tus clientes reciben los avisos desde el número de la plataforma
        {platform.phoneNumber ? ` (${platform.phoneNumber})` : ''}, con el nombre de tu negocio dentro del mensaje.
        Si te responden, lo ves en{' '}
        <Link to="/chats" className="font-medium text-primary-text underline-offset-2 hover:underline">
          Chats
        </Link>
        .
      </p>

      <UsageMeter usage={platform.usage} />

      <div className="space-y-3">
        <StepHeading
          title="Los mensajes que reciben tus clientes"
          description="Ya están aprobados por WhatsApp. Si quieres otro texto, cambia a tu propio número."
        />
        {platform.templates.map((template) => (
          <div key={template.key} className="space-y-2 rounded-xl border border-border bg-surface p-3">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{template.label}</span>
                {!template.contentSid && (
                  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs', TONE_CLASSES.warning)}>
                    <Clock className="h-3 w-3" />
                    Aún no disponible
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{describeTemplateUsage(template.key, rules)?.when}</p>
            </div>
            <MessagePreview
              body={template.body}
              variables={template.variables}
              caption="Así lo recibe tu cliente (los datos resaltados son de ejemplo)"
            />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <StepHeading title="Envía una prueba" description="Comprueba en tu teléfono cómo llega el aviso." />
        <WhatsAppTestStep
          organizationId={organizationId}
          disabled={!platform.available || !hasTemplate || exhausted}
          disabledReason={testDisabledReason}
        />
      </div>
    </div>
  )
}

export function WhatsAppFailuresSection({ organizationId }: { organizationId: string }) {
  const failures = useWhatsAppFailures(organizationId)

  return (
    <div className="space-y-3">
      <StepHeading
        title="Avisos que no salieron"
        description="Últimos 7 días, agrupados por causa. Revísalo si un cliente dice que no recibió su aviso."
      />
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
