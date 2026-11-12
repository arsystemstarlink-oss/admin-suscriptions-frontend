import { useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { getPushPlatform } from '@/lib/push'

const DISMISSED_KEY = 'pwaInstallPromptDismissedAt'
const DISMISS_DAYS = 30

function wasDismissedRecently(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY))
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function PwaInstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(wasDismissedRecently)
  const [installing, setInstalling] = useState(false)
  const platform = getPushPlatform()
  const isIos = platform === 'ios'

  if (dismissed || isInstalled || (!canInstall && !isIos)) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {
      // Se oculta durante esta visita si no hay almacenamiento disponible.
    }
    setDismissed(true)
  }

  const install = async () => {
    setInstalling(true)
    try {
      const result = await promptInstall()
      if (result === 'accepted') dismiss()
    } finally {
      setInstalling(false)
    }
  }

  return (
    <section
      aria-label="Instalar aplicación"
      className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-foreground"
    >
      <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary-text" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">Instala la app para acceder más rápido</p>
        {isIos ? (
          <p className="mt-1 text-muted-foreground">
            En Safari toca <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />{' '}
            <strong>Compartir</strong> y luego <strong>Añadir a pantalla de inicio</strong>.
          </p>
        ) : (
          <p className="mt-1 text-muted-foreground">Tendrás acceso directo y una experiencia más estable.</p>
        )}
      </div>
      {!isIos && canInstall && (
        <Button type="button" size="sm" onClick={install} disabled={installing} className="shrink-0">
          {installing ? 'Instalando...' : 'Instalar'}
        </Button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ocultar aviso de instalación"
        className="relative shrink-0 rounded-md p-1 text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring before:absolute before:-inset-2 before:content-['']"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  )
}
