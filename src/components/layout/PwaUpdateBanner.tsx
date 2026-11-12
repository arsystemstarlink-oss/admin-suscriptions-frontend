import { useSyncExternalStore, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  applyPwaUpdate,
  isPwaUpdateAvailable,
  subscribePwaUpdate,
} from '@/lib/pwa-update'

export function PwaUpdateBanner() {
  const available = useSyncExternalStore(
    subscribePwaUpdate,
    isPwaUpdateAvailable,
    () => false,
  )
  const [updating, setUpdating] = useState(false)

  if (!available) return null

  const update = async () => {
    setUpdating(true)
    try {
      await applyPwaUpdate()
    } catch {
      setUpdating(false)
    }
  }

  return (
    <section
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-primary/20 bg-surface-elevated p-3 text-surface-elevated-foreground shadow-xl sm:inset-x-auto sm:bottom-5"
    >
      <Sparkles className="h-5 w-5 shrink-0 text-primary-text" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm">
        Hay una nueva versión disponible. Actualiza para recibir las últimas mejoras.
      </p>
      <Button type="button" size="sm" onClick={update} disabled={updating}>
        <RefreshCw className={updating ? 'animate-spin' : ''} />
        {updating ? 'Actualizando…' : 'Actualizar'}
      </Button>
    </section>
  )
}
