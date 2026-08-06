### RULE: Strict Tailwind CSS Contrast & Custom Palette Enforcement

You are generating React components using Tailwind CSS. You MUST adhere to the following strict color pairing rules based on the configured `primary` (Base 800: Dark Blue) and `secondary` (Base 600: Yellow/Gold) palettes to avoid low-contrast issues in Light and Dark modes.

The palette is configured in `src/index.css` via the `@theme` directive (`--color-primary-*` and `--color-secondary-*`), exposing utilities such as `bg-primary-800`, `text-primary-900`, `dark:bg-primary-950`, `bg-secondary-600`, etc. Dark mode is class-based (`.dark`).

1. ATOMIC PAIRING RULE (Background + Text MUST be explicitly defined together)
   - NEVER output a `bg-*` utility without its corresponding `text-*` utility for BOTH light and dark themes on the same element or parent scope.
   - Example (Wrong): `className="bg-white dark:bg-primary-950 text-primary-800"`
   - Example (Correct): `className="bg-white text-primary-900 dark:bg-primary-950 dark:text-primary-50"`

2. PRIMARY PALETTE RULES (Navy Blues)
   - **Light Mode Text:** Use `text-primary-800` or `text-primary-900` for high contrast on light backgrounds.
   - **Dark Mode Backgrounds:** Use `dark:bg-primary-900` or `dark:bg-primary-950`.
   - **Dark Mode Text:** Use `dark:text-primary-50` or `dark:text-primary-100` on dark backgrounds. NEVER use `primary-800` text in dark mode.
   - **Primary Buttons:** `bg-primary-800 text-white dark:bg-primary-700 dark:text-white`.

3. SECONDARY PALETTE RULES (Yellows - CRITICAL CONTRAST WARNING)
   - The secondary base (`secondary-600`, Yellow) has POOR CONTRAST against white.
   - **NEVER** use `text-secondary-600` for thin text on `bg-white` or `bg-primary-50`.
   - **Secondary Buttons/Badges:** When using `bg-secondary-600`, the text MUST be dark for contrast: `text-primary-950` (NOT white). Example: `className="bg-secondary-600 text-primary-950 hover:bg-secondary-500"`.
   - In Dark Mode, `text-secondary-500` or `text-secondary-400` is excellent for highlighted text against `bg-primary-950`.

4. OPACITY & TRANSPARENCY CONTRAST RULE
   - When using background opacity (e.g., `bg-primary-800/10`), the text MUST contrast with the UNDERLYING canvas color.
   - Light translucent backgrounds (`bg-primary-800/10` or `bg-secondary-600/20`) in light mode MUST pair with solid dark text (`text-primary-900`).
   - Dark translucent backgrounds (`dark:bg-primary-200/10`) in dark mode MUST pair with solid light text (`dark:text-primary-50`).

5. DEFAULT SURFACE MAPPINGS (Use these for structural layouts)
   - **Main Canvas:**
     - Light: `bg-slate-50 text-primary-900`
     - Dark: `dark:bg-primary-950 dark:text-primary-50`
   - **Cards / Containers:**
     - Light: `bg-white text-primary-800 border-primary-100`
     - Dark: `dark:bg-primary-900/50 dark:text-primary-100 dark:border-primary-800`

6. SEMANTIC STATUS COLORS (Atomic Pairs MUST be respected)
   - Success (Active/Paid): Light: `text-emerald-700 bg-emerald-50` | Dark: `dark:text-emerald-400 dark:bg-emerald-950/50`
   - Warning (Pending/Expiring): Light: `text-amber-700 bg-amber-50` | Dark: `dark:text-amber-400 dark:bg-amber-950/50`
   - Error (Overdue/Failed/Delete): Light: `text-red-700 bg-red-50` | Dark: `dark:text-red-400 dark:bg-red-950/50` (or use shadcn `destructive`)
   - Info (Draft/Standby): Light: `text-blue-700 bg-blue-50` | Dark: `dark:text-blue-400 dark:bg-blue-950/50`
