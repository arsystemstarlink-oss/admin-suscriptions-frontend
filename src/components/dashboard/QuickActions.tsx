import { useNavigate } from 'react-router-dom'
import { Plus, UserPlus, CreditCard } from 'lucide-react'

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      <button
        onClick={() => navigate('/subscriptions/new')}
        className="flex flex-col items-center justify-center p-3 h-[90px] rounded-2xl bg-surface text-surface-foreground border border-border shadow-sm active:scale-[0.98] active:bg-surface-active transition-all touch-manipulation"
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
          <Plus className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wide leading-tight">
          Nueva Sub
        </span>
      </button>

      <button
        onClick={() => navigate('/subscriptions/clients/new')}
        className="flex flex-col items-center justify-center p-3 h-[90px] rounded-2xl bg-surface text-surface-foreground border border-border shadow-sm active:scale-[0.98] active:bg-surface-active transition-all touch-manipulation"
      >
        <div className="h-10 w-10 rounded-full bg-secondary/15 text-secondary-foreground flex items-center justify-center mb-2">
          <UserPlus className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wide leading-tight">
          Cliente
        </span>
      </button>

      <button
        onClick={() => navigate('/subscriptions?hasOverdue=true')}
        className="flex flex-col items-center justify-center p-3 h-[90px] rounded-2xl bg-surface text-surface-foreground border border-border shadow-sm active:scale-[0.98] active:bg-surface-active transition-all touch-manipulation"
      >
        <div className="h-10 w-10 rounded-full bg-success/10 text-success flex items-center justify-center mb-2">
          <CreditCard className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-bold text-foreground uppercase tracking-wide leading-tight">
          Cobros
        </span>
      </button>
    </div>
  )
}
