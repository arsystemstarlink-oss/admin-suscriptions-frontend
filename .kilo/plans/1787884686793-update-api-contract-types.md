# Plan: Scope de datos por organización para super-admin + actualización de tipos API

## Contexto
- Un `admin` scopea automáticamente por su `organizationId` (JWT).
- Un `super-admin` (`organizationId: null`) puede ver todas las organizaciones, pero debe poder filtrar por una específica.
- Hoy las páginas principales (Dashboard, Clientes, Planes, Suscripciones, Períodos) no tienen selector de organización.
- Solo AdminsPage y AdminToolsPage tienen selector propio.

## Objetivo
1. Actualizar tipos del frontend al nuevo API contract.
2. Implementar selector global de organización para super-admin (Opción A).
3. Persistir última selección en `localStorage` y cargarla al abrir la app (Opción C).

---

## Fase 1: Actualizar tipos del API contract

### 1.1 `src/types/api.ts` — `SchedulerLog`
- Cambiar `triggeredBy: 'auto' | 'manual'` → `'scheduled' | 'manual'`.
- Eliminar `executedAt: string`, `result: DailyJobResult`, `createdAt: string`.
- Agregar `startedAt: string`, `finishedAt: string`.
- Cambiar `durationMs?: number` → `durationMs: number` (requerido).
- Agregar `status: 'success' | 'error' | 'skipped'`.
- Reemplazar `result: DailyJobResult` por campos planos: `overdue`, `generated`, `suspended`, `notifications` (number) y `notificationErrors: number`.
- Agregar `error?: string`.

### 1.2 `src/types/api.ts` — Respuestas de Admin usan `User`
- `AdminsListResponse`: `admins: Admin[]` → `admins: User[]`.
- `AdminDetailResponse`: `admin: Admin` → `admin: User`.
- `UpdateAdminResponse`: `admin: Admin` → `admin: User`.
- `CreateAdminResponse` ya usa `User`, sin cambios.

### 1.3 `src/api/admins.api.ts` — Tipo de retorno
- `adminsApi.create`: retorno inline `{ message: string; user: Admin }` → `CreateAdminResponse`.

## Fase 2: Store de organización seleccionada

### 2.1 `src/stores/organization.store.ts` (nuevo)
```typescript
interface OrganizationState {
  selectedOrganizationId: string | null
  setSelectedOrganizationId: (id: string | null) => void
  loadFromStorage: () => void
}
```
- Incluir `selectedOrganizationId` y `setSelectedOrganizationId`.
- `loadFromStorage`: leer `selectedOrganizationId` de `localStorage` al iniciar la app.
- Persistir cambios en `localStorage`.

## Fase 3: Selector global en TopBar

### 3.1 `src/components/layout/TopBar.tsx`
- Recibir `selectedOrganizationId` y `onOrganizationChange` desde `AuthenticatedLayout`.
- Renderizar un `<Select>` de organizations solo si `isSuperAdmin`.
- Al cambiar, llamar `onOrganizationChange(value)`.

### 3.2 `src/components/layout/AuthenticatedLayout.tsx`
- Leer `isSuperAdmin` del `authStore`.
- Si es super-admin, mostrar el selector en el `TopBar`.
- Al seleccionar una org, actualizar el store y refrescar queries de React Query.

## Fase 4: Propagar `organizationId` a todas las páginas

Para cada página/componente que consume datos scopeables, inyectar `organizationId` desde el store cuando sea super-admin:

### 4.1 Dashboard
- `useDashboardSummary()` y `useDashboardAlerts()`: pasar `organizationId` si super-admin.

### 4.2 Suscripciones
- `useSubscriptions()`: pasar `organizationId` si super-admin.

### 4.3 Clientes
- `useClients()`: pasar `organizationId` si super-admin.

### 4.4 Planes
- `usePlans()`: pasar `organizationId` si super-admin.

### 4.5 Períodos de facturación
- `useBilling()`: pasar `organizationId` si super-admin.

### 4.6 Scheduler
- `useSchedulerConfig()`, `useRunScheduler()`, `useSchedulerLogs()`: ya reciben `organizationId`, solo conectar al store.

### 4.7 WhatsApp
- `useWhatsAppConversations()`: ya recibe `organizationId`, conectar al store.

### Nota
- Las páginas de Admins y Scheduler ya tienen su propio selector; mantenerlo funcionando en paralelo (no eliminar).
- El store global actúa como fuente de verdad; los selectores locales pueden sincronizar con el store si se desea, pero no es obligatorio para MVP.

## Fase 5: Lógica de arranque y redirección

### 5.1 En `main.tsx` o `AuthenticatedLayout`
- Al cargar, hidratar el store de organización desde `localStorage`.
- Si es super-admin y no hay `selectedOrganizationId` guardado:
  - No redirigir (no forzar selección).
  - Mostrar el selector en el TopBar con valor vacío.
  - Las páginas consultan sin `organizationId` → ven todas las orgs.
- Si es super-admin y hay `selectedOrganizationId` guardado:
  - Aplicar ese filtro en todas las queries.
  - Si la URL no tiene `?organizationId=`, opcionalmente setearlo para mantener consistencia.

## Fase 6: Validación

- Ejecutar `npx tsc -b` (typecheck).
- Ejecutar `npm run lint`.
- Verificar manualmente:
  - Super-admin sin selección previa ve datos globales.
  - Super-admin selecciona org → se filtran todas las páginas.
  - Al recargar, se mantiene la última org seleccionada.
  - Admin normal no ve el selector y scopea por su JWT.
  - Selectores locales de Admins y Scheduler siguen funcionando.

## Riesgos
- Bajo: `Admin` y `User` son estructuralmente idénticos; cambiar tipos no rompe consumo.
- Bajo: `SchedulerLog` no se consume en UI actual; el cambio es seguro.
- Medio: sincronizar selector global con selectores locales de Admins/Scheduler puede causar inconsistencias si no se maneja; por ahora se mantienen independientes.
