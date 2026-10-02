import { useState } from 'react'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { cn } from '@/lib/utils'
import { Download, Share, X } from 'lucide-react'

interface InstallConsultaButtonProps {
  orgName: string
  className?: string
}

function IosInstructions() {
  return (
    <span className="flex items-start gap-1.5 text-left">
      <Share className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        En iPhone toca <strong>Compartir</strong> y luego{' '}
        <strong>Añadir a pantalla de inicio</strong>.
      </span>
    </span>
  )
}

export function InstallConsultaButton({ orgName, className }: InstallConsultaButtonProps) {
  const { canInstall, isInstalled, promptInstall } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (isInstalled || dismissed) return null

  const isIos =
    typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as { MSStream?: unknown }).MSStream

  const handleInstall = async () => {
    setInstalling(true)
    try {
      const outcome = await promptInstall()
      if (outcome === 'accepted') setDismissed(true)
    } finally {
      setInstalling(false)
    }
  }

  // iOS no dispara beforeinstallprompt: mostrar guía directa.
  if (isIos && !canInstall) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-2xl border border-info/20 bg-info/10 p-3 text-info',
          className,
        )}
      >
        <div className="min-w-0 flex-1 text-xs font-medium">
          <p className="font-bold text-foreground">Instala la consulta de {orgName}</p>
          <div className="mt-1 text-muted-foreground">
            <IosInstructions />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="Ocultar guía de instalación"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  if (!canInstall) return null

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/10 p-3',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Download className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-bold text-foreground">
          Instala la consulta de {orgName}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Acceso directo en tu pantalla de inicio.
        </p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className="shrink-0 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
      >
        {installing ? 'Instalando...' : 'Instalar'}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        aria-label="Ocultar botón de instalación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
