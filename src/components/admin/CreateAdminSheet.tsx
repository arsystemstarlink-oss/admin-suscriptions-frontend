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
}

export function CreateAdminSheet({ open, onOpenChange }: CreateAdminSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Crear nuevo administrador</SheetTitle>
          <SheetDescription>
            Registra un administrador adicional
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <CreateAdminForm mode="register" onSuccess={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
