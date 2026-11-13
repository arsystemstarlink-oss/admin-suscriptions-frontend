import { Card, CardContent } from '@/components/ui/card'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'
import { OrganizationWhatsAppSettings } from '@/components/organizations/OrganizationWhatsAppSettings'
import { useAuthStore } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'

export function WhatsAppSettingsPage() {
  const userOrganizationId = useAuthStore((state) => state.user?.organizationId)
  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const organizationId = userOrganizationId ?? selectedOrganizationId

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        {organizationId ? (
          <div className="mx-auto max-w-2xl">
            <OrganizationWhatsAppSettings
              key={organizationId}
              organizationId={organizationId}
              organizationName="tu organización"
            />
          </div>
        ) : (
          <OrganizationSelectionEmptyState description="Elige una organización para configurar sus avisos por WhatsApp." />
        )}
      </CardContent>
    </Card>
  )
}
