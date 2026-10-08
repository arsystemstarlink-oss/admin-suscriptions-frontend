import { CreateAdminForm } from '@/components/admin/CreateAdminForm'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface CreateAdminSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId?: string
  organizationName?: string
}

export function CreateAdminSheet({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}: CreateAdminSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            {organizationName ? `Agregar administrador a ${organizationName}` : 'Crear nuevo administrador'}
          </SheetTitle>
          <SheetDescription>
            {organizationName
              ? 'Este administrador quedará vinculado a esta organización.'
              : 'Registra un administrador adicional'}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <CreateAdminForm
            mode="register"
            organizationId={organizationId}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
