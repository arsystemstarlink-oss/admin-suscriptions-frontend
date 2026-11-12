import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BellRing, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { getNotificationPermission, getPushPlatform, isStandalone } from '@/lib/push'

const DISMISSED_KEY = 'pushPromptDismissedAt'
const DISMISS_DAYS = 30
// Solo donde el aviso tiene sentido: el inicio y los chats.
const PROMPT_PATHS = ['/dashboard', '/chats']

function wasDismissedRecently(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY))
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/** Invita a activar las notificaciones a quien todavía no las tiene en este dispositivo. */
export function PushPromptBanner() {
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState(wasDismissedRecently)

  if (dismissed || !PROMPT_PATHS.some((path) => pathname.startsWith(path))) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      // Sin storage, el aviso solo se oculta en esta visita
    }
    setDismissed(true)
  }

  return <PushPrompt onDismiss={dismiss} forChats={pathname.startsWith('/chats')} />
}

function PushPrompt({ onDismiss, forChats }: { onDismiss: () => void; forChats: boolean }) {
  const { supported, permission, subscribed, checking, toggling, error, enable } =
    usePushNotifications()
  const [needsInstall] = useState(() => getPushPlatform() === 'ios' && !isStandalone())

  const canEnable = supported && !checking && !subscribed && !error && permission !== 'denied'
  const showInstall = !supported && needsInstall
  if (!canEnable && !showInstall) return null

  const handleEnable = async () => {
    if (await enable()) {
      toast.success('Notificaciones activadas')
    } else if (getNotificationPermission() === 'granted') {
      // Si el usuario rechazó el permiso no es un error: el aviso simplemente se retira.
      toast.error('No se pudieron activar', {
        description: 'Revisa el detalle en Ajustes › Perfil.',
      })
    }
  }

  return (
    <section
      aria-label="Activar notificaciones"
      className="mb-4 flex shrink-0 items-center gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3 text-foreground"
    >
      <BellRing className="h-5 w-5 shrink-0 text-primary-text" />
      <p className="min-w-0 flex-1 text-sm">
        {showInstall
          ? 'Instala la app en tu pantalla de inicio para recibir notificaciones.'
          : forChats
            ? 'Activa las notificaciones para enterarte de los mensajes nuevos.'
            : 'Activa las notificaciones para enterarte de pagos y mensajes nuevos.'}
      </p>
      {showInstall ? (
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link to="/config/profile">Ver cómo</Link>
        </Button>
      ) : (
        <Button size="sm" className="shrink-0" onClick={handleEnable} disabled={toggling}>
          {toggling ? 'Activando…' : 'Activar'}
        </Button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Ahora no"
        className="relative shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring before:absolute before:-inset-2 before:content-['']"
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  )
}
