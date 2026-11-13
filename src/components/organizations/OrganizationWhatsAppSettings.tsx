import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  LoaderCircle,
  MessageCircle,
  MessagesSquare,
  Save,
  Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorState, FormSkeleton } from '@/components/design-system'
import {
  useOrganizationWhatsAppConfig,
  useUpdateOrganizationWhatsAppConfig,
  useWhatsAppConnectionCheck,
  useWhatsAppTemplates,
} from '@/hooks/useOrganizations'
import {
  SetupStep,
  StepHeading,
  WhatsAppConnectionStatus,
  WhatsAppFailuresSection,
  WhatsAppModePicker,
  WhatsAppPlatformPanel,
  WhatsAppTemplatesStep,
  WhatsAppTestStep,
  WhatsAppWebhooksStep,
  type SetupStepState,
} from '@/components/organizations/WhatsAppSetupSections'
import {
  formatReminderDays,
  getTemplateDisplayStatus,
  isTemplateRequired,
  REMINDER_DAY_OPTIONS,
  PLATFORM_WHATSAPP_ID,
} from '@/lib/whatsapp-setup'
import { formatLocalDate } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type {
  OrganizationWhatsAppConfig,
  WhatsAppConnectionCheck,
  WhatsAppTemplateState,
} from '@/types/api'

const TWILIO_SIGNUP_URL = 'https://www.twilio.com/try-twilio'
const TWILIO_CONSOLE_URL = 'https://console.twilio.com/'

/** Sin credenciales guardadas, el `enabled: false` inicial no es una decisión de nadie. */
function isWhatsAppEnabled(twilio: OrganizationWhatsAppConfig['twilio']): boolean {
  return twilio.enabled !== false || !twilio.accountSid
}

function isTwilioReady(twilio: OrganizationWhatsAppConfig['twilio']): boolean {
  return Boolean(twilio.accountSid && twilio.authTokenConfigured && twilio.phoneNumber && twilio.enabled !== false)
}

function isOwnWhatsAppReady(config: OrganizationWhatsAppConfig): boolean {
  if (!isTwilioReady(config.twilio)) return false
  return (
    (config.rules.reminderDaysBefore.length === 0 || Boolean(config.templates.reminder)) &&
    (!config.rules.dueDateWarningEnabled || Boolean(config.templates.dueDateWarning)) &&
    (!config.rules.suspensionNoticeEnabled || Boolean(config.templates.suspensionNotice))
  )
}

interface OrganizationWhatsAppSettingsProps {
  organizationId: string
  organizationName: string
}

function ToggleRow({
  id,
  checked,
  onChange,
  title,
  description,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  title: string
  description: string
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function FormError({ message, error }: { message: string | null; error?: unknown }) {
  const text = message ?? (error ? (error instanceof Error ? error.message : 'No se pudo guardar.') : null)
  if (!text) return null
  return (
    <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
      {text}
    </p>
  )
}

function SaveButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
        {pending ? 'Guardando...' : label}
      </Button>
    </div>
  )
}

function ExternalHelpLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary-text underline-offset-2 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  )
}

const HOW_IT_WORKS = [
  {
    Icon: Smartphone,
    title: 'Los mensajes salen de tu número',
    text: 'Usas tu propio número de WhatsApp Business a través de tu cuenta de Twilio, el servicio que hace los envíos. Twilio te cobra cada mensaje directamente a ti.',
  },
  {
    Icon: FileCheck,
    title: 'WhatsApp aprueba el texto una vez',
    text: 'Para escribirle primero a un cliente, WhatsApp exige un mensaje aprobado: una plantilla. Tú eliges el texto y la app se encarga de pedir la aprobación.',
  },
  {
    Icon: BellRing,
    title: 'Después, la app avisa sola',
    text: 'Cada día revisa los vencimientos y envía el recordatorio, el aviso de vencimiento o el de suspensión según lo que elijas en «Cuándo avisar».',
  },
  {
    Icon: MessagesSquare,
    title: 'Las respuestas llegan a Chats',
    text: 'Si un cliente contesta, lo ves y le respondes desde la sección Chats.',
  },
]

function HowItWorks({ defaultOpen }: { defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className="group rounded-xl border border-border-subtle bg-surface-muted"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl p-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        ¿Cómo funcionan los avisos por WhatsApp?
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ul className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
        {HOW_IT_WORKS.map(({ Icon, title, text }) => (
          <li key={title} className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" aria-hidden="true" />
            <span>
              <span className="block text-sm font-medium text-foreground">{title}</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}

function ConnectionStep({
  organizationId,
  config,
  onConnected,
}: {
  organizationId: string
  config: OrganizationWhatsAppConfig
  onConnected: () => void
}) {
  const updateMutation = useUpdateOrganizationWhatsAppConfig()
  const [accountSid, setAccountSid] = useState(config.twilio.accountSid || '')
  const [authToken, setAuthToken] = useState('')
  const [showAuthToken, setShowAuthToken] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(config.twilio.phoneNumber || '')
  const [enabled, setEnabled] = useState(isWhatsAppEnabled(config.twilio))
  const [removeAuthToken, setRemoveAuthToken] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Por valor: guardar las reglas devuelve otro objeto y no debe borrar lo que se está editando aquí.
  const savedEnabled = isWhatsAppEnabled(config.twilio)
  useEffect(() => {
    setAccountSid(config.twilio.accountSid || '')
    setPhoneNumber(config.twilio.phoneNumber || '')
    setEnabled(savedEnabled)
  }, [config.twilio.accountSid, config.twilio.phoneNumber, savedEnabled])

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)
    const sid = accountSid.trim()
    const token = authToken.trim()
    const phone = phoneNumber.trim()
    if (sid && !/^AC[0-9a-fA-F]{32}$/.test(sid)) {
      setValidationError('El Account SID empieza por AC y tiene 34 caracteres. Cópialo completo desde Twilio.')
      return
    }
    if (token && token.length < 16) {
      setValidationError('El Auth Token parece incompleto. Cópialo completo desde Twilio.')
      return
    }
    if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      setValidationError(
        'Escribe el número con código de país y sin espacios ni guiones, por ejemplo +584223552626.',
      )
      return
    }
    const wasReady = isTwilioReady(config.twilio)
    updateMutation.mutate(
      {
        id: organizationId,
        data: {
          twilio: {
            accountSid: sid,
            phoneNumber: phone,
            enabled,
            ...(removeAuthToken ? { authToken: null } : token ? { authToken: token } : {}),
          },
        },
      },
      {
        onSuccess: (saved) => {
          setAuthToken('')
          setShowAuthToken(false)
          setRemoveAuthToken(false)
          if (!wasReady && isTwilioReady(saved.twilio)) onConnected()
        },
      },
    )
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Twilio es el servicio que envía los mensajes desde tu número. Necesitas una cuenta de Twilio con tu número
        registrado como remitente de WhatsApp; aquí solo copias tres datos de esa cuenta.
      </p>

      <details className="rounded-md border border-border-subtle bg-surface-muted p-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          ¿Dónde encuentro estos datos?
        </summary>
        <ol className="mt-2 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>
            Si aún no tienes cuenta,{' '}
            <ExternalHelpLink href={TWILIO_SIGNUP_URL}>crea una en Twilio</ExternalHelpLink>.
          </li>
          <li>
            Abre la <ExternalHelpLink href={TWILIO_CONSOLE_URL}>consola de Twilio</ExternalHelpLink>. En la página de
            inicio, el recuadro «Account Info» muestra el Account SID y el Auth Token.
          </li>
          <li>
            El número es el que registraste en Twilio para WhatsApp (Messaging › Senders › WhatsApp senders). No
            sirve un WhatsApp personal que no esté dado de alta allí.
          </li>
        </ol>
      </details>

      <WhatsAppConnectionStatus organizationId={organizationId} />

      <div className="space-y-2">
        <Label htmlFor={`org-whatsapp-account-sid-${organizationId}`}>Account SID</Label>
        <Input
          id={`org-whatsapp-account-sid-${organizationId}`}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={accountSid}
          onChange={(event) => setAccountSid(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">El identificador de tu cuenta. Siempre empieza por AC.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`org-whatsapp-auth-token-${organizationId}`}>Auth Token</Label>
          {config.twilio.authTokenConfigured && (
            <button
              type="button"
              className="text-xs font-medium text-destructive hover:underline"
              onClick={() => {
                setRemoveAuthToken((current) => !current)
                setAuthToken('')
              }}
            >
              {removeAuthToken ? 'Cancelar borrado' : 'Borrar token guardado'}
            </button>
          )}
        </div>
        <div className="relative">
          <Input
            id={`org-whatsapp-auth-token-${organizationId}`}
            type={showAuthToken ? 'text' : 'password'}
            autoComplete="new-password"
            autoCapitalize="off"
            spellCheck={false}
            disabled={removeAuthToken}
            className="pr-11"
            placeholder={
              removeAuthToken
                ? 'Se eliminará al guardar'
                : config.twilio.authTokenConfigured
                  ? '•••••••• (vacío para conservar el actual)'
                  : 'Pega aquí el Auth Token'
            }
            value={authToken}
            onChange={(event) => setAuthToken(event.target.value)}
          />
          <button
            type="button"
            aria-label={showAuthToken ? 'Ocultar el token' : 'Mostrar el token'}
            aria-pressed={showAuthToken}
            disabled={removeAuthToken}
            onClick={() => setShowAuthToken((current) => !current)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {showAuthToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Es la contraseña de tu cuenta de Twilio: se guarda protegida y nunca se vuelve a mostrar. Todos los
          administradores de esta organización pueden reemplazarla.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`org-whatsapp-phone-${organizationId}`}>Número de WhatsApp Business</Label>
        <Input
          id={`org-whatsapp-phone-${organizationId}`}
          inputMode="tel"
          autoComplete="off"
          placeholder="+584223552626"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          El número desde el que tus clientes recibirán los avisos, con código de país. Es exclusivo de esta
          organización.
        </p>
      </div>

      <ToggleRow
        id={`org-whatsapp-enabled-${organizationId}`}
        checked={enabled}
        onChange={setEnabled}
        title="Enviar avisos por WhatsApp"
        description="Desmárcalo para pausar todos los envíos sin perder la configuración. Las tareas automáticas siguen procesando los períodos."
      />

      <FormError message={validationError} error={updateMutation.error} />
      <SaveButton pending={updateMutation.isPending} label="Guardar y comprobar" />
    </form>
  )
}

function ReminderDaysPicker({
  days,
  onChange,
}: {
  days: number[]
  onChange: (days: number[]) => void
}) {
  const toggle = (day: number) =>
    onChange(days.includes(day) ? days.filter((current) => current !== day) : [...days, day])

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">Recordatorio antes del vencimiento</legend>
      <p className="text-xs text-muted-foreground">
        Elige con cuántos días de antelación avisar. Puedes marcar varios o ninguno; el día del vencimiento
        tiene su propio aviso.
      </p>
      <div className="flex flex-wrap gap-2">
        {REMINDER_DAY_OPTIONS.map((day) => {
          const selected = days.includes(day)
          return (
            <button
              key={day}
              type="button"
              aria-pressed={selected}
              aria-label={`${day} días antes`}
              onClick={() => toggle(day)}
              className={cn(
                'flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-surface text-foreground hover:bg-surface-hover',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function RulesSection({
  organizationId,
  config,
  ownAccount,
}: {
  organizationId: string
  config: OrganizationWhatsAppConfig
  /** Con cuenta propia se pueden pegar plantillas ya aprobadas en Twilio. */
  ownAccount: boolean
}) {
  const updateMutation = useUpdateOrganizationWhatsAppConfig()
  const manualTemplateFields = useWhatsAppTemplates(ownAccount ? organizationId : '').data?.templates ?? []
  const [reminderDays, setReminderDays] = useState(() =>
    config.rules.reminderDaysBefore.filter((day) => REMINDER_DAY_OPTIONS.includes(day)),
  )
  const [dueDateWarningEnabled, setDueDateWarningEnabled] = useState(config.rules.dueDateWarningEnabled)
  const [suspensionNoticeEnabled, setSuspensionNoticeEnabled] = useState(config.rules.suspensionNoticeEnabled)
  const [templates, setTemplates] = useState(config.templates)

  // Por valor: guardar la conexión devuelve otro objeto y no debe borrar lo que se está editando aquí.
  const savedRules = JSON.stringify(config.rules)
  const savedTemplates = JSON.stringify(config.templates)
  useEffect(() => {
    const rules: OrganizationWhatsAppConfig['rules'] = JSON.parse(savedRules)
    setReminderDays(rules.reminderDaysBefore.filter((day) => REMINDER_DAY_OPTIONS.includes(day)))
    setDueDateWarningEnabled(rules.dueDateWarningEnabled)
    setSuspensionNoticeEnabled(rules.suspensionNoticeEnabled)
  }, [savedRules])
  useEffect(() => {
    setTemplates(JSON.parse(savedTemplates))
  }, [savedTemplates])

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    updateMutation.mutate({
      id: organizationId,
      data: {
        rules: {
          reminderDaysBefore: reminderDays
            .filter((day) => REMINDER_DAY_OPTIONS.includes(day))
            .sort((a, b) => b - a),
          dueDateWarningEnabled,
          suspensionNoticeEnabled,
        },
        ...(ownAccount
          ? {
              templates: Object.fromEntries(
                manualTemplateFields.map(({ key }) => [key, templates[key]?.trim() || null]),
              ),
            }
          : {}),
      },
    })
  }

  const schedule = [
    reminderDays.length > 0 && `${formatReminderDays(reminderDays)} antes: recordatorio de pago.`,
    dueDateWarningEnabled && 'El día del vencimiento: aviso de vencimiento.',
    suspensionNoticeEnabled && 'Al suspender el servicio: aviso de suspensión.',
  ].filter((line): line is string => Boolean(line))

  return (
    <form onSubmit={save} className="space-y-4">
      <StepHeading
        title="Cuándo avisar"
        description="Elige en qué momentos la app le escribe a cada cliente. Se calcula con la fecha de vencimiento de su período."
      />

      <ReminderDaysPicker days={reminderDays} onChange={setReminderDays} />

      <ToggleRow
        id={`org-whatsapp-due-warning-${organizationId}`}
        checked={dueDateWarningEnabled}
        onChange={setDueDateWarningEnabled}
        title="Aviso el día de vencimiento"
        description="Le avisa al cliente el mismo día en que vence su período sin pagar."
      />
      <ToggleRow
        id={`org-whatsapp-suspension-notice-${organizationId}`}
        checked={suspensionNoticeEnabled}
        onChange={setSuspensionNoticeEnabled}
        title="Aviso al suspender el servicio"
        description="Le avisa al cliente cuando su suscripción pasa de activa a suspendida."
      />

      <div className="rounded-xl border border-border-subtle bg-surface-muted p-3" aria-live="polite">
        <p className="text-sm font-medium text-foreground">Lo que recibirá cada cliente</p>
        {schedule.length > 0 ? (
          <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm text-muted-foreground">
            {schedule.map((line) => <li key={line}>{line}</li>)}
          </ol>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Ningún aviso automático. Activa al menos uno arriba.</p>
        )}
        {ownAccount && (
          <p className="mt-2 text-xs text-muted-foreground">
            Cada aviso necesita su plantilla activa en el paso 2; si falta, ese aviso no se envía.
          </p>
        )}
      </div>

      <details hidden={!ownAccount} className="rounded-md border border-border bg-surface p-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Avanzado: usar plantillas ya aprobadas en Twilio
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Solo si ya creaste plantillas por tu cuenta en Twilio. Pega su Content SID (empieza por HX); deben usar
            las mismas variables que las del paso 2. Si no sabes qué es esto, no lo necesitas.
          </p>
          {manualTemplateFields.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`org-whatsapp-template-${key}-${organizationId}`}>{label} (Content SID)</Label>
              <Input
                id={`org-whatsapp-template-${key}-${organizationId}`}
                placeholder="HX..."
                autoCapitalize="off"
                spellCheck={false}
                value={templates[key] ?? ''}
                onChange={(event) => setTemplates((current) => ({ ...current, [key]: event.target.value }))}
              />
            </div>
          ))}
        </div>
      </details>

      <FormError message={null} error={updateMutation.error} />
      <SaveButton pending={updateMutation.isPending} label="Guardar reglas" />
    </form>
  )
}

interface StepStatus {
  state: SetupStepState
  summary: string
}

function getConnectionStatus(
  twilio: OrganizationWhatsAppConfig['twilio'],
  check: WhatsAppConnectionCheck | undefined,
): StepStatus {
  if (!isTwilioReady(twilio)) {
    return twilio.accountSid && twilio.enabled === false
      ? { state: 'attention', summary: 'Los envíos están en pausa. Actívalos para volver a avisar.' }
      : { state: 'todo', summary: 'Copia tres datos de tu cuenta de Twilio.' }
  }
  if (check && ['invalid_credentials', 'sender_not_found', 'sender_offline'].includes(check.status)) {
    return { state: 'attention', summary: check.message }
  }
  return {
    state: 'done',
    summary: check?.status === 'ok' ? `Conectado con ${twilio.phoneNumber}` : `Datos guardados para ${twilio.phoneNumber}`,
  }
}

function getTemplatesStatus(
  templates: WhatsAppTemplateState[] | undefined,
  rules: OrganizationWhatsAppConfig['rules'],
): StepStatus {
  if (!templates) return { state: 'loading', summary: 'Los mensajes que WhatsApp debe aprobar.' }
  const needed = templates.filter((template) => isTemplateRequired(template, rules))
  if (needed.length === 0) {
    return { state: 'optional', summary: 'No tienes avisos automáticos activados en «Cuándo avisar».' }
  }
  const inactive = needed.filter((template) => !template.activeContentSid)
  if (inactive.length === 0) {
    return {
      state: 'done',
      summary: needed.length === 1 ? 'Tu aviso tiene su mensaje aprobado.' : `Tus ${needed.length} avisos tienen su mensaje aprobado.`,
    }
  }
  const statuses = inactive.map(getTemplateDisplayStatus)
  if (statuses.some((status) => status === 'rejected' || status === 'blocked')) {
    return { state: 'attention', summary: 'WhatsApp no aceptó algún mensaje. Ajusta el texto y vuelve a enviarlo.' }
  }
  const unrequested = statuses.filter((status) => status === 'none').length
  if (unrequested > 0) {
    return {
      state: 'todo',
      summary: unrequested === 1 ? 'Falta enviar 1 mensaje a aprobación.' : `Falta enviar ${unrequested} mensajes a aprobación.`,
    }
  }
  return { state: 'waiting', summary: 'WhatsApp está revisando tus mensajes. Se activan solos.' }
}

type StepId = 'connection' | 'templates' | 'webhooks' | 'test'

export function OrganizationWhatsAppSettings({
  organizationId,
  organizationName,
}: OrganizationWhatsAppSettingsProps) {
  const configQuery = useOrganizationWhatsAppConfig(organizationId)

  if (configQuery.isError && !configQuery.data) {
    return (
      <ErrorState
        title={`No se pudo cargar la configuración de WhatsApp de ${organizationName}`}
        onRetry={() => configQuery.refetch()}
        isRetrying={configQuery.isFetching}
      />
    )
  }
  if (!configQuery.data) return <FormSkeleton label="Cargando configuración de WhatsApp" />

  return (
    <WhatsAppSetupGuide
      organizationId={organizationId}
      organizationName={organizationName}
      config={configQuery.data}
    />
  )
}

/** La guía para quien envía con su propia cuenta de Twilio: una organización o la plataforma. */
function OwnAccountSteps({
  organizationId,
  config,
}: {
  organizationId: string
  config: OrganizationWhatsAppConfig
}) {
  const connectionCheck = useWhatsAppConnectionCheck(organizationId).data
  const templates = useWhatsAppTemplates(organizationId).data?.templates
  const twilioReady = isTwilioReady(config.twilio)
  const hasActiveTemplate = Object.values(config.templates).some(Boolean)
  // Se abre el primer paso imprescindible que falta; con todo listo, la guía queda plegada.
  const [openStep, setOpenStep] = useState<StepId | null>(
    !twilioReady ? 'connection' : config.readiness.ready ? null : 'templates',
  )
  const toggle = (step: StepId) => setOpenStep((current) => (current === step ? null : step))

  const connectionStatus = getConnectionStatus(config.twilio, connectionCheck)
  const templatesStatus = getTemplatesStatus(templates, config.rules)
  const webhooksStatus: StepStatus = !config.webhooks
    ? { state: 'optional', summary: 'No disponible todavía en este servidor.' }
    : connectionCheck?.inboundWebhookConnected
      ? { state: 'done', summary: 'Las respuestas de tus clientes llegan a Chats.' }
      : { state: 'optional', summary: 'Un clic para ver en Chats lo que te contestan tus clientes.' }
  const testStatus: StepStatus = config.lastTestAt
    ? { state: 'done', summary: `Última prueba enviada el ${formatLocalDate(config.lastTestAt)}.` }
    : { state: 'optional', summary: 'Comprueba en tu teléfono cómo llega el aviso.' }

  const stepId = (step: StepId) => `whatsapp-step-${step}-${organizationId}`

  return (
    <>
      <HowItWorks defaultOpen={!config.readiness.ready} />

      {config.readiness.usingLegacyTemplates && (
        <p className="rounded-md border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
          Las plantillas actuales provienen de la configuración antigua del servidor. Al guardar,
          quedarán guardadas explícitamente para esta organización.
        </p>
      )}

      <div className="space-y-2">
        <SetupStep
          id={stepId('connection')}
          number={1}
          title="Conecta tu cuenta de Twilio"
          {...connectionStatus}
          open={openStep === 'connection'}
          onToggle={() => toggle('connection')}
        >
          <ConnectionStep
            organizationId={organizationId}
            config={config}
            onConnected={() => setOpenStep('templates')}
          />
        </SetupStep>
        <SetupStep
          id={stepId('templates')}
          number={2}
          title="Aprueba tus mensajes"
          {...templatesStatus}
          open={openStep === 'templates'}
          onToggle={() => toggle('templates')}
        >
          <WhatsAppTemplatesStep organizationId={organizationId} twilioReady={twilioReady} rules={config.rules} />
        </SetupStep>
        <SetupStep
          id={stepId('webhooks')}
          number={3}
          title="Recibe las respuestas"
          {...webhooksStatus}
          open={openStep === 'webhooks'}
          onToggle={() => toggle('webhooks')}
        >
          <WhatsAppWebhooksStep
            organizationId={organizationId}
            webhooks={config.webhooks}
            twilioReady={twilioReady}
          />
        </SetupStep>
        <SetupStep
          id={stepId('test')}
          number={4}
          title="Envía una prueba"
          {...testStatus}
          open={openStep === 'test'}
          onToggle={() => toggle('test')}
        >
          <WhatsAppTestStep organizationId={organizationId} disabled={!twilioReady || !hasActiveTemplate} />
        </SetupStep>
      </div>
    </>
  )
}

function WhatsAppSetupGuide({
  organizationId,
  organizationName,
  config,
}: OrganizationWhatsAppSettingsProps & { config: OrganizationWhatsAppConfig }) {
  const modeMutation = useUpdateOrganizationWhatsAppConfig()
  const isPlatformAccount = organizationId === PLATFORM_WHATSAPP_ID
  // Un servidor anterior no informa la plataforma ni el modo: solo conocía la cuenta propia.
  const platform = isPlatformAccount ? null : (config.platform ?? null)
  const usesPlatform = platform !== null && config.mode === 'platform'

  const pendingHint = isPlatformAccount
    ? 'Mientras falte, las organizaciones que usan el WhatsApp de la plataforma no envían avisos.'
    : usesPlatform
      ? 'Si no quieres esperar, puedes cambiar a tu propio número.'
      : 'Sigue los pasos de abajo en orden; los dos primeros son imprescindibles.'

  return (
    <section
      id="organization-whatsapp-settings"
      className="space-y-5"
      aria-labelledby="organization-whatsapp-title"
    >
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <h3 id="organization-whatsapp-title" className="text-sm font-semibold text-foreground">
            {isPlatformAccount ? 'WhatsApp de la plataforma' : 'Avisos por WhatsApp'}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isPlatformAccount
              ? 'La cuenta que envía los avisos de las organizaciones sin número propio. Sus mensajes se cobran a esta cuenta de Twilio.'
              : `Recordatorios de pago automáticos para los clientes de ${organizationName}.`}
          </p>
        </div>
      </div>

      {platform && (
        <WhatsAppModePicker
          mode={usesPlatform ? 'platform' : 'own'}
          pending={modeMutation.isPending}
          ownReady={isOwnWhatsAppReady(config)}
          onChange={(mode) => modeMutation.mutate({ id: organizationId, data: { mode } })}
        />
      )}

      {config.readiness.ready ? (
        <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {isPlatformAccount
              ? 'Todo listo: las organizaciones ya pueden enviar avisos con esta cuenta.'
              : 'Todo listo: los avisos activados se envían solos a tus clientes.'}
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Los avisos aún no se envían. Falta:</p>
            <ul className="mt-1 list-inside list-disc">
              {config.readiness.missing.map((missing) => <li key={missing}>{missing}</li>)}
            </ul>
            <p className="mt-1 text-xs">{pendingHint}</p>
          </div>
        </div>
      )}

      {usesPlatform ? (
        <WhatsAppPlatformPanel organizationId={organizationId} platform={platform} rules={config.rules} />
      ) : (
        <OwnAccountSteps organizationId={organizationId} config={config} />
      )}

      {!isPlatformAccount && (
        <div className="border-t border-border pt-4">
          <RulesSection organizationId={organizationId} config={config} ownAccount={!usesPlatform} />
        </div>
      )}
      <div className="border-t border-border pt-4">
        <WhatsAppFailuresSection organizationId={organizationId} />
      </div>
    </section>
  )
}
