import { useNavigate, Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Satellite, ArrowLeft } from 'lucide-react'
import { CreateAdminForm } from '@/components/admin/CreateAdminForm'

export function SetupPage() {
  const navigate = useNavigate()

  const goToLogin = () => navigate('/login', { replace: true })

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-8">
      <div className="w-full max-w-[560px] animate-fade-slide-up">
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Satellite className="h-7 w-7 text-primary-foreground shrink-0" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AR SYSTEM
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configura tu sistema antes de comenzar
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground">Crear el primer administrador</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Esta opción solo está disponible mientras no exista ningún administrador.
              </p>
            </div>

            <CreateAdminForm mode="setup" onSuccess={goToLogin} onSetupDisabled={goToLogin} />
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <Button variant="ghost" asChild>
            <Link to="/login">
              <ArrowLeft className="h-4 w-4 mr-2 shrink-0" />
              Volver al inicio de sesión
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
