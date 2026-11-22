import { useRef, type KeyboardEvent } from 'react'
import { Check } from 'lucide-react'
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { PaymentMethod } from '@/types/api'

interface PaymentMethodPickerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  labelledBy?: string
}

/**
 * Selección de método de pago en un toque: cobrar es la acción más repetida de la app y
 * un desplegable exige abrir, buscar y elegir. Se comporta como un radiogroup (flechas).
 */
export function PaymentMethodPicker({ id, value, onChange, invalid, labelledBy }: PaymentMethodPickerProps) {
  const groupRef = useRef<HTMLDivElement>(null)

  // Un registro legacy (p. ej. Pago Inicial) se muestra para no ocultar el valor guardado.
  const options = value && !PAYMENT_METHOD_OPTIONS.some(([key]) => key === value)
    ? [...PAYMENT_METHOD_OPTIONS, [value as PaymentMethod, PAYMENT_METHOD_LABELS[value as PaymentMethod] ?? value] as const]
    : PAYMENT_METHOD_OPTIONS

  const selectedIndex = options.findIndex(([key]) => key === value)

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1
      : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next][0])
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }

  return (
    <div
      ref={groupRef}
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3"
    >
      {options.map(([key, label], index) => {
        const checked = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked || (selectedIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-medium transition-colors touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              checked
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-surface text-foreground hover:bg-surface-hover',
              invalid && !checked && 'border-destructive/50',
            )}
          >
            {checked && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
