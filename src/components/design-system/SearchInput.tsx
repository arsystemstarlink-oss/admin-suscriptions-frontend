import { LoaderCircle, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** Muestra que los resultados se están actualizando para lo escrito. */
  loading?: boolean
  className?: string
}

export function SearchInput({ value, onChange, placeholder, loading, className }: SearchInputProps) {
  const IconComponent = loading ? LoaderCircle : Search

  return (
    <div className={cn('relative', className)}>
      <IconComponent
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0',
          loading && 'animate-spin',
        )}
        aria-hidden="true"
      />
      <Input
        placeholder={placeholder}
        aria-label={placeholder}
        aria-busy={loading || undefined}
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Escape limpia la búsqueda (atajo habitual en escritorio).
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            onChange('')
          }
          // En móvil, "Buscar" del teclado lo oculta para dejar ver los resultados.
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        className={cn('pl-9 sm:pl-10 h-10 sm:h-12 rounded-xl text-base shadow-sm', value && 'pr-10')}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpiar búsqueda"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch-manipulation"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
