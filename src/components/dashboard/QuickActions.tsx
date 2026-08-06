import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, UserPlus, FileText } from 'lucide-react'

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground mr-2">Acciones rápidas:</span>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/subscriptions/new')}
          >
            <Plus className="h-4 w-4 shrink-0" />
            Nueva suscripción
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/config/clients/new')}
          >
            <UserPlus className="h-4 w-4 shrink-0" />
            Nuevo cliente
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => navigate('/billing')}
          >
            <FileText className="h-4 w-4 shrink-0" />
            Ver facturación
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
