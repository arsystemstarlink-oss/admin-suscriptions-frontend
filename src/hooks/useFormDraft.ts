import { useCallback, useEffect, useRef, useState } from 'react'
import type { FieldValues, UseFormReset, UseFormWatch } from 'react-hook-form'

interface UseFormDraftOptions<T extends FieldValues> {
  key: string
  watch: UseFormWatch<T>
  reset: UseFormReset<T>
  enabled: boolean
}

interface UseFormDraftResult {
  restored: boolean
  clearDraft: () => void
}

export function useFormDraft<T extends FieldValues>({
  key,
  watch,
  reset,
  enabled,
}: UseFormDraftOptions<T>): UseFormDraftResult {
  const [restored, setRestored] = useState(false)
  const restoredKey = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || restoredKey.current === key) return
    restoredKey.current = key

    try {
      const stored = localStorage.getItem(key)
      if (!stored) return
      const values = JSON.parse(stored) as T
      reset(values)
      setRestored(true)
    } catch {
      localStorage.removeItem(key)
    }
  }, [enabled, key, reset])

  useEffect(() => {
    if (!enabled) return

    const subscription = watch((values) => {
      try {
        localStorage.setItem(key, JSON.stringify(values))
      } catch {
        // El formulario sigue funcionando aunque el almacenamiento esté lleno.
      }
    })
    return () => subscription.unsubscribe()
  }, [enabled, key, watch])

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch {
      // No hay nada que limpiar si el almacenamiento no está disponible.
    }
  }, [key])

  return { restored, clearDraft }
}
