import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateOrganizationPlanPaymentReport, useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import { BUSINESS_PLANS } from '@/lib/constants'
import { handleApiError } from '@/lib/error-handler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Organization, OrganizationPlanPaymentMethod } from '@/types/api'

const reportSchema = z.object({
  paidAt: z.string().min(1, 'Indica la fecha del pago'),
  method: z.enum(['transferencia', 'usdt', 'efectivo']),
  months: z.number().int().min(1).max(12),
  amount: z.number().positive('El monto debe ser mayor que cero').optional(),
  reference: z.string().max(120, 'Máximo 120 caracteres').optional(),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).superRefine((data, context) => {
  if (data.amount !== undefined && data.amount <= 0) {
    context.addIssue({
      code: 'custom',
      path: ['amount'],
      message: 'El monto debe ser mayor que cero',
    })
  }
})

type ReportForm = z.infer<typeof reportSchema>

interface OrganizationPlanPaymentReportSheetProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrganizationPlanPaymentReportSheet({
  organization,
  open,
  onOpenChange,
}: OrganizationPlanPaymentReportSheetProps) {
  const createMutation = useCreateOrganizationPlanPaymentReport()
  const { data: catalogData, isLoading: catalogLoading } = useBusinessPlans()
  const catalogItem = catalogData?.plans.find((plan) => plan.key === organization.plan)
  const fixedPrice = catalogItem?.priceUsdMonthly ?? null
  const isCustomPlan = organization.plan === 'a-medida'
  const planLabel = BUSINESS_PLANS[organization.plan ?? 'basico'].label

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      paidAt: new Date().toISOString().slice(0, 10),
      method: 'transferencia',
      months: 1,
      amount: fixedPrice ?? undefined,
      reference: '',
      notes: '',
    },
  })
  const method = watch('method')
  const months = watch('months')

  const onSubmit = async (form: ReportForm) => {
    if (isCustomPlan && !form.amount) {
      setError('amount', {
        type: 'manual',
        message: 'Indica el monto acordado para el plan A medida',
      })
      return
    }
    try {
      await createMutation.mutateAsync({
        plan: organization.plan ?? 'basico',
        months: form.months,
        method: form.method,
        paidAt: new Date(`${form.paidAt}T12:00:00.000Z`).toISOString(),
        amount: isCustomPlan ? form.amount : undefined,
        reference: form.reference?.trim() || undefined,
        notes: form.notes?.trim() || undefined,
      })
      onOpenChange(false)
    } catch (error) {
      handleApiError(error)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Reportar pago del plan</SheetTitle>
          <SheetDescription>
            Envía el pago de {planLabel} para que el equipo lo verifique.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-4">
            <div className="rounded-lg border border-border-subtle bg-surface-muted px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold">{planLabel}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Precio mensual</span>
                <span className="font-semibold">
                  {catalogLoading
                    ? 'Cargando...'
                    : fixedPrice !== null
                      ? `${fixedPrice} USD`
                      : 'Monto acordado'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-report-months">Meses a pagar</Label>
              <Select
                value={String(months)}
                onValueChange={(value) => setValue('months', Number(value), { shouldValidate: true })}
              >
                <SelectTrigger id="plan-report-months">
                  <SelectValue placeholder="Selecciona los meses" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 6, 12].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} {value === 1 ? 'mes' : 'meses'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.months && (
                <p className="text-sm text-destructive">{errors.months.message}</p>
              )}
            </div>

            {isCustomPlan && (
              <div className="space-y-2">
                <Label htmlFor="plan-report-amount">Monto acordado en USD</Label>
                <Input
                  id="plan-report-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="plan-report-date">Fecha del pago</Label>
              <Input id="plan-report-date" type="date" {...register('paidAt')} />
              {errors.paidAt && (
                <p className="text-sm text-destructive">{errors.paidAt.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-report-method">Método</Label>
              <Select
                value={method}
                onValueChange={(value: OrganizationPlanPaymentMethod) => setValue('method', value)}
              >
                <SelectTrigger id="plan-report-method">
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-report-reference">Referencia</Label>
              <Input
                id="plan-report-reference"
                placeholder="Número de referencia o comprobante"
                {...register('reference')}
              />
              {errors.reference && (
                <p className="text-sm text-destructive">{errors.reference.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-report-notes">Nota (opcional)</Label>
              <Input id="plan-report-notes" placeholder="Detalle adicional" {...register('notes')} />
              {errors.notes && (
                <p className="text-sm text-destructive">{errors.notes.message}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              El pago queda en verificación. Cuando se apruebe, el vencimiento se calcula
              automáticamente según el día de corte de tu organización.
            </p>
          </div>
          <SheetFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || createMutation.isPending}
            >
              {isSubmitting || createMutation.isPending ? 'Enviando...' : 'Enviar reporte'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
