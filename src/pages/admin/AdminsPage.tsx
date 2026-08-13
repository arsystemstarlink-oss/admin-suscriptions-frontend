import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CreateAdminForm } from '@/components/admin/CreateAdminForm'

export function AdminsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Crear Administrador</CardTitle>
          <CardDescription className="mt-1">
            Los administradores adicionales inician sesión con su correo y contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateAdminForm mode="register" />
        </CardContent>
      </Card>
    </div>
  )
}
