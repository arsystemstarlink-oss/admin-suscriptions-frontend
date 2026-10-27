import { CreateOrganizationForm } from '@/components/organizations/CreateOrganizationForm'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Organization } from '@/types/api'

interface CreateOrganizationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfigureWhatsApp?: (organization: Organization) => void
}

export function CreateOrganizationSheet({
  open,
  onOpenChange,
  onConfigureWhatsApp,
}: CreateOrganizationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Crear organización y acceso</SheetTitle>
          <SheetDescription>
            Crea la organización y su cuenta de administrador en un solo paso.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {open && (
            <CreateOrganizationForm
              onSuccess={() => onOpenChange(false)}
              onConfigureWhatsApp={onConfigureWhatsApp}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
