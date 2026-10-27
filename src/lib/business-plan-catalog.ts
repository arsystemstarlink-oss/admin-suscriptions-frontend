import type { BusinessPlanCatalogItem, BusinessPlanKey } from '@/types/api'

export const BUSINESS_PLAN_KEYS: BusinessPlanKey[] = [
  'basico',
  'pro',
  'negocio',
  'a-medida',
]

/** Tupla literal para `z.enum`, derivada de la misma lista de claves del catálogo. */
export const BUSINESS_PLAN_KEYS_TUPLE = BUSINESS_PLAN_KEYS as [
  BusinessPlanKey,
  BusinessPlanKey,
  BusinessPlanKey,
  BusinessPlanKey,
]

export const ORGANIZATION_PLAN_STATUSES = ['prueba', 'activo', 'vencido', 'suspendido'] as const

export const ORGANIZATION_PLAN_PAYMENT_METHODS = [
  'transferencia',
  'usdt',
  'efectivo',
] as const

/**
 * Etiquetas de presentación usadas solo mientras el catálogo del backend está
 * cargando o no está disponible. El catálogo siempre tiene prioridad.
 */
const PLAN_LABEL_FALLBACKS: Record<BusinessPlanKey, string> = {
  basico: 'Básico',
  pro: 'Pro',
  negocio: 'Negocio',
  'a-medida': 'A medida',
}

export function getCatalogItem(
  plans: BusinessPlanCatalogItem[] | undefined,
  key: BusinessPlanKey | undefined,
): BusinessPlanCatalogItem | undefined {
  if (!key) return undefined
  return plans?.find((plan) => plan.key === key)
}

export function getPlanLabel(
  plans: BusinessPlanCatalogItem[] | undefined,
  key: BusinessPlanKey | undefined,
): string {
  if (!key) return 'Plan'
  return getCatalogItem(plans, key)?.label ?? PLAN_LABEL_FALLBACKS[key] ?? 'Plan'
}

export function getPlanClientLimit(
  plans: BusinessPlanCatalogItem[] | undefined,
  key: BusinessPlanKey | undefined,
): number | null {
  return getCatalogItem(plans, key)?.clientLimit ?? null
}

export function getPlanAdminLimit(
  plans: BusinessPlanCatalogItem[] | undefined,
  key: BusinessPlanKey | undefined,
): number | null {
  return getCatalogItem(plans, key)?.adminLimit ?? null
}

/** Claves del catálogo del backend en su orden; cae a las claves conocidas si aún no carga. */
export function getCatalogPlanKeys(
  plans: BusinessPlanCatalogItem[] | undefined,
): BusinessPlanKey[] {
  const keys = plans?.map((plan) => plan.key).filter((key) => isBusinessPlanKey(key)) ?? []
  return keys.length > 0 ? keys : BUSINESS_PLAN_KEYS
}

export function isBusinessPlanKey(value: unknown): value is BusinessPlanKey {
  return typeof value === 'string' && (BUSINESS_PLAN_KEYS as string[]).includes(value)
}
