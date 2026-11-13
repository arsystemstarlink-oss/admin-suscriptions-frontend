import { useEffect, useState } from 'react'
import { CloudOff, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function ConnectivityBanner() {
  const isOnline = useOnlineStatus()
  const [hadOfflineConnection, setHadOfflineConnection] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setHadOfflineConnection(true)
      return
    }
    if (hadOfflineConnection) {
      toast.success('Conexión restablecida', {
        description: 'La aplicación volverá a sincronizar los datos automáticamente.',
      })
      setHadOfflineConnection(false)
    }
  }, [hadOfflineConnection, isOnline])

  if (isOnline) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex min-h-10 items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-sm font-medium text-warning-foreground shadow-sm"
    >
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Sin conexión. Mostramos los últimos datos disponibles.</span>
    </div>
  )
}

export function OnlineStatusIcon() {
  const isOnline = useOnlineStatus()
  return isOnline ? <Wifi className="h-4 w-4" aria-hidden="true" /> : <CloudOff className="h-4 w-4" aria-hidden="true" />
}
