import { CreateOrganizationForm } from '@/components/organizations/CreateOrganizationForm'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface CreateOrganizationSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrganizationSheet({ open, onOpenChange }: CreateOrganizationSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Crear nueva organización</SheetTitle>
          <SheetDescription>
            Registra una organización adicional
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <CreateOrganizationForm onSuccess={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
