import { useNavigate } from 'react-router-dom'
import { Plus, UserPlus, CreditCard } from 'lucide-react'

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      <button
        onClick={() => navigate('/subscriptions/new')}
        className="flex flex-col items-center justify-center p-3 h-[90px] rounded-2xl bg-white border border-primary-100 shadow-sm active:scale-[0.98] active:bg-primary-50 transition-all touch-manipulation dark:bg-primary-900/50 dark:border-primary-800 dark:active:bg-primary-800"
      >
        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 flex items-center justify-center mb-2">
          <Plus className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-bold text-primary-800 dark:text-primary-100 uppercase tracking-wide leading-tight">
          Nueva Sub
        </span>
      </button>

      <button
        onClick={() => navigate('/clients/new')}
        className="flex flex-col items-center justify-center p-3 h-[90px] rounded-2xl bg-white border border-primary-100 shadow-sm active:scale-[0.98] active:bg-primary-50 transition-all touch-manipulation dark:bg-primary-900/50 dark:border-primary-800 dark:active:bg-primary-800"
      >
        <div className="h-10 w-10 rounded-full bg-secondary-100 dark:bg-secondary-900/40 text-secondary-800 dark:text-secondary-400 flex items-center justify-center mb-2">
          <UserPlus className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-bold text-primary-800 dark:text-primary-100 uppercase tracking-wide leading-tight">
          Cliente
        </span>
      </button>

      <button
        onClick={() => navigate('/billing')}
        className="flex flex-col items-center justify-center p-3 h-[90px] rounded-2xl bg-white border border-primary-100 shadow-sm active:scale-[0.98] active:bg-primary-50 transition-all touch-manipulation dark:bg-primary-900/50 dark:border-primary-800 dark:active:bg-primary-800"
      >
        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-2">
          <CreditCard className="h-5 w-5" />
        </div>
        <span className="text-[11px] font-bold text-primary-800 dark:text-primary-100 uppercase tracking-wide leading-tight">
          Cobros
        </span>
      </button>
    </div>
  )
}
