import { useNavigate } from 'react-router-dom'
import { Plus, UserPlus, CreditCard } from 'lucide-react'

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      <button
        onClick={() => navigate('/subscriptions/new', { state: { returnTo: '/dashboard' } })}
        className="flex flex-col items-center justify-center p-3 min-h-[90px] rounded-2xl bg-surface text-surface-foreground border border-border shadow-sm active:scale-[0.98] active:bg-surface-active transition-all touch-manipulation"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary-text flex items-center justify-center mb-2">
          <Plus className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-foreground text-center leading-tight">
          Nueva suscripción
        </span>
      </button>

      <button
        onClick={() => navigate('/subscriptions/clients/new', { state: { returnTo: '/dashboard' } })}
        className="flex flex-col items-center justify-center p-3 min-h-[90px] rounded-2xl bg-surface text-surface-foreground border border-border shadow-sm active:scale-[0.98] active:bg-surface-active transition-all touch-manipulation"
      >
        <div className="h-10 w-10 rounded-full bg-surface-muted text-surface-muted-foreground flex items-center justify-center mb-2">
          <UserPlus className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-foreground text-center leading-tight">
          Nuevo cliente
        </span>
      </button>

      <button
        onClick={() => navigate('/subscriptions?hasOverdue=true')}
        className="flex flex-col items-center justify-center p-3 min-h-[90px] rounded-2xl bg-surface text-surface-foreground border border-border shadow-sm active:scale-[0.98] active:bg-surface-active transition-all touch-manipulation"
      >
        <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
          <CreditCard className="h-5 w-5" />
        </div>
        <span className="text-xs font-bold text-foreground text-center leading-tight">
          Vencidos
        </span>
      </button>
    </div>
  )
}
