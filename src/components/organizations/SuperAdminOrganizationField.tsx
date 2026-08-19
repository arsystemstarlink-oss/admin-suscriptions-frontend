import type { Control, FieldValues, Path } from 'react-hook-form'
import { Controller } from 'react-hook-form'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizations } from '@/hooks/useOrganizations'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

interface SuperAdminOrganizationFieldProps<T extends FieldValues> {
  control: Control<T>
  error?: string
}

export function SuperAdminOrganizationField<T extends FieldValues>({
  control,
  error,
}: SuperAdminOrganizationFieldProps<T>) {
  const isSuperAdmin = useIsSuperAdmin()
  const { data } = useOrganizations({ limit: 100 }, { enabled: isSuperAdmin })

  if (!isSuperAdmin) return null

  const activeOrganizations = (data?.organizations || []).filter((org) => org.active)

  return (
    <div className="space-y-2.5">
      <Label className="text-primary-800 dark:text-primary-200 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary-400 shrink-0" />
        Organización de destino *
      </Label>
      <Controller
        name={'organizationId' as Path<T>}
        control={control}
        render={({ field }) => (
          <Select value={field.value || ''} onValueChange={field.onChange}>
            <SelectTrigger
              className="h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700"
              aria-invalid={!!error}
            >
              <SelectValue placeholder="Seleccione la organización" />
            </SelectTrigger>
            <SelectContent>
              {activeOrganizations.length === 0 && (
                <p className="py-3 px-2 text-sm text-muted-foreground text-center">
                  No hay organizaciones activas disponibles
                </p>
              )}
              {activeOrganizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
      )}
    </div>
  )
}
