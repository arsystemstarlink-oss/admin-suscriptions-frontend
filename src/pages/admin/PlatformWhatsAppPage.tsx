import { Card, CardContent } from '@/components/ui/card'
import { OrganizationWhatsAppSettings } from '@/components/organizations/OrganizationWhatsAppSettings'
import { PLATFORM_WHATSAPP_ID } from '@/lib/whatsapp-setup'

/** La cuenta de WhatsApp con la que envían las organizaciones que no usan número propio. */
export function PlatformWhatsAppPage() {
  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="mx-auto max-w-2xl">
          <OrganizationWhatsAppSettings organizationId={PLATFORM_WHATSAPP_ID} organizationName="la plataforma" />
        </div>
      </CardContent>
    </Card>
  )
}
