import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateOrganization, useDeleteOrganization } from '@/hooks/useOrganizations'
import { getErrorHandler } from '@/lib/error-handler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Building2, MessageCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiError, Organization, OrganizationTwilioConfigRequest } from '@/types/api'

const editOrganizationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Solo minúsculas, números y guiones')
    .optional()
    .or(z.literal('')),
  active: z.enum(['true', 'false']),
  twilioAccountSid: z.string().optional().or(z.literal('')),
  twilioAuthToken: z.string().optional().or(z.literal('')),
  twilioPhoneNumber: z
    .string()
    .refine(
      (value) => value === '' || /^\+?[1-9]\d{1,14}$/.test(value),
      'Número inválido. Use formato E.164, ej. +584223552626',
    )
    .optional(),
  twilioEnabled: z.enum(['true', 'false']),
})

type EditOrganizationForm = z.infer<typeof editOrganizationSchema>

interface EditOrganizationModalProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditOrganizationModal({ organization, open, onOpenChange }: EditOrganizationModalProps) {
  const updateMutation = useUpdateOrganization()
  const deleteMutation = useDeleteOrganization()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteAuthToken, setDeleteAuthToken] = useState(false)
  const [showRemoveTwilioConfirm, setShowRemoveTwilioConfirm] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<EditOrganizationForm>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      active: 'true',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioPhoneNumber: '',
      twilioEnabled: 'true',
    },
  })

  useEffect(() => {
    if (open && organization) {
      reset({
        name: organization.name,
        slug: organization.slug || '',
        active: organization.active ? 'true' : 'false',
        twilioAccountSid: organization.twilio?.accountSid || '',
        twilioAuthToken: '',
        twilioPhoneNumber: organization.twilio?.phoneNumber || '',
        twilioEnabled: organization.twilio?.enabled === false ? 'false' : 'true',
      })
      setError(null)
      setShowDeleteConfirm(false)
      setDeleteAuthToken(false)
      setShowRemoveTwilioConfirm(false)
    }
  }, [open, organization, reset])

  const onSubmit = async (data: EditOrganizationForm) => {
    setError(null)
    try {
      const twilioPayload: OrganizationTwilioConfigRequest = {
        accountSid: data.twilioAccountSid?.trim() || '',
        phoneNumber: data.twilioPhoneNumber?.trim() || '',
        enabled: data.twilioEnabled === 'true',
      }
      if (deleteAuthToken) {
        twilioPayload.authToken = null
      } else if (data.twilioAuthToken?.trim()) {
        twilioPayload.authToken = data.twilioAuthToken.trim()
      }

      await updateMutation.mutateAsync({
        id: organization.id,
        data: {
          name: data.name.trim(),
          slug: data.slug?.trim() || undefined,
          active: data.active === 'true',
          twilio: twilioPayload,
        },
      })
      onOpenChange(false)
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      if (handler?.type === 'field-error' && handler.field) {
        setFormError(handler.field as 'name' | 'slug', {
          type: 'manual',
          message: handler.message,
        })
      } else {
        const message = handler?.message || apiError.message || 'Error al actualizar la organización'
        toast.error(message)
        setError(message)
      }
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteMutation.mutateAsync(organization.id)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      const message = handler?.message || apiError.message || 'Error al eliminar la organización'
      toast.error(message)
      setError(message)
      setShowDeleteConfirm(false)
    }
  }

  const handleRemoveTwilio = async () => {
    setError(null)
    try {
      await updateMutation.mutateAsync({
        id: organization.id,
        data: { twilio: null },
      })
      setShowRemoveTwilioConfirm(false)
      onOpenChange(false)
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      const message =
        handler?.message || apiError.message || 'Error al quitar la configuración de Twilio'
      toast.error(message)
      setError(message)
      setShowRemoveTwilioConfirm(false)
    }
  }

  if (!organization) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-600 dark:text-primary-300 shrink-0" />
              </div>
              <div>
                <DialogTitle>Editar Organización</DialogTitle>
                <DialogDescription>
                  Modifica los datos de {organization.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-org-name">Nombre *</Label>
                <Input
                  id="edit-org-name"
                  placeholder="Nombre de la organización"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-slug">Slug</Label>
                <Input
                  id="edit-org-slug"
                  placeholder="Ej. starlink-valencia"
                  {...register('slug')}
                />
                {errors.slug && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-active">Estado *</Label>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit-org-active">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Activa</SelectItem>
                        <SelectItem value="false">Inactiva</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Las organizaciones inactivas no pueden recibir nuevos administradores.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary-600 dark:text-primary-300 shrink-0" />
                <h4 className="text-sm font-semibold text-foreground">WhatsApp (Twilio)</h4>
              </div>

              {!organization.twilioConfigured && (
                <div className="flex items-start gap-2 rounded-md p-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    WhatsApp no está configurado. Sin credenciales válidas, esta organización no
                    podrá enviar ni recibir notificaciones de WhatsApp.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-org-twilio-sid">Account SID</Label>
                  <Input
                    id="edit-org-twilio-sid"
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                    {...register('twilioAccountSid')}
                  />
                  {errors.twilioAccountSid && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.twilioAccountSid.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="edit-org-twilio-token">Auth Token</Label>
                    {organization.twilio?.authTokenSet && (
                      <button
                        type="button"
                        onClick={() => setDeleteAuthToken(!deleteAuthToken)}
                        className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                      >
                        {deleteAuthToken ? 'Cancelar borrado' : 'Borrar token'}
                      </button>
                    )}
                  </div>
                  <Input
                    id="edit-org-twilio-token"
                    type="password"
                    autoComplete="new-password"
                    disabled={deleteAuthToken}
                    placeholder={
                      deleteAuthToken
                        ? 'Se eliminará al guardar'
                        : organization.twilio?.authTokenSet
                          ? '•••••••• (dejar vacío para conservar el actual)'
                          : 'Auth Token de Twilio'
                    }
                    {...register('twilioAuthToken')}
                  />
                  {errors.twilioAuthToken && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.twilioAuthToken.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-org-twilio-phone">Número de WhatsApp</Label>
                  <Input
                    id="edit-org-twilio-phone"
                    placeholder="+584223552626"
                    autoComplete="off"
                    {...register('twilioPhoneNumber')}
                  />
                  {errors.twilioPhoneNumber && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors.twilioPhoneNumber.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-org-twilio-enabled">WhatsApp habilitado</Label>
                  <Controller
                    name="twilioEnabled"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="edit-org-twilio-enabled">
                          <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Habilitado</SelectItem>
                          <SelectItem value="false">Deshabilitado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Requerido para usar WhatsApp. Sin credenciales, la organización no podrá enviar
                    ni recibir notificaciones.
                  </p>
                </div>
              </div>

              {(organization.twilioConfigured ||
                organization.twilio?.accountSid ||
                organization.twilio?.phoneNumber) && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 border-red-200 dark:text-red-400 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => setShowRemoveTwilioConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2 shrink-0" />
                  Quitar configuración Twilio
                </Button>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteMutation.isPending}
              >
                Eliminar
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                  {isSubmitting || updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              </div>
              <div>
                <DialogTitle>Eliminar Organización</DialogTitle>
                <DialogDescription>
                  ¿Está seguro que desea eliminar {organization.name}? Solo es posible si no tiene
                  usuarios asignados.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemoveTwilioConfirm} onOpenChange={setShowRemoveTwilioConfirm}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              </div>
              <div>
                <DialogTitle>Quitar configuración Twilio</DialogTitle>
                <DialogDescription>
                  Se eliminarán las credenciales de WhatsApp de {organization.name}. WhatsApp
                  quedará deshabilitado: no podrá enviar ni recibir notificaciones hasta que se
                  configuren nuevas credenciales.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowRemoveTwilioConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveTwilio}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Quitando...' : 'Quitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
