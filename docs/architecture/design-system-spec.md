# Design System Spec — life-os v2

> **Autor:** @ux-design-expert (Uma)
> **Fecha:** 2026-03-02
> **Referencia visual:** Donezo Dashboard (screenshot aprobado por usuario)
> **Status:** APROBADO — fuente de verdad para Epic 9

---

## 1. Principios

- **Verde como identidad** — El verde oscuro reemplaza el negro como color de acción e identidad
- **Limpieza radical** — Sidebar blanco, fondo levemente tintado, cards blancas con sombra sutil
- **Consistencia sobre creatividad** — Todos los componentes siguen los tokens, sin valores hardcoded
- **Light mode primario** — La app vive en modo claro; el dark mode es secundario y se implementa después

---

## 2. Color Tokens

### globals.css — Valores a reemplazar

```css
:root {
  /* ── Paleta base ──────────────────────────────── */
  --background:           oklch(0.984 0.005 155);   /* #F8FAF8 — fondo general levemente verde */
  --foreground:           oklch(0.145 0 0);          /* #1A1A1A — texto principal */

  /* ── Cards & Surfaces ──────────────────────────── */
  --card:                 oklch(1 0 0);              /* #FFFFFF — cards blancas */
  --card-foreground:      oklch(0.145 0 0);
  --popover:              oklch(1 0 0);
  --popover-foreground:   oklch(0.145 0 0);

  /* ── Primary — Verde Oscuro (CTA, botones, activos) */
  --primary:              oklch(0.390 0.114 149.0);  /* #166534 green-800 */
  --primary-foreground:   oklch(0.985 0 0);          /* blanco */

  /* ── Secondary ──────────────────────────────────── */
  --secondary:            oklch(0.962 0.044 156.0);  /* #DCFCE7 green-100 */
  --secondary-foreground: oklch(0.390 0.114 149.0);  /* verde oscuro */

  /* ── Muted ───────────────────────────────────────── */
  --muted:                oklch(0.968 0.005 155.0);  /* #F3F4F6 gris muy claro */
  --muted-foreground:     oklch(0.556 0 0);          /* #6B7280 gris medio */

  /* ── Accent (hover backgrounds) ─────────────────── */
  --accent:               oklch(0.985 0.019 157.0);  /* #F0FDF4 green-50 */
  --accent-foreground:    oklch(0.390 0.114 149.0);  /* verde oscuro */

  /* ── Destructive ─────────────────────────────────── */
  --destructive:          oklch(0.577 0.245 27.325); /* rojo — sin cambio */

  /* ── Borders & Inputs ────────────────────────────── */
  --border:               oklch(0.922 0.008 155.0);  /* #E2E8E4 verde-gris claro */
  --input:                oklch(0.922 0.008 155.0);
  --ring:                 oklch(0.390 0.114 149.0);  /* match primary */

  /* ── Border Radius ───────────────────────────────── */
  --radius: 0.75rem;   /* 12px base — más redondeado que antes (0.625rem) */

  /* ── Sidebar (BLANCO — Donezo style) ─────────────── */
  --sidebar-bg:                   #FFFFFF;
  --sidebar-text:                 #6B7280;           /* gray-500 inactivo */
  --sidebar-active:               #166534;           /* green-800 activo */
  --sidebar:                      oklch(1 0 0);
  --sidebar-foreground:           oklch(0.556 0 0);
  --sidebar-primary:              oklch(0.390 0.114 149.0);
  --sidebar-primary-foreground:   oklch(0.985 0 0);
  --sidebar-accent:               oklch(0.985 0.019 157.0);  /* green-50 hover/active bg */
  --sidebar-accent-foreground:    oklch(0.390 0.114 149.0);
  --sidebar-border:               oklch(0.922 0.008 155.0);
  --sidebar-ring:                 oklch(0.390 0.114 149.0);

  /* ── Charts ──────────────────────────────────────── */
  --chart-1: oklch(0.390 0.114 149.0);   /* verde oscuro */
  --chart-2: oklch(0.524 0.117 152.0);   /* verde medio */
  --chart-3: oklch(0.688 0.119 154.0);   /* verde claro */
  --chart-4: oklch(0.828 0.189 84.429);  /* amarillo */
  --chart-5: oklch(0.577 0.245 27.325);  /* rojo */
}

.dark {
  /* Dark mode — implementación futura (Epic 9.x) */
  /* Por ahora mantiene los valores actuales */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --primary: oklch(0.688 0.119 154.0);   /* verde más claro en dark */
  --primary-foreground: oklch(0.145 0 0);
  --sidebar: oklch(0.175 0.010 155.0);   /* sidebar verde muy oscuro en dark */
  --sidebar-foreground: oklch(0.708 0 0);
  --sidebar-primary: oklch(0.688 0.119 154.0);
  --sidebar-primary-foreground: oklch(0.145 0 0);
  --sidebar-accent: oklch(0.269 0.020 155.0);
  --sidebar-accent-foreground: oklch(0.688 0.119 154.0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --border: oklch(1 0 0 / 10%);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0.020 155.0);
  --accent-foreground: oklch(0.688 0.119 154.0);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.688 0.119 154.0);
}
```

### Referencia de la paleta verde

| Token | oklch | Hex aprox | Uso |
|-------|-------|-----------|-----|
| green-50 | oklch(0.985 0.019 157) | #F0FDF4 | Hover bg, active sidebar bg |
| green-100 | oklch(0.962 0.044 156) | #DCFCE7 | Secondary bg, badges |
| green-600 | oklch(0.524 0.117 152) | #16A34A | Acciones secundarias |
| green-800 | oklch(0.390 0.114 149) | #166534 | **PRIMARY** — botones, activos |
| green-900 | oklch(0.340 0.100 148) | #14532D | Hover del primary |

---

## 3. Typography

```
Font family: 'Inter', Arial, Helvetica, sans-serif  (sin cambio)

Escala:
  page-title:     text-3xl font-bold text-foreground
  section-title:  text-sm font-semibold text-foreground
  nav-label:      text-[10px] font-semibold uppercase tracking-wider text-muted-foreground
  label:          text-sm font-medium text-foreground
  body:           text-sm text-foreground
  meta:           text-xs text-muted-foreground
  kpi:            text-4xl font-bold
  micro:          text-[10px] font-bold uppercase tracking-wider
```

---

## 4. Border Radius

```
--radius: 0.75rem  (12px — base, botones e inputs)

Escala @theme:
  --radius-sm:   0.375rem   (6px  — elementos pequeños)
  --radius-md:   0.625rem   (10px — badges, pills)
  --radius-lg:   0.75rem    (12px — botones, inputs)
  --radius-xl:   1rem       (16px — cards)
  --radius-2xl:  1.5rem     (24px — cards grandes, modales)
  --radius-full: 9999px     (badges de estado, avatares)
```

**Aplicación por componente:**
| Componente | Radius |
|-----------|--------|
| Button | `rounded-xl` (12px) |
| Input / Select | `rounded-xl` (12px) |
| Card primaria | `rounded-2xl` (16px) |
| Card anidada | `rounded-xl` (12px) |
| Badge / Pill | `rounded-full` |
| Sidebar nav item | `rounded-lg` (10px) |
| Modal | `rounded-2xl` (16px) |

---

## 5. Shadows

```css
/* Cards */
.shadow-card {
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04);
}

/* Cards hover */
.shadow-card-hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.08), 0 2px 4px rgb(0 0 0 / 0.04);
}

/* Modales / dropdowns */
.shadow-modal {
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.06);
}
```

---

## 6. Sidebar — Spec Completo

### Estructura visual (basada en Donezo)

```
┌─────────────────────────────────┐
│  ⬤ life-os              [←]    │  ← Logo + collapse
│  ─────────────────────────────  │
│  MENÚ                           │  ← Section label
│                                 │
│  ▌ 🏠 Inicio       ← activo   │  ← Verde bg + texto verde-800
│    ☰ Áreas de Vida             │  ← Inactivo: gray-500
│    ◎ OKRs                      │
│    📁 Proyectos                 │
│    📅 Calendario                │
│    📥 Inbox          [12]      │  ← Badge verde
│                                 │
│  HERRAMIENTAS                   │
│                                 │
│    ✓ Hábitos                   │
│    ⭐ Habilidades               │
│    📊 Informes                  │
│    📋 Review Semanal            │
└─────────────────────────────────┘
```

### Clases CSS del sidebar actualizado

```tsx
// Container
className="w-64 bg-white border-r border-border flex flex-col"

// Section label
className="px-4 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"

// Nav item — inactivo
className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"

// Nav item — activo
className="flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm font-semibold bg-accent text-sidebar-primary transition-colors"

// Badge
className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground"
```

---

## 7. Header — Spec Completo

### Estructura visual (nueva — basada en Donezo)

```
┌──────────────────────────────────────────────────────┐
│  [☰]  🔍 Search...          ⌘K    [🔔]  [Mario ▼]  │
└──────────────────────────────────────────────────────┘
```

### Componentes nuevos

**Search bar:**
```tsx
<div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground w-64 cursor-pointer hover:border-primary/30 transition-colors">
  <Search className="h-4 w-4" />
  <span>Buscar...</span>
  <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
</div>
```

**Profile widget (iPhone-style emoji avatar):**
```tsx
<div className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1.5 hover:bg-muted transition-colors">
  {/* Avatar: círculo con emoji o iniciales — estilo iOS */}
  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-green-700 flex items-center justify-center text-white text-sm font-bold shadow-sm">
    {userInitials}
  </div>
  <div className="hidden md:block">
    <p className="text-sm font-medium text-foreground leading-none">{userName}</p>
    <p className="text-[11px] text-muted-foreground">{userEmail}</p>
  </div>
</div>
```

---

## 8. Card — Spec

```tsx
// Card base (reemplaza divs con rounded-lg border bg-card)
className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgb(0_0_0/0.06)]"

// Card featured (oscura — como "Total Projects" en Donezo)
className="rounded-2xl bg-primary p-5 text-primary-foreground"

// Card nested (dentro de otra card)
className="rounded-xl border border-border bg-muted/30 p-4"
```

---

## 9. Buttons — Spec

```tsx
// Primary (verde oscuro)
className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"

// Secondary (outline blanco)
className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"

// Ghost
className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"

// Destructive
className="inline-flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"

// Compact (para acciones en cards)
className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
```

---

## 10. Status Colors (sin cambio conceptual, paleta adaptada)

```typescript
// lib/ui/status-colors.ts
export const STATUS_COLORS = {
  active:    'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  archived:  'bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400',
  paused:    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  pending:   'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
} as const
```

---

## 11. Features nuevas del Header (referenciadas de Donezo)

| Feature | Prioridad | Descripción |
|---------|-----------|-------------|
| Search bar (⌘K) | Alta | Input de búsqueda global con shortcut de teclado |
| Profile widget | Alta | Avatar iOS-style (gradient + iniciales) + nombre + email |
| Notification bell | Media | Ícono de campana (UI only en primera fase) |

---

## 12. Inventario completo de archivos a modificar

### Epic 9.1 — Tokens & globals.css
| Archivo | Tipo de cambio |
|---------|---------------|
| `app/globals.css` | REWRITE variables CSS completo |
| `lib/ui/tokens.ts` | UPDATE con nuevos patrones |
| `lib/ui/status-colors.ts` | CREATE |
| `lib/ui/maslow-colors.ts` | CREATE |

### Epic 9.2 — Sidebar & Header
| Archivo | Tipo de cambio |
|---------|---------------|
| `components/layout/Sidebar.tsx` | UPDATE colores hardcoded → variables |
| `components/layout/Header.tsx` | UPDATE + agregar search bar + profile widget |
| `app/(app)/AppShell.tsx` | REVIEW posible ajuste de layout |

### Epic 9.3 — Cards & Forms
| Archivo | Tipo de cambio |
|---------|---------------|
| `components/okrs/OKRForm.tsx` | UPDATE botones + inputs |
| `components/projects/ProjectForm.tsx` | ídem |
| `components/okrs/KRForm.tsx` | ídem |
| `components/areas/VisionCard.tsx` | ídem |
| `components/okrs/AnnualOKRList.tsx` | ídem |
| `components/projects/TemplateCard.tsx` | ídem |
| `components/habits/HabitForm.tsx` | ídem |
| `components/projects/ProjectCard.tsx` | UPDATE status colors + card radius |
| `components/okrs/AnnualOKRCard.tsx` | ídem |
| `components/habits/HabitCard.tsx` | ídem |
| `components/shared/DailyCheckinBanner.tsx` | UPDATE colores amber → green |
| `components/shared/AlertBanner.tsx` | REVIEW |

### Epic 9.4 — shadcn components
| Archivo | Tipo de cambio |
|---------|---------------|
| `components/ui/button.tsx` | UPDATE CVA variants con nuevos tokens |
| `components/ui/badge.tsx` | CREATE |
| `components/ui/card.tsx` | CREATE |
| `components/ui/input.tsx` | CREATE |

---

## 13. Desglose en Stories

| Story | Título | Complejidad |
|-------|--------|-------------|
| 9.1 | Tokens + globals.css + lib/ui/* | S (1p) |
| 9.2 | Sidebar blanco + Header nuevo (search + profile) | M (3p) |
| 9.3 | Cards, Forms, Badges — todos los componentes | M (3p) |
| 9.4 | shadcn components: badge, card, input | S (2p) |

**Orden de ejecución:** 9.1 → 9.2 → 9.3 → 9.4 (cada una depende de la anterior)

---

*Spec generado por @ux-design-expert (Uma) — Aprobado para implementación*
*Referencia: Donezo Dashboard screenshot (2026-03-02)*
