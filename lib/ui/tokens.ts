/**
 * lib/ui/tokens.ts
 * Design System — Single source of truth para tokens de UI.
 * Todos los valores aquí corresponden a las variables CSS en globals.css.
 *
 * USO: Importa estas constantes en lugar de hardcodear clases Tailwind ad-hoc.
 */

// ─── Typography Scale ─────────────────────────────────────────────────────────

export const fontSize = {
  /** Títulos de página principal */
  pageTitle: 'text-2xl font-bold',
  /** Títulos de sección dentro de cards */
  sectionTitle: 'text-sm font-semibold',
  /** Labels de formulario — estándar en toda la app */
  label: 'text-sm font-medium',
  /** Texto de body / descripciones */
  body: 'text-sm',
  /** Metadata secundaria, helpers, timestamps */
  meta: 'text-xs text-muted-foreground',
  /** Badges, contadores, indicadores micro */
  micro: 'text-[10px] font-bold uppercase tracking-wider',
  /** Número grande de score/KPI */
  score: 'text-4xl font-bold',
} as const

// ─── Spacing Scale ────────────────────────────────────────────────────────────

export const spacing = {
  /** Padding estándar de card */
  card: 'p-4',
  /** Padding de card con más espacio */
  cardLg: 'p-6',
  /** Espaciado vertical entre secciones de un form */
  formSection: 'space-y-4',
  /** Espaciado entre label e input */
  formField: 'space-y-1',
  /** Gap entre ícono y texto */
  iconText: 'gap-2',
  /** Gap entre elementos de una fila */
  row: 'gap-3',
  /** Gap entre secciones grandes */
  section: 'gap-4',
} as const

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radius = {
  /** Botones, inputs — design system spec: rounded-xl */
  button: 'rounded-xl',
  /** Cards primarias — design system spec: rounded-2xl */
  card: 'rounded-2xl',
  /** Cards anidadas */
  cardLg: 'rounded-xl',
  /** Badges de estado, avatars, indicadores */
  badge: 'rounded-full',
} as const

// ─── Button Patterns ──────────────────────────────────────────────────────────

export const buttonStyles = {
  /** Acción primaria — usa --primary CSS var */
  primary:
    'inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50',
  /** Acción secundaria / outline */
  secondary:
    'inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50',
  /** Acción destructiva */
  destructive:
    'inline-flex items-center justify-center rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-white hover:bg-destructive/90 transition-colors disabled:opacity-50',
  /** Ghost — solo visible en hover */
  ghost:
    'inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50',
  /** Link — sin fondo */
  link: 'text-primary text-sm font-medium hover:underline underline-offset-4',
  /** Botón compacto para acciones secundarias en cards */
  compact:
    'inline-flex items-center justify-center rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors',
} as const

// ─── Form Patterns ────────────────────────────────────────────────────────────

export const formStyles = {
  /** Input estándar */
  input:
    'flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
  /** Textarea */
  textarea:
    'flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
  /** Select */
  select:
    'flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
  /** Label estándar */
  label: 'block text-sm font-medium text-foreground',
  /** Helper text / error */
  helperError: 'text-xs text-destructive mt-1',
  /** Helper text / neutral */
  helperNeutral: 'text-xs text-muted-foreground mt-1',
} as const

// ─── Card Patterns ────────────────────────────────────────────────────────────

export const cardStyles = {
  /** Card base — design system spec: rounded-2xl + subtle shadow */
  base: 'rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_3px_rgb(0_0_0/0.06)]',
  /** Card con padding estándar */
  padded:
    'rounded-2xl border border-border bg-card text-card-foreground p-5 shadow-[0_1px_3px_rgb(0_0_0/0.06)]',
  /** Card grande */
  large:
    'rounded-2xl border border-border bg-card text-card-foreground p-6 shadow-[0_1px_3px_rgb(0_0_0/0.06)]',
  /** Card nested (dentro de otra card) */
  nested: 'rounded-xl border border-border bg-muted/30 p-4',
} as const

// ─── Badge / Status Patterns ──────────────────────────────────────────────────

export const badgeBase = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
