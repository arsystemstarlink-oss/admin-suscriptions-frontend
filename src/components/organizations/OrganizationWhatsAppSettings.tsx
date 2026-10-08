import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ClipboardCopy, LoaderCircle, MessageCircle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  useOrganizationWhatsAppConfig,
  useUpdateOrganizationWhatsAppConfig,
} from '@/hooks/useOrganizations'
import type { OrganizationWhatsAppConfig } from '@/types/api'

interface OrganizationWhatsAppSettingsProps {
  organizationId: string
  organizationName: string
}

interface WhatsAppFormState {
  accountSid: string
  authToken: string
  phoneNumber: string
  twilioEnabled: boolean
  reminderDaysBefore: string
  dueDateWarningEnabled: boolean
  suspensionNoticeEnabled: boolean
  reminderTemplate: string
  dueDateWarningTemplate: string
  suspensionNoticeTemplate: string
}

const DEFAULT_DUE_DATE_WARNING_DRAFT =
  'Hola {{1}}, el servicio asociado al kit {{2}} tiene un período vencido desde el {{3}}. Por favor, comunícate con nosotros para regularizar el pago.'

function getFormState(config: OrganizationWhatsAppConfig): WhatsAppFormState {
  return {
    accountSid: config.twilio.accountSid || '',
    authToken: '',
    phoneNumber: config.twilio.phoneNumber || '',
    twilioEnabled: config.twilio.enabled !== false,
    reminderDaysBefore: config.rules.reminderDaysBefore.join(', '),
    dueDateWarningEnabled: config.rules.dueDateWarningEnabled,
    suspensionNoticeEnabled: config.rules.suspensionNoticeEnabled,
    reminderTemplate: config.templates.reminder || '',
    dueDateWarningTemplate: config.templates.dueDateWarning || '',
    suspensionNoticeTemplate: config.templates.suspensionNotice || '',
  }
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

export function OrganizationWhatsAppSettings({
  organizationId,
  organizationName,
}: OrganizationWhatsAppSettingsProps) {
  const configQuery = useOrganizationWhatsAppConfig(organizationId)
  const updateMutation = useUpdateOrganizationWhatsAppConfig()
  const [form, setForm] = useState<WhatsAppFormState | null>(null)
  const [dueDateWarningDraft, setDueDateWarningDraft] = useState(DEFAULT_DUE_DATE_WARNING_DRAFT)
  const [removeAuthToken, setRemoveAuthToken] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!configQuery.data) return
    setForm(getFormState(configQuery.data))
    setRemoveAuthToken(false)
    setValidationError(null)
  }, [configQuery.data])

  useEffect(() => {
    setDueDateWarningDraft(DEFAULT_DUE_DATE_WARNING_DRAFT)
  }, [organizationId])

  const updateForm = <K extends keyof WhatsAppFormState>(key: K, value: WhatsAppFormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current))
  }

  const copyDueDateWarningDraft = async () => {
    const missingVariables = ['{{1}}', '{{2}}', '{{3}}'].filter(
      (variable) => !dueDateWarningDraft.includes(variable),
    )
    if (missingVariables.length > 0) {
      toast.error(`Incluye las variables requeridas: ${missingVariables.join(', ')}.`)
      return
    }

    try {
      await navigator.clipboard.writeText(dueDateWarningDraft)
      toast.success('Borrador copiado. Pégalo en Twilio para solicitar la aprobación.')
    } catch {
      toast.error('No se pudo copiar el borrador. Revisa los permisos del portapapeles.')
    }
  }

  const save = async () => {
    if (!form) return
    setValidationError(null)

    const reminderDaysBefore = form.reminderDaysBefore.trim()
      ? form.reminderDaysBefore.split(',').map((part) => Number(part.trim()))
      : []
    if (
      reminderDaysBefore.some((day) => !Number.isInteger(day) || day < 1 || day > 30) ||
      new Set(reminderDaysBefore).size !== reminderDaysBefore.length
    ) {
      setValidationError('Los días de recordatorio deben ser números únicos entre 1 y 30, separados por comas.')
      return
    }
    if (form.phoneNumber.trim() && !/^\+?[1-9]\d{1,14}$/.test(form.phoneNumber.trim())) {
      setValidationError('El número de WhatsApp debe usar formato internacional, por ejemplo +584223552626.')
      return
    }

    const twilio: NonNullable<Parameters<typeof updateMutation.mutateAsync>[0]['data']['twilio']> = {
      accountSid: form.accountSid.trim(),
      phoneNumber: form.phoneNumber.trim(),
      enabled: form.twilioEnabled,
    }
    if (removeAuthToken) {
      twilio.authToken = null
    } else if (form.authToken.trim()) {
      twilio.authToken = form.authToken.trim()
    }

    try {
      const updated = await updateMutation.mutateAsync({
        id: organizationId,
        data: {
          twilio,
          rules: {
            reminderDaysBefore,
            dueDateWarningEnabled: form.dueDateWarningEnabled,
            suspensionNoticeEnabled: form.suspensionNoticeEnabled,
          },
          templates: {
            reminder: form.reminderTemplate.trim() || null,
            dueDateWarning: form.dueDateWarningTemplate.trim() || null,
            suspensionNotice: form.suspensionNoticeTemplate.trim() || null,
          },
        },
      })
      setForm(getFormState(updated))
      setRemoveAuthToken(false)
    } catch {
      // The mutation hook reports API failures through the standard error handler.
    }
  }

  if (configQuery.isLoading || !form) {
    if (configQuery.isError) {
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
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Cargando configuración de WhatsApp...
      </div>
    )
  }

  const readiness = configQuery.data?.readiness

  return (
    <section className="space-y-5" aria-labelledby="organization-whatsapp-title">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <h3 id="organization-whatsapp-title" className="text-sm font-semibold text-foreground">
            WhatsApp y notificaciones
          </h3>
          <p className="text-xs text-muted-foreground">
            Credenciales, plantillas y condiciones de envío para {organizationName}.
          </p>
        </div>
      </div>

      {readiness?.ready ? (
        <div className="flex items-start gap-2 rounded-md border border-success/20 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>La configuración tiene los requisitos para enviar las notificaciones activas.</span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/10 p-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Configuración incompleta</p>
            <ul className="mt-1 list-inside list-disc">
              {(readiness?.missing || []).map((missing) => <li key={missing}>{missing}</li>)}
            </ul>
          </div>
        </div>
      )}

      {readiness?.usingLegacyTemplates && (
        <p className="rounded-md border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
          Las plantillas actuales provienen de la configuración antigua del servidor. Al guardar,
          quedarán guardadas explícitamente para esta organización.
        </p>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-foreground">Conexión Twilio</h4>
          <p className="text-xs text-muted-foreground">
            Usa las credenciales y el número de WhatsApp Business de esta organización.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-whatsapp-account-sid">Account SID</Label>
          <Input
            id="org-whatsapp-account-sid"
            autoComplete="off"
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={form.accountSid}
            onChange={(event) => updateForm('accountSid', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="org-whatsapp-auth-token">Auth Token</Label>
            {configQuery.data?.twilio.authTokenConfigured && (
              <button
                type="button"
                className="text-xs font-medium text-destructive hover:underline"
                onClick={() => {
                  setRemoveAuthToken((current) => !current)
                  updateForm('authToken', '')
                }}
              >
                {removeAuthToken ? 'Cancelar borrado' : 'Borrar token guardado'}
              </button>
            )}
          </div>
          <Input
            id="org-whatsapp-auth-token"
            type="password"
            autoComplete="new-password"
            disabled={removeAuthToken}
            placeholder={
              removeAuthToken
                ? 'Se eliminará al guardar'
                : configQuery.data?.twilio.authTokenConfigured
                  ? '•••••••• (vacío para conservar el actual)'
                  : 'Auth Token de Twilio'
            }
            value={form.authToken}
            onChange={(event) => updateForm('authToken', event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-whatsapp-phone">Número de WhatsApp Business</Label>
          <Input
            id="org-whatsapp-phone"
            autoComplete="off"
            placeholder="+584223552626"
            value={form.phoneNumber}
            onChange={(event) => updateForm('phoneNumber', event.target.value)}
          />
        </div>

        <ToggleRow
          id="org-whatsapp-enabled"
          checked={form.twilioEnabled}
          onChange={(checked) => updateForm('twilioEnabled', checked)}
          title="Habilitar WhatsApp para esta organización"
          description="Al desactivarlo, el cron sigue procesando períodos pero no se envían mensajes."
        />
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div>
          <h4 className="text-sm font-medium text-foreground">Reglas de notificación</h4>
          <p className="text-xs text-muted-foreground">
            Las reglas se evalúan con la fecha de vencimiento del período activo.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-whatsapp-reminder-days">Días antes del vencimiento</Label>
          <Input
            id="org-whatsapp-reminder-days"
            inputMode="numeric"
            placeholder="3, 5"
            value={form.reminderDaysBefore}
            onChange={(event) => updateForm('reminderDaysBefore', event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Escribe días separados por coma, entre 1 y 30. Deja vacío para desactivar estos
            recordatorios. El valor inicial es 3.
          </p>
        </div>

        <ToggleRow
          id="org-whatsapp-due-warning"
          checked={form.dueDateWarningEnabled}
          onChange={(checked) => updateForm('dueDateWarningEnabled', checked)}
          title="Aviso el día de vencimiento"
          description="Envía una advertencia cuando el período pendiente vence hoy."
        />
        <ToggleRow
          id="org-whatsapp-suspension-notice"
          checked={form.suspensionNoticeEnabled}
          onChange={(checked) => updateForm('suspensionNoticeEnabled', checked)}
          title="Aviso al suspender el servicio"
          description="Envía un mensaje cuando la suscripción cambia de activa a suspendida."
        />
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <div>
          <h4 className="text-sm font-medium text-foreground">Plantillas aprobadas de Twilio</h4>
          <p className="text-xs text-muted-foreground">
            Configura el Content SID que existe en la cuenta Twilio de la organización.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-whatsapp-reminder-template">Plantilla de recordatorio</Label>
          <Input
            id="org-whatsapp-reminder-template"
            placeholder="HX..."
            value={form.reminderTemplate}
            onChange={(event) => updateForm('reminderTemplate', event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Variables: {'{1}'} nombre del cliente, {'{2}'} fecha de vencimiento.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-whatsapp-due-template-draft">Borrador personalizado del aviso de vencimiento</Label>
          <textarea
            id="org-whatsapp-due-template-draft"
            value={dueDateWarningDraft}
            onChange={(event) => setDueDateWarningDraft(event.target.value)}
            rows={4}
            className="w-full resize-y rounded-md border border-input bg-surface-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Escribe aquí el texto que quieres enviar a revisión de WhatsApp."
          />
          <p className="text-xs text-muted-foreground">
            Personaliza el texto y conserva {'{{1}}'} nombre, {'{{2}}'} kit y {'{{3}}'} fecha de vencimiento.
            Copia el borrador y solicita su aprobación en Twilio; este formulario no lo envía ni lo somete.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={copyDueDateWarningDraft}
            disabled={!dueDateWarningDraft.trim()}
          >
            <ClipboardCopy className="mr-2 h-4 w-4" />
            Copiar para solicitar aprobación
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-whatsapp-due-template">Content SID aprobado del aviso de vencimiento</Label>
          <Input
            id="org-whatsapp-due-template"
            placeholder="HX..."
            value={form.dueDateWarningTemplate}
            onChange={(event) => updateForm('dueDateWarningTemplate', event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Pega aquí el Content SID después de que Twilio apruebe el borrador.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-whatsapp-suspension-template">Plantilla de aviso de suspensión</Label>
          <Input
            id="org-whatsapp-suspension-template"
            placeholder="HX..."
            value={form.suspensionNoticeTemplate}
            onChange={(event) => updateForm('suspensionNoticeTemplate', event.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Variables: {'{1}'} nombre del cliente, {'{2}'} kit.
          </p>
        </div>
      </div>

      {validationError && (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {validationError}
        </p>
      )}

      {updateMutation.isError && (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {updateMutation.error instanceof Error
            ? updateMutation.error.message
            : 'No se pudo guardar la configuración de WhatsApp.'}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {updateMutation.isPending ? 'Guardando...' : 'Guardar configuración WhatsApp'}
        </Button>
      </div>
    </section>
  )
}
