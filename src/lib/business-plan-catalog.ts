import type { BusinessPlanCatalogItem, BusinessPlanKey } from '@/types/api'

export const BUSINESS_PLAN_KEYS: BusinessPlanKey[] = [
  'basico',
  'pro',
  'negocio',
  'a-medida',
]

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
