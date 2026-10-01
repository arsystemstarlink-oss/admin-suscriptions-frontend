### RULE: Semantic Token System & Surface Hierarchy (Tailwind CSS)

You are generating React components using Tailwind CSS. Components MUST NOT choose raw colors directly. All visual decisions MUST be expressed through the semantic tokens defined in `src/index.css` (the `@theme inline` mapping over the CSS variables declared in `:root` and `.dark`). The theme resolves Light and Dark mode; components must NOT contain `dark:` variants.

1. FORBIDDEN UTILITIES (never output these in components)
   - Raw palette scales: `bg-primary-800`, `text-primary-500`, `border-primary-100`, `bg-secondary-600`, etc.
   - Raw neutrals: `bg-white`, `bg-black`, `text-white`, `text-black`, `bg-gray-*`, `bg-slate-*`, `text-gray-*`, `text-slate-*`, `border-gray-*`, `border-slate-*`.
   - Raw status colors: `emerald-*`, `amber-*`, `red-*`, `blue-*`, `sky-*`, `green-*`.
   - `dark:` prefixed utilities (the token system already resolves dark mode).
   - Transparency used as a fake surface: `bg-white/5`, `bg-black/20`, `bg-white/10`.

2. SURFACE HIERARCHY (each level has a purpose)
   - `bg-background text-foreground` — app canvas: page background, behind sidebar/cards.
   - `bg-surface text-surface-foreground border-border` — normal component surface: cards, panels, tables, forms.
   - `bg-surface-elevated text-surface-elevated-foreground` — floating surfaces: dialogs, sheets, dropdowns, menus, popovers.
   - `bg-surface-muted text-surface-muted-foreground` — inset/filled areas: input fields, wells, inner containers, inbound chat bubbles.
   - `hover:bg-surface-hover` — interaction only; never a permanent background.
   - `active:bg-surface-active` / `data-[state=active]:bg-surface-active data-[state=active]:text-surface-foreground` — selection or active state.
   - `bg-header text-header-foreground` — brand header surface only (TopBar / mobile header); `hover:bg-header-hover` for ghost controls on it.
   - `bg-overlay` — modal/sheet scrims. Never `bg-black/*` or `bg-slate-950`.

3. ATOMIC PAIRING RULE
   - Every `bg-*` MUST be paired with its semantic `-foreground` on the same element or a parent scope.
   - Correct: `bg-surface text-surface-foreground` / `bg-primary text-primary-foreground` / `bg-destructive text-destructive-foreground`.
   - Wrong: `bg-white text-primary-900 dark:bg-primary-950 dark:text-primary-50`.

4. TEXT HIERARCHY (icons follow the same hierarchy)
   - `text-foreground` — titles, main content, important values.
   - `text-muted-foreground` — descriptions, metadata, secondary labels, secondary icons.
   - `text-subtle-foreground` — very low priority hints only, use sparingly.
   - Disabled elements: `disabled:opacity-50 disabled:text-disabled-foreground`. Never `text-gray-500`.

5. PRIMARY / SECONDARY
   - Primary actions: `bg-primary text-primary-foreground` (or `<Button>` default). Ghost: transparent + `text-foreground`, `hover:bg-surface-hover`.
   - Secondary (yellow) always pairs with dark text: `bg-secondary text-secondary-foreground`. Never white text on secondary.

6. SEMANTIC STATUS COLORS
   - Soft chip/badge: `bg-success/10 text-success border border-success/20` (same pattern for `warning`, `destructive`, `info`).
   - Solid status button/badge: `bg-success text-success-foreground`, `bg-warning text-warning-foreground`, etc.
   - Colored text alone: `text-success`, `text-warning`, `text-destructive`, `text-info`.
   - Centralized status strings live in `src/lib/constants.ts` (`STATUS_SUCCESS`, `STATUS_WARNING`, `STATUS_ERROR`, `STATUS_INFO`).

7. BORDERS & INPUTS
   - `border-border` normal separation; `border-border-subtle` light separation; `border-border-strong` focus/selection/important states.
   - Inputs/selects use the primitives (`<Input>`, `<SelectTrigger>`): `bg-surface-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring`. Do not override with raw colors.

8. OPACITY
   - Opacity is only allowed as a tint derived from the element's own semantic token (`bg-success/10`, `bg-surface/95 backdrop-blur-xl` for chrome bars) — never as a substitute for a surface token.
