# Plan de Desarrollo — Sistema de Gestión de Suscripciones y Cobranzas

## Filosofía Central

Este frontend **no es un sitio web** — es una herramienta POS operativa. Cada decisión de arquitectura se evalúa contra una métrica: **¿cuántos segundos le ahorra al operador entre identificar un deudor y registrar su cobro?**

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | **React 19** + **TypeScript strict** | Tipado fuerte alineado al contrato |
| Build | **Vite 8** | Velocidad de desarrollo, HMR instantáneo |
| Routing | **React Router v7** | Rutas protegidas, loaders, nested routes |
| Estado servidor | **TanStack Query v5** | Cache, refetch, optimistic updates, invalidation |
| Estado cliente | **Zustand** | Ligero, sin boilerplate, ideal para auth/UI state |
| UI Components | **shadcn/ui + Radix** + **Tailwind CSS v4** | Accesibilidad, personalización |
| Formularios | **React Hook Form + Zod** | Validación tipada, schema compartido |
| HTTP Client | **Axios** | Interceptors nativos para auth refresh |
| Iconos | **Lucide React** | Consistentes, ligeros |
| Fechas | **date-fns** | Manipulación de fechas sin mutación |

---

## Arquitectura en 4 Capas

```
┌─────────────────────────────────────────────────────────────────────┐
│  CAPA 4: SUPERFICIE OPERATIVA (Pages + Modals + Command Bar)       │
│  → El operador NUNCA ve URLs, solo contextos de trabajo            │
├─────────────────────────────────────────────────────────────────────┤
│  CAPA 3: COMPOSICIÓN DE DATOS (Hooks de Vista 360°)               │
│  → Fusiona Client + Subscription + BillingPeriod en ViewModel      │
├─────────────────────────────────────────────────────────────────────┤
│  CAPA 2: CACHE DE SERVIDOR (TanStack Query v5)                    │
│  → Invalidation en cascada, optimistic updates, refetch            │
├─────────────────────────────────────────────────────────────────────┤
│  CAPA 1: TRANSPORTE HTTP (Axios + Interceptors)                   │
│  → Auth refresh silencioso, cola de 401s, error mapping            │
├─────────────────────────────────────────────────────────────────────┤
│  CAPA 0: ESTADO CLIENTE MÍNIMO (Zustand)                          │
│  → Solo: auth tokens, UI modals, command bar focus                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fases de Desarrollo

### ✅ Fase 0 — Scaffolding y Configuración Base
> **Estado:** Completada

| Tarea | Detalle |
|---|---|
| Inicializar Vite + React + TypeScript (strict mode) | Template `react-ts` |
| Configurar Tailwind CSS v4 | Plugin `@tailwindcss/vite` |
| Instalar shadcn/ui | 10 componentes base: button, input, dialog, badge, card, tabs, select, sonner, label, separator |
| Instalar dependencias core | TanStack Query, Zustand, Axios, React Router, RHF, Zod, date-fns, lucide-react |
| Estructura de directorios | `api/`, `hooks/`, `stores/`, `types/`, `lib/`, `components/`, `pages/`, `guards/`, `routes/` |
| Configurar path aliases | `@/` → `src/` en `tsconfig.json` y `vite.config.ts` |

---

### ✅ Fase 1 — Capa de Transporte y Tipos
> **Estado:** Completada
> **Entregable:** Client HTTP funcional con interceptores, tipos TypeScript espejo del contrato, error handler mapeado.

| Tarea | Detalle |
|---|---|
| `src/types/api.ts` | Todos los enums (`PaymentMethod`, `SubscriptionStatus`, `BillingPeriodStatus`) e interfaces (`Client`, `ClientWithStats`, `ClientWithSubscriptions`, `Plan`, `Subscription`, `SubscriptionWithDetails`, `SubscriptionWithPeriods`, `BillingPeriod`, `BillingPeriodWithDetails`, `DashboardSummary`, `AlertItem`, `DebtorItem`, `DashboardAlerts`, `User`, `Pagination`) — copia literal del contrato |
| `src/api/client.ts` | Instancia Axios con baseURL, request interceptor (attach Bearer), response interceptor (refresh silencioso con cola de 401s) |
| `src/lib/query-keys.ts` | Query keys centralizadas para todas las entidades |
| `src/lib/error-handler.ts` | `BusinessError` class + mapa `BUSINESS_ERROR_HANDLERS` (código → tipo de UX: modal/toast/field-error) |
| `src/lib/constants.ts` | Labels legibles para enums, colores de status, formatos de moneda |

---

### ✅ Fase 2 — Autenticación y Layout
> **Estado:** Completada
> **Entregable:** Login funcional, refresh automático, layout con sidebar + topbar, ruta protegida.

| Tarea | Detalle |
|---|---|
| `src/stores/auth.store.ts` | Zustand: `accessToken`, `refreshToken`, `user`, `login()`, `logout()`, `setTokens()` |
| `src/api/auth.api.ts` | `login()`, `refresh()` — endpoints del contrato |
| `src/hooks/useTokenRefresh.ts` | Pre-refresh proactivo (60s antes de expiración) |
| `src/guards/AuthGuard.tsx` | Redirect a `/login` si no hay tokens |
| `src/pages/LoginPage.tsx` | Formulario con validación Zod, manejo de `INVALID_CREDENTIALS` |
| `src/components/layout/AuthenticatedLayout.tsx` | Sidebar + TopBar + Outlet |
| `src/components/layout/Sidebar.tsx` | Navegación: Dashboard, Clientes, Planes, Suscripciones, Facturación |
| `src/components/layout/TopBar.tsx` | User info + logout |
| `src/routes/index.tsx` | Configuración de rutas con AuthGuard |

---

### ✅ Fase 3 — Dashboard y Widgets de Acción
> **Estado:** Completada
> **Entregable:** Pantalla de inicio con KPIs, top deudores con botón [Cobrar], vencimientos próximos.

| Tarea | Detalle |
|---|---|
| `src/api/dashboard.api.ts` | `getSummary()`, `getAlerts()` |
| `src/hooks/useDashboard.ts` | `useDashboardSummary()`, `useDashboardAlerts()` con stale-time corto (10s) |
| `src/pages/DashboardPage.tsx` | Layout de widgets |
| `src/components/dashboard/KPICards.tsx` | Cards: Total Clientes, Subs Activas, Ingresos Mes, Deuda Total |
| `src/components/dashboard/TopDebtorsWidget.tsx` | Tabla de deudores con botón [💰 Cobrar] |
| `src/components/dashboard/ExpiringSoonWidget.tsx` | Lista de próximos a vencer con [📞 Contactar] |
| `src/components/dashboard/StatusChart.tsx` | Gráfico distribución ACTIVE vs SUSPENDED |

---

### ✅ Fase 4 — Módulo Clientes (360°)
> **Estado:** Completada
> **Entregable:** Lista con filtros/búsqueda, vista de detalle con tabs (Info | Suscripciones | Historial Pagos), CRUD completo con manejo de errores de negocio.

| Tarea | Detalle |
|---|---|
| `src/api/clients.api.ts` | `list()`, `getById()`, `create()`, `update()`, `remove()` |
| `src/hooks/useClients.ts` | Hooks con TanStack Query + mutations con invalidation |
| `src/pages/clients/ClientsListPage.tsx` | DataTable con filtros laterales (status, hasOverdue), búsqueda con debounce |
| `src/pages/clients/ClientDetailPage.tsx` | Vista 360°: header con resumen + tabs |
| `src/components/clients/ClientHeader.tsx` | Datos + badges de estado + deuda total |
| `src/components/clients/SubscriptionTabs.tsx` | Cards de suscripciones con indicadores de período actual |
| `src/components/clients/PaymentHistory.tsx` | Historial filtrado por cliente |
| `src/pages/clients/ClientFormPage.tsx` | Crear/editar con validación Zod |
| `src/components/modals/BlockedDeleteModal.tsx` | Modal para `CLIENT_HAS_ACTIVE_SUBSCRIPTIONS` |

---

### ✅ Fase 5 — Módulo Planes
> **Estado:** Completada
> **Entregable:** Catálogo de planes con toggle activo/inactivo, CRUD con manejo de `PLAN_HAS_SUBSCRIPTIONS`.

| Tarea | Detalle |
|---|---|
| `src/api/plans.api.ts` | `list()`, `getById()`, `create()`, `update()`, `remove()` |
| `src/hooks/usePlans.ts` | Hooks con invalidation |
| `src/pages/plans/PlansListPage.tsx` | Grid/tabla con toggle de estado, edición inline |
| `src/pages/plans/PlanFormPage.tsx` | Crear/editar plan |
| `src/components/modals/BlockedDeletePlanModal.tsx` | Modal para `PLAN_HAS_SUBSCRIPTIONS` |

---

### ✅ Fase 6 — Módulo Suscripciones
> **Estado:** Completada
> **Entregable:** Lista con filtros avanzados, vista de detalle con timeline de períodos, resumen financiero, acciones de suspensión/reactivación.

| Tarea | Detalle |
|---|---|
| `src/api/subscriptions.api.ts` | `list()`, `getById()`, `create()`, `update()`, `remove()` |
| `src/hooks/useSubscriptions.ts` | Hooks con invalidation |
| `src/pages/subscriptions/SubscriptionsListPage.tsx` | Tabla con filtros (status, hasOverdue, search) |
| `src/pages/subscriptions/SubscriptionDetailPage.tsx` | Timeline de períodos + resumen financiero + botón "Generar próximo período" |
| `src/pages/subscriptions/SubscriptionFormPage.tsx` | Crear suscripción: selector de cliente + plan + billingDay (1-28 validado) |

---

### ✅ Fase 7 — Centro de Operaciones (Flujo Crítico de Cobranza)
> **Estado:** Completada
> **Entregable:** Omni-Search (Ctrl+K), QuickPayModal transaccional, feedback de reactivación, invalidation en cascada.

| Tarea | Detalle |
|---|---|
| `src/stores/ui.store.ts` | Estado del QuickPayModal (open/close, contexto precargado) |
| `src/hooks/useBilling.ts` | `useRegisterPayment()` con optimistic update + invalidation en cascada, `useGenerateNextPeriod()`, `useEvaluateOverdue()` |
| `src/components/command/OmniSearch.tsx` | Búsqueda unificada: clientes + suscripciones en paralelo, debounce 300ms |
| `src/components/command/SearchResults.tsx` | Tarjetas de resultado con composición Client+Subscription+BillingPeriod |
| `src/components/payment/QuickPayModal.tsx` | Modal transaccional: contexto + formulario mínimo + estado de éxito |
| `src/components/payment/PaymentForm.tsx` | Método de pago (select), monto (autofill), fecha, notas |
| `src/components/payment/PaymentSuccessState.tsx` | Feedback de reactivación (SUSPENDED → ACTIVE) |
| Hotkeys | Ctrl+K para Omni-Search, Enter para confirmar pago, ESC para cerrar modal |

---

### ✅ Fase 8 — Facturación, Admin y Polish Final
> **Estado:** Completada
> **Entregable:** Lista de períodos con filtros, registro de pago desde tabla, admin tools, consistencia visual global.

| Tarea | Detalle |
|---|---|
| `src/api/billing.api.ts` | `list()`, `getById()`, `payPeriod()`, `generateNext()`, `evaluateOverdue()` |
| `src/hooks/useBilling.ts` | Hooks con invalidation |
| `src/pages/billing/BillingPeriodsPage.tsx` | Tabla con filtros (status, search, expiresBefore), badges de estado |
| `src/pages/admin/AdminToolsPage.tsx` | Botón "Ejecutar evaluación de vencimientos" con modal de confirmación |
| Skeleton loaders | Para todas las listas y vistas de detalle |
| Empty states | "Sin resultados" con acción sugerida en cada vista |
| 404 page | Página de recurso no encontrado |

---

## Criterios de Aceptación por Fase

| Fase | Se considera completa cuando... |
|---|---|
| **0** | `npm run dev` levanta la app, Tailwind funciona, shadcn/ui renderiza un Button |
| **1** | Los tipos compilan sin errores, el interceptor attach tokens, el error handler mapea códigos |
| **2** | Login funciona, refresh silencioso verificado, ruta protegida redirige |
| **3** | Dashboard muestra KPIs reales del backend, widgets renderizan datos de alertas |
| **4** | CRUD de clientes completo, vista 360° muestra suscripciones + historial, error de borrado muestra modal |
| **5** | CRUD de planes completo, eliminación bloqueada muestra modal accionable |
| **6** | CRUD de suscripciones, billingDay validado 1-28, timeline de períodos visible |
| **7** | Ctrl+K abre búsqueda, cobro en <8 segundos con teclado, reactivación refleja al instante en dashboard |
| **8** | Todos los módulos integrados, skeleton loaders, empty states, sin errores en consola |

---

## Mapa de Vistas y Endpoints

| Vista | Endpoints que consume |
|---|---|
| **LoginPage** | `POST /auth/login`, `POST /auth/refresh` (silencioso) |
| **DashboardPage** | `GET /dashboard/summary`, `GET /dashboard/alerts` |
| **ClientsListPage** | `GET /clients` (con search, filtros, paginación) |
| **ClientDetailPage** | `GET /clients/:id` → Vista 360° con tabs |
| **ClientFormPage** | `POST /clients` ó `PUT /clients/:id`, `DELETE /clients/:id` |
| **PlansListPage** | `GET /plans` |
| **PlanFormPage** | `POST /plans` ó `PUT /plans/:id`, `DELETE /plans/:id` |
| **SubscriptionsListPage** | `GET /subscriptions` (con filtros avanzados) |
| **SubscriptionDetailPage** | `GET /subscriptions/:id`, `PUT /subscriptions/:id`, `POST /billing-periods/generate-next/:subscriptionId` |
| **SubscriptionEditPage** | `GET /subscriptions/:id`, `PUT /subscriptions/:id`, `GET /plans` |
| **BillingPeriodsPage** | `GET /billing-periods`, `POST /billing-periods/:id/pay` |
| **AdminToolsPage** | `POST /billing-periods/evaluate-overdue` |

---

## Principios de Diseño

1. **Backend es el cerebro, frontend es el músculo** — Nunca calcular deuda/vencimientos en el cliente
2. **Vistas 360°** — Fusionar Client + Subscription + BillingPeriod en una sola vista
3. **Fricción cero** — Omni-Search con Ctrl+K, cobro en <8 segundos con teclado
4. **Errores humanos** — Mapear códigos 400 a modales/toasts accionables, nunca texto técnico
5. **Invalidation en cascada** — Un pago actualiza billing + subscriptions + clients + dashboard
6. **Code-splitting** — Lazy loading de rutas con React.lazy + Suspense para optimizar bundle
