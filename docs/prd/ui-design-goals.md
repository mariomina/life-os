# life-os PRD — 3. User Interface Design Goals

> **Documento:** [PRD Index](./index.md)
> **Sección:** 3 de 8

---

## Overall UX Vision

life-os es una **app de ejecución, no de planificación**. La UI prioriza el _hacer_ sobre el _organizar_. El usuario llega a la app para saber qué ejecuta hoy, iniciar un timer, confirmar lo que hizo ayer, y capturar lo que está en su cabeza — todo con la mínima fricción posible. El Daily Check-in y el Calendario son el corazón de la interfaz; todo lo demás (OKRs, Áreas, Proyectos) existe para dar contexto a ese núcleo de ejecución.

## Key Interaction Paradigms

- **1-click execution:** Timer start/stop, Daily Check-in confirm, Inbox process → cada acción crítica en un solo tap
- **Time Budget siempre visible:** En vista Día y Semana — "X horas comprometidas / Y disponibles" — para planificación honesta
- **Progressive disclosure macro→micro:** Año → Mes → Semana → Día (drill-down natural, nunca saltar niveles)
- **Calendario como contrato visual:** Las actividades del día se ven como compromisos, no sugerencias
- **Notificaciones de contexto mínimas:** Banner de Daily Check-in pendiente en Home (persistente hasta completarse), alerta de Inbox acumulado > 7 días, alerta de área sin actividad > 7 días

## Core Screens and Views

1. **Home — Execution Space** — Dashboard diario: Life System Health, Time Budget del día, actividades de hoy, hábitos pendientes, banner de check-in, acceso rápido al Inbox
2. **Onboarding / Perfil & Diagnóstico** — Flujo inicial: upload psicométrico o cuestionario científico por área → scores iniciales
3. **Áreas de Vida** — Score % por área, tendencia, tiempo invertido, acceso a OKRs vinculados
4. **OKRs** — Visión 5Y → OKRs anuales → KRs trimestrales con progreso automático visual
5. **Proyectos** — Lista de proyectos activos con milestones y actividades
6. **Hábitos** — Streaks, consistencia, calendarios automáticos activos
7. **Habilidades** — Skills activas, nivel, tiempo invertido acumulado
8. **Calendario — Vista Año** — Grid 365 días con indicador visual por día (heatmap)
9. **Calendario — Vista Mes** — Grid mensual con indicador por día
10. **Calendario — Vista Semana** — 7 columnas + Time Budget semanal
11. **Calendario — Vista Día** — Timeline por horas, botones de acción directa, Time Budget diario
12. **Calendario — Agenda** — Lista cronológica de próximos compromisos
13. **Inbox** — Captura rápida + cola de items con sugerencias IA + procesamiento manual
14. **Weekly Review** — Flujo guiado 4 fases: Medir → Analizar → Planificar → Confirmar
15. **Informes & Analytics** — Time by Area/Project, CCR, Habit Consistency, OKR Progress, Correlaciones

## Accessibility

WCAG AA — MVP es single-user pero se aplican buenas prácticas base: contraste mínimo, navegación por teclado, labels semánticos.

## Branding

No definido en el brief. UI limpia y funcional, dark mode nativo (usuario técnico). Palette sobria con acentos de color por área Maslow para diferenciación visual. Decisión final delegada al `@ux-design-expert`.

## Target Device and Platforms

**Web Desktop-first** — optimizada para pantallas ≥ 1280px. Responsive pero no mobile-first. Mobile app (React Native) es post-MVP (Phase 2).
