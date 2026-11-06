import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, LoaderCircle, MessageCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useOrganizationWhatsAppConfig,
  useUpdateOrganizationWhatsAppConfig,
  useWhatsAppTemplates,
} from '@/hooks/useOrganizations'
import {
  StepHeading,
  WhatsAppConnectionStatus,
  WhatsAppFailuresSection,
  WhatsAppTemplatesStep,
  WhatsAppTestStep,
  WhatsAppWebhooksStep,
} from '@/components/organizations/WhatsAppSetupSections'
import type { OrganizationWhatsAppConfig } from '@/types/api'

const TWILIO_SIGNUP_URL = 'https://www.twilio.com/try-twilio'
const TWILIO_CONSOLE_URL = 'https://console.twilio.com/'

/** Sin credenciales guardadas, el `enabled: false` inicial no es una decisión de nadie. */
function isWhatsAppEnabled(twilio: OrganizationWhatsAppConfig['twilio']): boolean {
  return twilio.enabled !== false || !twilio.accountSid
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
        {pending ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        {pending ? 'Guardando...' : label}
      </Button>
    </div>
  )
}

function ConnectionStep({
  organizationId,
  config,
}: {
  organizationId: string
  config: OrganizationWhatsAppConfig
}) {
  const updateMutation = useUpdateOrganizationWhatsAppConfig()
  const [accountSid, setAccountSid] = useState(config.twilio.accountSid || '')
  const [authToken, setAuthToken] = useState('')
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
    if (phoneNumber.trim() && !/^\+?[1-9]\d{1,14}$/.test(phoneNumber.trim())) {
      setValidationError('El número de WhatsApp debe usar formato internacional, por ejemplo +584223552626.')
      return
    }
    updateMutation.mutate(
      {
        id: organizationId,
        data: {
          twilio: {
            accountSid: accountSid.trim(),
            phoneNumber: phoneNumber.trim(),
            enabled,
            ...(removeAuthToken ? { authToken: null } : authToken.trim() ? { authToken: authToken.trim() } : {}),
          },
        },
      },
      {
        onSuccess: () => {
          setAuthToken('')
          setRemoveAuthToken(false)
        },
      },
    )
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <StepHeading
        step={1}
        title="Conectar tu cuenta de Twilio"
        description="Los mensajes salen de tu propia cuenta y número de WhatsApp. Comprobamos los datos con Twilio al guardar."
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <a
          href={TWILIO_SIGNUP_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Crear una cuenta de Twilio
          <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={TWILIO_CONSOLE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Ver mi Account SID y Auth Token
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <WhatsAppConnectionStatus organizationId={organizationId} />

      <div className="space-y-2">
        <Label htmlFor={`org-whatsapp-account-sid-${organizationId}`}>Account SID</Label>
        <Input
          id={`org-whatsapp-account-sid-${organizationId}`}
          autoComplete="off"
          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={accountSid}
          onChange={(event) => setAccountSid(event.target.value)}
        />
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
        <Input
          id={`org-whatsapp-auth-token-${organizationId}`}
          type="password"
          autoComplete="new-password"
          disabled={removeAuthToken}
          placeholder={
            removeAuthToken
              ? 'Se eliminará al guardar'
              : config.twilio.authTokenConfigured
                ? '•••••••• (vacío para conservar el actual)'
                : 'Auth Token de Twilio'
          }
          value={authToken}
          onChange={(event) => setAuthToken(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          El token guardado nunca se muestra. Todos los administradores de esta organización pueden actualizarlo.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`org-whatsapp-phone-${organizationId}`}>Número de WhatsApp Business</Label>
        <Input
          id={`org-whatsapp-phone-${organizationId}`}
          autoComplete="off"
          placeholder="+584223552626"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
        />
      </div>

      <ToggleRow
        id={`org-whatsapp-enabled-${organizationId}`}
        checked={enabled}
        onChange={setEnabled}
        title="Habilitar WhatsApp para esta organización"
        description="Al desactivarlo, las tareas automáticas siguen procesando períodos pero no se envían mensajes."
      />

      <FormError message={validationError} error={updateMutation.error} />
      <SaveButton pending={updateMutation.isPending} label="Guardar y comprobar" />
    </form>
  )
}

function RulesSection({
  organizationId,
  config,
}: {
  organizationId: string
  config: OrganizationWhatsAppConfig
}) {
  const updateMutation = useUpdateOrganizationWhatsAppConfig()
  const manualTemplateFields = useWhatsAppTemplates(organizationId).data?.templates ?? []
  const [reminderDays, setReminderDays] = useState(config.rules.reminderDaysBefore.join(', '))
  const [dueDateWarningEnabled, setDueDateWarningEnabled] = useState(config.rules.dueDateWarningEnabled)
  const [suspensionNoticeEnabled, setSuspensionNoticeEnabled] = useState(config.rules.suspensionNoticeEnabled)
  const [templates, setTemplates] = useState(config.templates)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Por valor: guardar la conexión devuelve otro objeto y no debe borrar lo que se está editando aquí.
  const savedRules = JSON.stringify(config.rules)
  const savedTemplates = JSON.stringify(config.templates)
  useEffect(() => {
    const rules: OrganizationWhatsAppConfig['rules'] = JSON.parse(savedRules)
    setReminderDays(rules.reminderDaysBefore.join(', '))
    setDueDateWarningEnabled(rules.dueDateWarningEnabled)
    setSuspensionNoticeEnabled(rules.suspensionNoticeEnabled)
  }, [savedRules])
  useEffect(() => {
    setTemplates(JSON.parse(savedTemplates))
  }, [savedTemplates])

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    setValidationError(null)
    const reminderDaysBefore = reminderDays.trim()
      ? reminderDays.split(',').map((part) => Number(part.trim()))
      : []
    if (
      reminderDaysBefore.some((day) => !Number.isInteger(day) || day < 1 || day > 30) ||
      new Set(reminderDaysBefore).size !== reminderDaysBefore.length
    ) {
      setValidationError('Los días de recordatorio deben ser números únicos entre 1 y 30, separados por comas.')
      return
    }
    updateMutation.mutate({
      id: organizationId,
      data: {
        rules: { reminderDaysBefore, dueDateWarningEnabled, suspensionNoticeEnabled },
        templates: Object.fromEntries(
          manualTemplateFields.map(({ key }) => [key, templates[key]?.trim() || null]),
        ),
      },
    })
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <StepHeading
        title="Cuándo avisar"
        description="Las reglas se evalúan con la fecha de vencimiento del período activo."
      />

      <div className="space-y-2">
        <Label htmlFor={`org-whatsapp-reminder-days-${organizationId}`}>Días antes del vencimiento</Label>
        <Input
          id={`org-whatsapp-reminder-days-${organizationId}`}
          inputMode="numeric"
          placeholder="3, 5"
          value={reminderDays}
          onChange={(event) => setReminderDays(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Escribe días separados por coma, entre 1 y 30. Deja vacío para desactivar estos recordatorios.
        </p>
      </div>

      <ToggleRow
        id={`org-whatsapp-due-warning-${organizationId}`}
        checked={dueDateWarningEnabled}
        onChange={setDueDateWarningEnabled}
        title="Aviso el día de vencimiento"
        description="Envía una advertencia cuando el período pendiente vence hoy."
      />
      <ToggleRow
        id={`org-whatsapp-suspension-notice-${organizationId}`}
        checked={suspensionNoticeEnabled}
        onChange={setSuspensionNoticeEnabled}
        title="Aviso al suspender el servicio"
        description="Envía un mensaje cuando la suscripción cambia de activa a suspendida."
      />

      <details className="rounded-md border border-border bg-surface p-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Avanzado: usar plantillas ya aprobadas en Twilio
        </summary>
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Solo si ya tienes plantillas propias. Deben usar las mismas variables que las de esta página.
          </p>
          {manualTemplateFields.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`org-whatsapp-template-${key}-${organizationId}`}>{label} (Content SID)</Label>
              <Input
                id={`org-whatsapp-template-${key}-${organizationId}`}
                placeholder="HX..."
                value={templates[key] ?? ''}
                onChange={(event) => setTemplates((current) => ({ ...current, [key]: event.target.value }))}
              />
            </div>
          ))}
        </div>
      </details>

      <FormError message={validationError} error={updateMutation.error} />
      <SaveButton pending={updateMutation.isPending} label="Guardar reglas" />
    </form>
  )
}

export function OrganizationWhatsAppSettings({
  organizationId,
  organizationName,
}: OrganizationWhatsAppSettingsProps) {
  const configQuery = useOrganizationWhatsAppConfig(organizationId)
  const config = configQuery.data

  if (configQuery.isError && !config) {
    return (
      <div className="space-y-3 rounded-md border border-destructive/20 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          No se pudo cargar la configuración de WhatsApp para {organizationName}.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => configQuery.refetch()}>
          Reintentar
        </Button>
      </div>
    )
  }
  if (!config) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Cargando configuración de WhatsApp...
      </div>
    )
  }

  const twilioReady = Boolean(
    config.twilio.accountSid &&
      config.twilio.authTokenConfigured &&
      config.twilio.phoneNumber &&
      config.twilio.enabled !== false,
  )
  const hasActiveTemplate = Object.values(config.templates).some(Boolean)

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
            WhatsApp y notificaciones
          </h3>
          <p className="text-xs text-muted-foreground">
            Conexión, plantillas y condiciones de envío para {organizationName}.
          </p>
        </div>
      </div>

      {config.readiness.ready ? (
        <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Todo listo para enviar las notificaciones activas.</span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Falta para activar los avisos</p>
            <ul className="mt-1 list-inside list-disc">
              {config.readiness.missing.map((missing) => <li key={missing}>{missing}</li>)}
            </ul>
          </div>
        </div>
      )}

      {config.readiness.usingLegacyTemplates && (
        <p className="rounded-md border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
          Las plantillas actuales provienen de la configuración antigua del servidor. Al guardar,
          quedarán guardadas explícitamente para esta organización.
        </p>
      )}

      <ConnectionStep organizationId={organizationId} config={config} />
      <div className="border-t border-border pt-4">
        <WhatsAppTemplatesStep organizationId={organizationId} twilioReady={twilioReady} />
      </div>
      <div className="border-t border-border pt-4">
        <WhatsAppWebhooksStep organizationId={organizationId} webhooks={config.webhooks} />
      </div>
      <div className="border-t border-border pt-4">
        <WhatsAppTestStep organizationId={organizationId} disabled={!twilioReady || !hasActiveTemplate} />
      </div>
      <div className="border-t border-border pt-4">
        <RulesSection organizationId={organizationId} config={config} />
      </div>
      <div className="border-t border-border pt-4">
        <WhatsAppFailuresSection organizationId={organizationId} />
      </div>
    </section>
  )
}
