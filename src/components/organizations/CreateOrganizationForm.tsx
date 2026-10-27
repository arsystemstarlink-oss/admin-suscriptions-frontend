import { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOnboardOrganization } from '@/hooks/useOrganizations'
import { useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import { getErrorHandler } from '@/lib/error-handler'
import { getCatalogItem } from '@/lib/business-plan-catalog'
import { organizationsApi } from '@/api/organizations.api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Check, Copy, Link2, LoaderCircle, Mail, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiError, Organization, OrganizationTwilioConfigRequest } from '@/types/api'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const createOrganizationSchema = z
  .object({
    name: z.string().min(1, 'El nombre es requerido'),
    slug: z
      .string()
      .regex(/^[a-z0-9-]*$/, 'Solo minúsculas, números y guiones')
      .optional()
      .or(z.literal('')),
    adminName: z.string().min(1, 'El nombre del administrador es requerido'),
    adminEmail: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
    whatsappMode: z.enum(['later', 'now']),
    twilioAccountSid: z.string().optional().or(z.literal('')),
    twilioAuthToken: z.string().optional().or(z.literal('')),
    twilioPhoneNumber: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, context) => {
    if (data.whatsappMode === 'later') return

    if (!data.twilioAccountSid?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['twilioAccountSid'],
        message: 'El Account SID es requerido para configurar WhatsApp ahora',
      })
    } else if (!/^AC[0-9a-fA-F]{32}$/.test(data.twilioAccountSid.trim())) {
      context.addIssue({
        code: 'custom',
        path: ['twilioAccountSid'],
        message: 'El Account SID debe empezar por AC y tener 32 caracteres',
      })
    }

    if (!data.twilioAuthToken?.trim()) {
      context.addIssue({
        code: 'custom',
        path: ['twilioAuthToken'],
        message: 'El Auth Token es requerido para configurar WhatsApp ahora',
      })
    }

    const phone = data.twilioPhoneNumber?.trim() ?? ''
    if (!phone) {
      context.addIssue({
        code: 'custom',
        path: ['twilioPhoneNumber'],
        message: 'El número de WhatsApp es requerido para configurar WhatsApp ahora',
      })
    } else if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      context.addIssue({
        code: 'custom',
        path: ['twilioPhoneNumber'],
        message: 'Número inválido. Use formato E.164, ej. +584223552626',
      })
    }
  })

type OrganizationForm = z.infer<typeof createOrganizationSchema>

type OrganizationField = keyof OrganizationForm

const ORGANIZATION_ERROR_FIELDS: Record<string, OrganizationField> = {
  name: 'name',
  slug: 'slug',
  email: 'adminEmail',
  adminName: 'adminName',
  adminEmail: 'adminEmail',
  twilioAccountSid: 'twilioAccountSid',
  twilioAuthToken: 'twilioAuthToken',
  twilioPhoneNumber: 'twilioPhoneNumber',
}

function getDefaultValues(): OrganizationForm {
  return {
    name: '',
    slug: '',
    adminName: '',
    adminEmail: '',
    whatsappMode: 'later',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
  }
}

function buildInviteUrl(token: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}invite/${encodeURIComponent(token)}`
}

function formatShortDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

interface CreateOrganizationFormProps {
  onSuccess?: () => void
  onConfigureWhatsApp?: (organization: Organization) => void
}

export function CreateOrganizationForm({
  onSuccess,
  onConfigureWhatsApp,
}: CreateOrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<{
    loading: boolean
    available: boolean | null
    suggestion: string | null
  }>({ loading: false, available: null, suggestion: null })
  const [createdOrganization, setCreatedOrganization] = useState<Organization | null>(null)
  const [createdInvite, setCreatedInvite] = useState<{
    organizationName: string
    email: string
    url: string
    expiresAt: string
    whatsappConfigured: boolean
  } | null>(null)
  const createMutation = useOnboardOrganization()
  const { data: catalogData } = useBusinessPlans()
  const basicPlan = getCatalogItem(catalogData?.plans, 'basico')

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrganizationForm>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: getDefaultValues(),
  })

  const name = watch('name')
  const slug = watch('slug')
  const whatsappMode = watch('whatsappMode')

  const suggestedSlug = useMemo(() => slugify(name), [name])
  const previewSlug = (slug?.trim() || suggestedSlug) || 'se-generara'
  const consultationUrl = createdOrganization?.slug
    ? `${window.location.origin}${import.meta.env.BASE_URL}consulta/${encodeURIComponent(createdOrganization.slug)}`
    : null

  useEffect(() => {
    if (!previewSlug || previewSlug === 'se-generara') {
      setSlugStatus({ loading: false, available: null, suggestion: null })
      return
    }
    let cancelled = false
    setSlugStatus((current) => ({ ...current, loading: true }))
    const timer = window.setTimeout(async () => {
      try {
        const result = await organizationsApi.checkSlug(previewSlug)
        if (!cancelled) {
          setSlugStatus({
            loading: false,
            available: result.available,
            suggestion: result.suggestion,
          })
        }
      } catch {
        if (!cancelled) {
          setSlugStatus({ loading: false, available: null, suggestion: null })
        }
      }
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [previewSlug])

  const handleNameChange = (value: string) => {
    if (!slugEdited) {
      setValue('slug', slugify(value), { shouldValidate: false })
    }
  }

  const onSubmit = async (data: OrganizationForm) => {
    setIsSubmitting(true)
    try {
      const configureNow = data.whatsappMode === 'now'
      const twilioPayload: OrganizationTwilioConfigRequest | undefined = configureNow
        ? {
            accountSid: data.twilioAccountSid?.trim() ?? '',
            authToken: data.twilioAuthToken?.trim() ?? '',
            phoneNumber: data.twilioPhoneNumber?.trim() ?? '',
            enabled: true,
          }
        : undefined

      const response = await createMutation.mutateAsync({
        organization: {
          name: data.name.trim(),
          slug: data.slug?.trim() || suggestedSlug || undefined,
          ...(twilioPayload ? { twilio: twilioPayload } : {}),
        },
        admin: {
          name: data.adminName.trim(),
          email: data.adminEmail.trim(),
          invite: true,
        },
      })

      setCreatedOrganization(response.organization)
      setCreatedInvite({
        organizationName: response.organization.name,
        email: response.admin.email,
        url: response.invite ? buildInviteUrl(response.invite.token) : '',
        expiresAt: response.invite?.expiresAt ?? '',
        whatsappConfigured: Boolean(twilioPayload),
      })
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      if (handler?.type === 'field-error' && handler.field) {
        const field = ORGANIZATION_ERROR_FIELDS[handler.field]
        if (field) {
          setError(field, {
            type: 'manual',
            message: handler.message,
          })
        } else {
          toast.error(handler.message)
        }
      } else {
        toast.error(handler?.message || apiError.message || 'Error al crear la organización')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdInvite) {
    const inviteText =
      `Organización: ${createdInvite.organizationName}\n` +
      `Correo: ${createdInvite.email}\n` +
      `Enlace de acceso: ${createdInvite.url}` +
      (consultationUrl ? `\nEnlace de consulta: ${consultationUrl}` : '')

    const copyInvite = async () => {
      try {
        await navigator.clipboard.writeText(inviteText)
        toast.success('Invitación copiada')
      } catch {
        window.prompt('Copia la invitación y envíasela al administrador:', inviteText)
      }
    }

    const copyInviteUrl = async () => {
      try {
        await navigator.clipboard.writeText(createdInvite.url)
        toast.success('Enlace de acceso copiado')
      } catch {
        window.prompt('Copia el enlace de acceso:', createdInvite.url)
      }
    }

    const copyConsultationLink = async () => {
      if (!consultationUrl) return
      try {
        await navigator.clipboard.writeText(consultationUrl)
        toast.success('Enlace de consulta copiado')
      } catch {
        window.prompt('Copia el enlace de consulta:', consultationUrl)
      }
    }

    return (
      <section className="space-y-4" aria-labelledby="organization-created-title">
        <div className="rounded-xl border border-success/20 bg-success/10 p-4">
          <h3 id="organization-created-title" className="font-semibold">
            Organización creada. Falta enviar el acceso.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            La organización quedó con el plan Básico y {basicPlan?.trialDays ?? '—'} días de prueba
            {createdOrganization?.trialEndsAt
              ? ` (hasta ${formatShortDate(createdOrganization.trialEndsAt)})`
              : ''}
            .
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <p className="font-medium">Invitación para el administrador</p>
          <div>
            <p className="text-sm text-muted-foreground">Organización</p>
            <p className="font-medium">{createdInvite.organizationName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Correo</p>
            <p className="break-all font-medium">{createdInvite.email}</p>
          </div>
          {createdInvite.url ? (
            <div className="space-y-2">
              <Label htmlFor="created-invite-url">Enlace de acceso</Label>
              <div className="flex gap-2">
                <Input id="created-invite-url" type="text" readOnly value={createdInvite.url} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void copyInviteUrl()}
                  aria-label="Copiar enlace de acceso"
                  title="Copiar enlace de acceso"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                El administrador definirá su contraseña al abrirlo.
                {createdInvite.expiresAt
                  ? ` Vence el ${formatShortDate(createdInvite.expiresAt)}.`
                  : ''}
              </p>
            </div>
          ) : (
            <p className="text-sm text-warning">
              No se recibió el enlace de invitación. La organización quedó creada; contacta al
              soporte para generar un acceso nuevo.
            </p>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <p className="font-medium">Siguientes pasos</p>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <span>Envía el enlace de acceso al correo {createdInvite.email}.</span>
            </div>
            {consultationUrl && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>Comparte el enlace público de consulta con sus clientes.</span>
                </div>
                <div className="flex gap-2">
                  <Input readOnly value={consultationUrl} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => void copyConsultationLink()}
                    aria-label="Copiar enlace de consulta"
                    title="Copiar enlace de consulta"
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              {createdInvite.whatsappConfigured ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              ) : (
                <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              )}
              <span>
                {createdInvite.whatsappConfigured
                  ? 'WhatsApp quedó conectado con las credenciales de la organización.'
                  : 'WhatsApp quedó sin configurar. La organización debe usar su propio número, exclusivo, para activarlo.'}
              </span>
            </div>
          </div>
          {!createdInvite.whatsappConfigured && onConfigureWhatsApp && createdOrganization && (
            <Button
              type="button"
              variant="outline"
              onClick={() => onConfigureWhatsApp(createdOrganization)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Configurar WhatsApp ahora
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copyInvite()}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar invitación
          </Button>
          <Button
            type="button"
            onClick={() => {
              setCreatedInvite(null)
              setCreatedOrganization(null)
              setSlugEdited(false)
              setSlugStatus({ loading: false, available: null, suggestion: null })
              reset(getDefaultValues())
              onSuccess?.()
            }}
          >
            Cerrar y limpiar
          </Button>
        </div>
      </section>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Nombre *</Label>
          <Input
            id="org-name"
            placeholder="Ej. Starlink Valencia"
            aria-required="true"
            {...register('name', { onChange: (event) => handleNameChange(event.target.value) })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="org-slug">Slug (opcional)</Label>
            {slugEdited && suggestedSlug && (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => {
                  setSlugEdited(false)
                  setValue('slug', suggestedSlug, { shouldValidate: true })
                }}
              >
                Usar el generado
              </button>
            )}
          </div>
          <Input
            id="org-slug"
            placeholder="Ej. starlink-valencia"
            {...register('slug', { onChange: () => setSlugEdited(true) })}
          />
          {errors.slug && (
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enlace público: <span className="font-medium">/consulta/{previewSlug}</span>
            {!slugEdited && ' · se genera desde el nombre'}
          </p>
          {slugStatus.loading && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <LoaderCircle className="h-3 w-3 animate-spin" />
              Comprobando disponibilidad...
            </p>
          )}
          {!slugStatus.loading && slugStatus.available === true && (
            <p className="text-xs text-success">Slug disponible.</p>
          )}
          {!slugStatus.loading && slugStatus.available === false && (
            <p className="text-xs text-warning">
              Ya está en uso.{' '}
              {slugStatus.suggestion ? (
                <>
                  Se usará{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => {
                      setSlugEdited(true)
                      setValue('slug', slugStatus.suggestion!, { shouldValidate: true })
                    }}
                  >
                    /consulta/{slugStatus.suggestion}
                  </button>
                  .
                </>
              ) : null}
            </p>
          )}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Cuenta del administrador</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta persona recibirá la invitación y definirá su propia contraseña al entrar.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-admin-name">Nombre del administrador *</Label>
            <Input
              id="org-admin-name"
              autoComplete="name"
              aria-required="true"
              {...register('adminName')}
            />
            {errors.adminName && (
              <p className="text-sm text-destructive">{errors.adminName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-admin-email">Correo *</Label>
            <Input
              id="org-admin-email"
              type="email"
              autoComplete="email"
              aria-required="true"
              {...register('adminEmail')}
            />
            {errors.adminEmail && (
              <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-3 text-xs text-muted-foreground">
          No necesitas crear ni compartir una contraseña. Al terminar recibirás un enlace de
          invitación de un solo uso para enviar al administrador.
        </div>
      </div>

      <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-sm">
        La organización empezará con el plan Básico, hasta {basicPlan?.clientLimit ?? '—'}{' '}
        clientes y {basicPlan?.trialDays ?? '—'} días de prueba gratis.
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <h4 className="text-sm font-semibold text-foreground">WhatsApp (Twilio)</h4>
        </div>

        <p className="text-xs text-muted-foreground">
          Se puede configurar después. Cada organización debe usar su propio número, y un número
          solo puede pertenecer a una organización.
        </p>

        <Controller
          name="whatsappMode"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => field.onChange('later')}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  field.value === 'later'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-surface hover:bg-surface-muted'
                }`}
              >
                <span className="block text-sm font-medium text-foreground">
                  Configurar más tarde
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Recomendado. El administrador activa WhatsApp con las credenciales y el número de
                  la organización.
                </span>
              </button>
              <button
                type="button"
                onClick={() => field.onChange('now')}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  field.value === 'now'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-surface hover:bg-surface-muted'
                }`}
              >
                <span className="block text-sm font-medium text-foreground">
                  Configurar ahora
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Si ya tienes el Account SID, el Auth Token y el número exclusivo de esta
                  organización.
                </span>
              </button>
            </div>
          )}
        />

        {whatsappMode === 'now' && (
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-twilio-sid">Account SID</Label>
              <Input
                id="org-twilio-sid"
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                {...register('twilioAccountSid')}
              />
              {errors.twilioAccountSid && (
                <p className="text-sm text-destructive">
                  {errors.twilioAccountSid.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-twilio-token">Auth Token</Label>
              <Input
                id="org-twilio-token"
                type="password"
                autoComplete="new-password"
                placeholder="Auth Token de Twilio"
                {...register('twilioAuthToken')}
              />
              {errors.twilioAuthToken && (
                <p className="text-sm text-destructive">
                  {errors.twilioAuthToken.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-twilio-phone">Número de WhatsApp</Label>
              <Input
                id="org-twilio-phone"
                placeholder="+584223552626"
                autoComplete="off"
                {...register('twilioPhoneNumber')}
              />
              {errors.twilioPhoneNumber && (
                <p className="text-sm text-destructive">
                  {errors.twilioPhoneNumber.message}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Debe ser exclusivo de esta organización. Si otra organización ya lo usa, el sistema
                rechazará el alta. Usa formato E.164, ej. +584223552626.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
          {isSubmitting || createMutation.isPending ? 'Creando...' : 'Crear organización e invitación'}
        </Button>
      </div>
    </form>
  )
}
