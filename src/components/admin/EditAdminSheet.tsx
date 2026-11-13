import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateAdmin, useDeleteAdmin } from '@/hooks/useAdmins'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog'
import { useDiscardChangesGuard } from '@/components/design-system/useDiscardChangesGuard'
import type { Admin, UpdateAdminRequest } from '@/types/api'
import { getErrorHandler } from '@/lib/error-handler'
import type { ApiError } from '@/types/api'

const editAdminSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
  phone: z
    .string()
    .regex(/^\+58\d{10,11}$/, 'Ingresa un teléfono venezolano válido (10-11 dígitos)')
    .optional()
    .or(z.literal('')),
  newPassword: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[a-zA-Z]/, 'Debe incluir letras')
    .regex(/\d/, 'Debe incluir números')
    .optional()
    .or(z.literal('')),
})

type EditAdminForm = z.infer<typeof editAdminSchema>

interface EditAdminSheetProps {
  admin: Admin
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAdminSheet({ admin, open, onOpenChange }: EditAdminSheetProps) {
  const updateMutation = useUpdateAdmin()
  const deleteMutation = useDeleteAdmin()
  const setTokens = useAuthStore((s) => s.setTokens)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const isSelf = admin?.id === currentUserId
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EditAdminForm>({
    resolver: zodResolver(editAdminSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      newPassword: '',
    },
  })

  useEffect(() => {
    if (open && admin) {
      reset({
        name: admin.name,
        email: admin.email,
        phone: admin.phone || '',
        newPassword: '',
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
        handler.field as 'name' | 'email' | 'phone' | 'newPassword',
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
    const message = handler?.message || apiError.message || 'No se pudo actualizar el administrador'
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
      const response = await updateMutation.mutateAsync({ id: admin.id, data: payload })
      if (response.accessToken && response.refreshToken) {
        setTokens(response.accessToken, response.refreshToken)
      }
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
      const message = handler?.message || err.message || 'No se pudo eliminar el administrador'
      toast.error(message)
      setError(message)
      setShowDeleteConfirm(false)
    }
  }

  const { guardedOpenChange, requestClose, discardDialog } = useDiscardChangesGuard({
    open,
    isDirty,
    isSubmitting: isSubmitting || updateMutation.isPending,
    onOpenChange,
  })

  if (!admin) return null

  return (
    <>
    <Sheet open={open} onOpenChange={guardedOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserCog className="h-5 w-5 text-primary-text shrink-0" />
            </div>
            <div>
              <SheetTitle>Editar administrador</SheetTitle>
              <SheetDescription>
                Modifica los datos de {admin.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
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
                  <p className="text-sm text-destructive">{errors.name.message}</p>
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
                      disabled={isSelf}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                {isSelf && (
                  <p className="text-sm text-muted-foreground">
                    Tu email y tu contraseña se cambian desde tu perfil.
                  </p>
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
                  <p className="text-sm text-destructive">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-admin-password">Nueva contraseña (opcional)</Label>
                <Input
                  id="edit-admin-password"
                  type="password"
                  disabled={isSelf}
                  placeholder="Dejar vacío para mantener la actual"
                  {...register('newPassword')}
                />
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Si cambias la contraseña, el administrador deberá iniciar sesión nuevamente.
                </p>
              </div>
            </div>

          </div>

          <SheetFooter className="flex-row justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={requestClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
                {isSubmitting || updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
    {discardDialog}
    <ConfirmDialog
      open={showDeleteConfirm}
      onOpenChange={setShowDeleteConfirm}
      title="Eliminar administrador"
      description={`¿Eliminar a ${admin.name}? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      pendingLabel="Eliminando..."
      destructive
      isPending={deleteMutation.isPending}
      onConfirm={handleDelete}
    />
    </>
  )
}
