import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePlanDetail, useCreatePlan, useUpdatePlan } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

const planSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  price: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
  description: z.string().optional(),
})

type PlanForm = z.infer<typeof planSchema>

export function PlanFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const { data, isLoading } = usePlanDetail(id!)
  const createMutation = useCreatePlan()
  const updateMutation = useUpdatePlan()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
  })

  useEffect(() => {
    if (isEdit && data) {
      reset({
        name: data.name,
        price: data.price,
        description: data.description || '',
      })
    }
  }, [isEdit, data, reset])

  const onSubmit = async (formData: PlanForm) => {
    setError(null)

    try {
      const payload = {
        ...formData,
        description: formData.description || undefined,
      }

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload })
        toast.success('Plan actualizado correctamente')
        navigate('/config/plans')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Plan creado correctamente')
        navigate('/config/plans')
      }
    } catch {
      setError('Error al guardar el plan. Intente nuevamente.')
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/config/plans">
            <ArrowLeft className="h-5 w-5 shrink-0" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEdit ? 'Editar Plan' : 'Nuevo Plan'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? 'Modificar información del plan' : 'Registrar un nuevo plan'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" {...register('name')} />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Precio mensual *</Label>
                <Input id="price" type="number" step="0.01" {...register('price')} />
                {errors.price && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.price.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...register('description')}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/config/plans">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
