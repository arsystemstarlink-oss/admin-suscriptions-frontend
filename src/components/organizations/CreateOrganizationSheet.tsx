import { useState } from 'react'
import { CreateOrganizationForm } from '@/components/organizations/CreateOrganizationForm'
import { useDiscardChangesGuard } from '@/components/design-system/useDiscardChangesGuard'
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
  const [isDirty, setIsDirty] = useState(false)
  const { guardedOpenChange, discardDialog } = useDiscardChangesGuard({ open, isDirty, onOpenChange })

  return (
    <>
    <Sheet open={open} onOpenChange={guardedOpenChange}>
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
              onDirtyChange={setIsDirty}
              onConfigureWhatsApp={onConfigureWhatsApp}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
    {discardDialog}
    </>
  )
}
