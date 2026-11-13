export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>

let updateServiceWorker: UpdateServiceWorker | null = null
let updateAvailable = false
let hasUnsavedChanges = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribePwaUpdate(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isPwaUpdateAvailable(): boolean {
  return updateAvailable
}

export function setPwaUpdateHandler(handler: UpdateServiceWorker): void {
  updateServiceWorker = handler
  updateAvailable = true
  emit()
}

export async function applyPwaUpdate(): Promise<void> {
  if (!updateServiceWorker) return
  updateAvailable = false
  emit()
  await updateServiceWorker(true)
}

export function setHasUnsavedChanges(value: boolean): void {
  hasUnsavedChanges = value
}

/** Quien llama a applyPwaUpdate confirma antes si hay un formulario a medias. */
export function hasPwaUnsavedChanges(): boolean {
  return hasUnsavedChanges
}
