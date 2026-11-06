import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const RESTORE_TIMEOUT_MS = 1500

// Se comparte entre layouts para conservar las posiciones al cruzar el breakpoint móvil.
const savedPositions = new Map<string, number>()

/**
 * Sube al inicio al abrir una pantalla nueva y restaura la posición al volver a una
 * ya visitada. "Volver" y los formularios regresan con replace, no con el historial,
 * así que se restaura en toda navegación que no sea PUSH.
 */
export function useScrollRestoration(containerRef: RefObject<HTMLElement | null>) {
  const { pathname, search } = useLocation()
  const navigationType = useNavigationType()
  const currentUrl = useRef(`${pathname}${search}`)
  const currentNavigationType = useRef(navigationType)
  const isRestoring = useRef(false)

  // Antes de que el navegador emita el scroll causado por el cambio de contenido,
  // para que ese evento no sobrescriba la posición guardada de la pantalla anterior.
  useLayoutEffect(() => {
    currentUrl.current = `${pathname}${search}`
    currentNavigationType.current = navigationType
  }, [pathname, search, navigationType])

  useEffect(() => {
    const handleScroll = (event: Event) => {
      const container = containerRef.current
      if (event.target !== container || !container || isRestoring.current) return
      savedPositions.set(currentUrl.current, container.scrollTop)
    }

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', handleScroll, { capture: true })
  }, [containerRef])

  // Solo por pathname: cambiar filtros o búsqueda dentro de una lista no mueve el scroll.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const target =
      currentNavigationType.current === 'PUSH' ? 0 : (savedPositions.get(currentUrl.current) ?? 0)

    if (target === 0) {
      container.scrollTo(0, 0)
      return
    }

    // El contenido puede tardar en alcanzar su altura (carga diferida, datos en caché).
    const deadline = performance.now() + RESTORE_TIMEOUT_MS
    let frame = 0

    const stop = () => {
      isRestoring.current = false
      cancelAnimationFrame(frame)
      container.removeEventListener('wheel', stop)
      container.removeEventListener('touchstart', stop)
    }

    const attempt = () => {
      container.scrollTop = target
      if (Math.abs(container.scrollTop - target) <= 1 || performance.now() >= deadline) {
        stop()
        return
      }
      frame = requestAnimationFrame(attempt)
    }

    isRestoring.current = true
    container.addEventListener('wheel', stop, { passive: true })
    container.addEventListener('touchstart', stop, { passive: true })
    attempt()

    return stop
  }, [pathname, containerRef])
}
