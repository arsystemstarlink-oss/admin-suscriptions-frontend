# Design System — admin-suscriptions (frontend)

Fuente única de verdad para el sistema visual de la app. Los valores de color se definen en `src/index.css` (`:root` / `.dark` + `@theme inline`); este documento explica qué existe, cuándo usarlo y qué está prohibido.

**Principio central:** los componentes NO eligen colores directamente. Expresan función (`"esto es una superficie elevada"`) y el tema resuelve el color. Un componente debe verse casi idéntico entre Light y Dark sin clases `dark:`.

---

## 1. Jerarquía de superficies

```text
background (canvas de la app)
    ↓
surface (cards, panels, tablas, formularios)
    ↓
surface-elevated (dialogs, sheets, dropdowns, menus, popovers)
    ↓
surface-muted (inputs, wells interiores, bubbles entrantes)
```

| Superficie | Clase obligatoria | Uso |
|---|---|---|
| Canvas | `bg-background text-foreground` | Página, fondo detrás de sidebar/cards |
| Superficie normal | `bg-surface text-surface-foreground border-border` | Cards, panels, tablas, formularios |
| Superficie flotante | `bg-surface-elevated text-surface-elevated-foreground` | Dialogs, sheets, dropdowns, menus |
| Área hundida | `bg-surface-muted text-surface-muted-foreground` | Inputs, contenedores interiores, bubble entrante |
| Hover | `hover:bg-surface-hover` | Solo interacción, nunca fondo permanente |
| Activo/selección | `active:bg-surface-active` · `data-[state=active]:bg-surface-active data-[state=active]:text-surface-foreground` | Tabs activos, filas seleccionadas |
| Header de marca | `bg-header text-header-foreground` · `hover:bg-header-hover` | Solo TopBar / header móvil / paneles de marca (Login, Setup) |
| Scrim | `bg-overlay` | Overlay de dialogs/sheets |

---

## 2. Tokens y valores (HSL)

### Superficies y texto

| Token | Light | Dark | Función |
|---|---|---|---|
| `background` / `foreground` | `225 33% 97%` / `223 48% 15%` | `223 38% 10%` / `0 0% 94%` | Canvas + texto principal |
| `surface` / `surface-foreground` | `0 0% 100%` / `223 48% 15%` | `223 32% 14%` / `0 0% 94%` | Card/panel estándar |
| `surface-elevated` / `-foreground` | `0 0% 100%` / `223 48% 15%` | `223 30% 18%` / `0 0% 94%` | Flotantes (un paso más claro en dark) |
| `surface-muted` / `-foreground` | `220 30% 95%` / `223 30% 35%` | `223 30% 11%` / `0 0% 88%` | Campos de input, wells, bubble in |
| `surface-hover` | `220 30% 93%` | `223 28% 22%` | Hover interactivo |
| `surface-active` | `222 40% 91%` | `223 32% 25%` | Selección/estado activo |
| `muted` / `muted-foreground` | `220 28% 96%` / `223 20% 42%` | `223 28% 20%` / `0 0% 72%` | Skeletons (`bg-muted`), texto secundario |
| `subtle-foreground` | `223 15% 60%` | `0 0% 55%` | Texto de muy baja prioridad (iconos vacíos, "/mes") |
| `disabled-foreground` | `223 10% 65%` | `0 0% 45%` | Elementos deshabilitados |

### Marca

| Token | Light | Dark | Función |
|---|---|---|---|
| `primary` / `primary-foreground` | `223 68% 25%` / blanco | `223 68% 32%` / blanco | Botones y acciones primarias (navy) |
| `secondary` / `secondary-foreground` | `51 92% 49%` / `224 69% 11%` | igual | Amarillo de marca; SIEMPRE texto oscuro |
| `header` / `header-foreground` / `header-hover` | `223 68% 25%` / `214 65% 96%` / `223 60% 30%` | `223 69% 11%` / `214 65% 96%` / `223 55% 16%` | TopBar, header móvil, panel Login/Setup |

### Status (par atómico obligatorio)

| Token | Light | Dark |
|---|---|---|
| `success` / `success-foreground` | `142 76% 30%` / blanco | `142 70% 55%` / blanco |
| `warning` / `warning-foreground` | `38 92% 36%` / blanco | `42 96% 56%` / navy oscuro |
| `destructive` / `destructive-foreground` | `0 74% 45%` / blanco | `0 84% 65%` / blanco |
| `info` / `info-foreground` | `221 80% 42%` / blanco | `217 91% 65%` / navy oscuro |

### Bordes, input, focus, overlay

| Token | Light | Dark | Uso |
|---|---|---|---|
| `border` | `220 24% 88%` | `223 24% 28%` | Separación normal |
| `border-subtle` | `220 26% 91%` | `223 24% 22%` | Separación ligera (wells, bordes internos) |
| `border-strong` | `220 20% 78%` | `223 22% 42%` | Focus/selección/bordes importantes, handles de sheet |
| `input` | `220 28% 95%` | `223 28% 18%` | Borde de inputs/selects |
| `ring` | `223 70% 45%` | `223 80% 62%` | Focus ring |
| `overlay` | `222 47% 8% / 0.55` | `222 47% 3% / 0.7` | Scrims |

> Los valores con canal alfa (`overlay`) se escriben completos dentro del `hsl(var(--...))` del `@theme inline`.

---

## 3. Reglas de uso

1. **Par atómico**: todo `bg-*` lleva su `-foreground` en el mismo elemento o scope padre. Nunca `text-white`/`text-black` hardcodeados.
2. **Prohibido en componentes**: `bg-white`, `bg-black`, `text-white`, `text-black`, `bg-gray-*`/`slate-*` y derivados, escalas raw (`bg-primary-800`, `text-primary-500`, `border-primary-100`, `bg-secondary-600`), paletas de estado raw (`emerald-*`, `amber-*`, `red-*`, `blue-*`, `sky-*`, `green-*`) y clases `dark:` (los tokens ya resuelven el modo).
3. **Estados**: `hover:bg-surface-hover`, `active:bg-surface-active`, focus con `ring-ring`, disabled con `disabled:opacity-50 disabled:text-disabled-foreground`. Nunca `text-gray-500` para disabled.
4. **Texto**: `foreground` (títulos/valores) → `muted-foreground` (descripciones/metadata/iconos secundarios) → `subtle-foreground` (muy baja prioridad, con moderación). Los íconos siguen la misma jerarquía que su texto.
5. **Primary/Secondary**: primario = `bg-primary text-primary-foreground` (o `<Button>` default). Ghost = transparente + `text-foreground` + `hover:bg-surface-hover`. Secondary siempre con `text-secondary-foreground` (texto oscuro sobre amarillo).
6. **Status**: chip suave `bg-{status}/10 text-{status} border border-{status}/20`; sólido `bg-{status} text-{status}-foreground`; texto solo `text-{status}`. Strings centralizadas en `src/lib/constants.ts` (`STATUS_SUCCESS`, `STATUS_WARNING`, `STATUS_ERROR`, `STATUS_INFO`).
7. **Inputs**: usar las primitivas (`<Input>`, `<SelectTrigger>`): `bg-surface-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring`. No sobrescribir con colores raw.
8. **Transparencia**: solo como tinte derivado del token del propio elemento (`bg-success/10`, `bg-surface/95 backdrop-blur-xl` en chrome bars, `bg-background/95` en toolbars sticky). Nunca `bg-white/5` ni `bg-black/30` como superficie.
9. **Overlays**: siempre `bg-overlay` (dialog, sheet, drawer, scrim del sidebar móvil). Nunca `bg-black/40` ni `bg-slate-950`.

### Ejemplos

```tsx
// Card estándar
<div className="bg-surface text-surface-foreground border border-border rounded-2xl p-4 shadow-sm">

// Área hundida dentro de una card
<div className="bg-surface-muted border border-border-subtle rounded-xl p-3">

// Botón primario / ghost / destructivo
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
<button className="text-foreground hover:bg-surface-hover">
<button className="bg-destructive text-destructive-foreground">

// Chip de estado
<span className="bg-warning/10 text-warning border border-warning/20 rounded-full px-2 py-0.5">

// Input
<input className="bg-surface-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring">
```

---

## 4. Convenciones del proyecto

- Excepciones aceptadas: `dark:` de rotación Sun/Moon en `ThemeToggle` (animación de ícono, sin color) y `richColors` de Sonner (librería externa).
- Los patrones de estado por entidad (suscripciones, períodos, clientes) viven en `src/lib/constants.ts`; importarlos, no reescribirlos inline.
- La regla de obligatorio cumplimiento para agentes/devs está en `AGENTS.md`; este documento es la referencia completa de tokens y valores.

## 5. Checklist antes de commitear UI

- [ ] Sin `dark:`, sin raw colors, sin escalas `primary-*`/`secondary-*`
- [ ] Todo `bg-*` tiene su `-foreground` asociado
- [ ] Hover/active usan `surface-hover`/`surface-active`
- [ ] Status vía tokens o constantes de `constants.ts`
- [ ] Revisado en Light y Dark
