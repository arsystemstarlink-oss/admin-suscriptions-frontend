import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateAdmin, useDeleteAdmin } from '@/hooks/useAdmins'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
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
import { AlertTriangle, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import type { Admin, UpdateAdminRequest } from '@/types/api'
import { getErrorHandler } from '@/lib/error-handler'
import type { ApiError } from '@/types/api'

const editAdminSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
  phone: z
    .string()
    .regex(/^\+58\d{10,11}$/, 'Ingrese un teléfono venezolano válido (10-11 dígitos)')
    .optional()
    .or(z.literal('')),
  newPassword: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[a-zA-Z]/, 'Debe incluir letras')
    .regex(/\d/, 'Debe incluir números')
    .optional()
    .or(z.literal('')),
  role: z.enum(['admin', 'super-admin']).optional(),
  organizationId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'admin' && !data.organizationId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['organizationId'],
      message: 'Seleccione una organización.',
    })
  }
})

type EditAdminForm = z.infer<typeof editAdminSchema>

interface EditAdminModalProps {
  admin: Admin
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAdminModal({ admin, open, onOpenChange }: EditAdminModalProps) {
  const updateMutation = useUpdateAdmin()
  const deleteMutation = useDeleteAdmin()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isSuperAdmin = useIsSuperAdmin()
  const canManageTenant = isSuperAdmin && admin?.role !== 'super-admin'

  const { data: organizationsData } = useOrganizations(
    { limit: 100 },
    { enabled: canManageTenant },
  )
  const activeOrganizations = (organizationsData?.organizations || []).filter((o) => o.active)

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError: setFormError,
    formState: { errors, isSubmitting },
  } = useForm<EditAdminForm>({
    resolver: zodResolver(editAdminSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      newPassword: '',
      role: 'admin',
      organizationId: '',
    },
  })

  const watchedRole = watch('role')

  useEffect(() => {
    if (open && admin) {
      reset({
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        newPassword: '',
        role: admin.role,
        organizationId: admin.organizationId || '',
      })
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [open, admin, reset])

  const applyFieldError = (err: unknown): boolean => {
    const apiError = err as Partial<ApiError>
    if (!apiError.code) return false
    const handler = getErrorHandler(apiError.code)
    if (handler.type === 'field-error' && handler.field) {
      setFormError(
        handler.field as 'name' | 'email' | 'phone' | 'newPassword' | 'organizationId',
        {
          type: 'manual',
          message: handler.message,
        }
      )
      return true
    }
    return false
  }

  const showGenericError = (err: unknown) => {
    const apiError = err as Partial<ApiError>
    const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
    const message = handler?.message || apiError.message || 'Error al actualizar el administrador'
    toast.error(message)
    setError(message)
  }

  const onSubmit = async (data: EditAdminForm) => {
    setError(null)
    try {
      const payload: UpdateAdminRequest = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
      }
      if (data.newPassword) {
        payload.newPassword = data.newPassword
      }
      if (canManageTenant && data.role) {
        payload.role = data.role
        payload.organizationId = data.role === 'admin' ? data.organizationId : null
      }
      await updateMutation.mutateAsync({ id: admin.id, data: payload })
      onOpenChange(false)
    } catch (err) {
      if (!applyFieldError(err)) showGenericError(err)
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteMutation.mutateAsync(admin.id)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    } catch (err: any) {
      const handler = err.code ? getErrorHandler(err.code) : undefined
      const message = handler?.message || err.message || 'Error al eliminar el administrador'
      toast.error(message)
      setError(message)
    }
  }

  if (!admin) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                <UserCog className="h-5 w-5 text-primary-600 dark:text-primary-300 shrink-0" />
              </div>
              <div>
                <DialogTitle>Editar Administrador</DialogTitle>
                <DialogDescription>
                  Modifica los datos de {admin.name}
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
                <Label htmlFor="edit-admin-name">Nombre *</Label>
                <Input
                  id="edit-admin-name"
                  placeholder="Nombre del administrador"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-admin-email">Correo *</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <EmailInput
                      id="edit-admin-email"
                      aria-invalid={!!errors.email}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-admin-phone">Teléfono</Label>
                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput
                      id="edit-admin-phone"
                      aria-invalid={!!errors.phone}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p>
                )}
              </div>

              {canManageTenant && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-admin-role">Rol *</Label>
                    <Controller
                      name="role"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="edit-admin-role" aria-invalid={!!errors.role}>
                            <SelectValue placeholder="Selecciona un rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="super-admin">Super administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.role && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {errors.role.message}
                      </p>
                    )}
                  </div>

                  {watchedRole !== 'super-admin' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-admin-organization">Organización *</Label>
                      <Controller
                        name="organizationId"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <SelectTrigger
                              id="edit-admin-organization"
                              aria-invalid={!!errors.organizationId}
                            >
                              <SelectValue placeholder="Selecciona una organización" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeOrganizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.organizationId && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          {errors.organizationId.message}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-admin-password">Nueva contraseña (opcional)</Label>
                <Input
                  id="edit-admin-password"
                  type="password"
                  placeholder="Dejar vacío para mantener la actual"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.newPassword.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Si cambias la contraseña, el administrador deberá iniciar sesión nuevamente.
                </p>
              </div>
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
                <DialogTitle>Eliminar Administrador</DialogTitle>
                <DialogDescription>
                  ¿Está seguro que desea eliminar a {admin.name}?
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
    </>
  )
}
