# life-os PRD — 2. Requirements

> **Documento:** [PRD Index](./index.md)
> **Sección:** 2 de 8

---

## Functional Requirements

- **FR1:** El sistema debe generar un diagnóstico inicial con score % (0-100%) por cada una de las 8 Áreas de Vida Maslow, organizadas en **D-Needs** (niveles 1-4, carencia — déficit motiva) y **B-Needs** (niveles 5-8, crecimiento — motivación intrínseca), vía archivos psicométricos (upload/paste) o cuestionario científico validado por área. El **Life System Health Score** global se calcula como promedio ponderado usando multiplicadores por nivel: 2.0× (niveles 1-2 — Fisiológica + Seguridad), 1.5× (niveles 3-4 — Conexión Social + Estima), 1.2× (niveles 5-6 — Cognitiva + Estética), 1.0× (niveles 7-8 — Autorrealización + Autotrascendencia).
- **FR2:** El sistema debe mantener 8 Áreas de Vida con score % individual, agrupadas visualmente en D-Needs (1-4) y B-Needs (5-8). El Life System Health Score global es el promedio ponderado de los 8 scores de área (según multiplicadores FR1). Cada área muestra tendencia (mejorando/deteriorando) y el sistema emite alerta crítica automática si un área de nivel 1-2 lleva >7 días sin actividad registrada, o alerta warning para cualquier área >7 días sin actividad.
- **FR3:** El sistema debe soportar jerarquía OKR: Visión 5 años (narrativa) → máximo 3 OKRs anuales activos → KRs trimestrales (Q1/Q2/Q3/Q4) por OKR.
- **FR4:** El progreso de KRs debe calcularse 100% automáticamente: KRs _time-based_ desde `time_entries` vinculados; KRs _outcome-based_ por confirmación de hito — cero ingreso manual.
- **FR5:** El sistema debe soportar **Proyectos** como vehículos de ejecución de KRs. Cada proyecto contiene **Workflows** (flujos de trabajo), cada workflow contiene **Tasks** (fases), cada task contiene **Steps** (unidades verificables). Steps y Activities son la misma entidad con campo `executor_type: human | ai | mixed` — un step planeado ejecutado se convierte en activity (fact). Activities espontáneas (no planeadas) existen sin workflow padre pero siempre vinculadas a un Área.
- **FR5b:** Cada step/activity debe tener: `executor_type` (human/ai/mixed), `verification_criteria` (cómo se verifica que está done), `ai_agent` (qué agente AIOS ejecuta si es ai), `planned` (true/false). Steps de tipo `ai` se envían a la cola de ejecución AIOS automáticamente. Steps de tipo `human` se calendarizan automáticamente.
- **FR5c:** El sistema debe soportar **Templates de Workflow** predefinidos (mínimo 8 en MVP) seleccionables al crear un proyecto. Templates modelados como AIOS workflows (YAML/JSON): pre-populan tasks, steps, executor_types y squad sugerido. Categorías: Personal Development, Product Launch, Health Sprint, Learning, Content Creation, Financial Review, Habit Building, Custom.
- **FR5d:** El sistema debe soportar **Squads de agentes** asignables a workflows. Un squad es un conjunto predefinido de agentes AIOS asignados a un workflow según su tipo. Steps tipo `ai` heredan el agente del squad asignado al workflow. Squads predefinidos en MVP: Dev Squad (@architect+@dev+@qa+@devops), Research Squad (@analyst+@pm), Personal Coach (@analyst).
- **FR6:** Los Hábitos deben generar eventos recurrentes automáticos en el Calendario usando calendarios automáticos con reglas `rrule` (RFC 5545).
- **FR7:** El sistema debe soportar registro de Habilidades con nivel (Beginner/Intermediate/Advanced/Expert) y tiempo invertido calculado automáticamente desde `time_entries`.
- **FR8:** El Calendario debe incluir 5 vistas operativas: Año, Mes, Semana, Día y Agenda — con Time Budget diario y semanal visible (horas comprometidas vs. disponibles).
- **FR9:** El sistema debe implementar time tracking con start/stop explícito, pausas con razón registrada y cálculo automático de duración real total.
- **FR10:** El sistema debe implementar un Daily Check-in no omitible al abrir la app: accountability sobre actividades del día anterior, máximo 5-7 items por sesión con paginación, opción de bulk confirm para calendarios automáticos.
- **FR11:** El Inbox debe soportar captura en texto libre y procesamiento IA: clasificación de tipo, detección de ventanas de tiempo libre en el calendario, propuesta de bloque con confirmación 1-click.
- **FR12:** El sistema debe implementar Weekly Review guiado con 4 fases: Medir (métricas automáticas) → Analizar (insights IA + correlaciones) → Planificar (inbox + backlog) → Confirmar (semana comprometida).
- **FR13:** El sistema debe generar reportes automáticos: Time by Area, Time by Project, Habit Consistency, Calendar Commitment Rate (CCR), OKR Progress y Area Health Trend.
- **FR14:** El motor de correlaciones debe analizar `time_entries`, `checkin_responses` y `habit_completions` para detectar patrones estadísticos (Pearson/Spearman) y presentar insights en lenguaje natural con umbral mínimo de 14 días de datos.
- **FR15:** La arquitectura de IA debe ser agnóstica de proveedor via interfaz `ILLMProvider` (Claude / OpenAI / Gemini) configurable por variables de entorno sin modificar lógica de negocio.
- **FR16:** El sistema debe implementar autenticación de usuario vía Supabase Auth (magic link o email/password).
- **FR17:** El sistema debe implementar validación soft jerárquica: bloquear la creación de OKRs vinculados a áreas de nivel 7-8 (B-Needs avanzados) si algún área de nivel 1-2 (D-Needs críticos) tiene score <50% por más de 14 días consecutivos. Mostrar mensaje explicativo indicando la carencia bloqueante y su score actual.
- **FR18:** El sistema debe generar alertas automáticas de desbalance: (a) área nivel 1-2 sin actividad >7 días → alerta crítica persistente en Home, (b) >80% del tiempo total invertido concentrado en 1-2 áreas durante >14 días → alerta de desbalance sistémico, (c) área nivel 1-2 con score <50% por >14 días → alerta de crisis con activación del bloqueo soft de B-Needs (FR17).
- **FR19:** El sistema debe generar sugerencias automáticas de balanceo priorizando D-Needs (niveles 1-4) sobre B-Needs (niveles 5-8) en las recomendaciones del Home y Weekly Review. Si las condiciones de contexto prerrequisito (libertad/autonomía, transparencia/verdad, ambiente eupsíquico, desafío adecuado) están comprometidas, el sistema alerta al usuario como condición previa antes de planificar nuevos OKRs.
- **FR20:** El sistema debe implementar un **Visual Workflow Builder** — canvas interactivo estilo n8n para crear y editar workflows visualmente. Nodos arrastrables representan Tasks (rectángulos) y Steps (círculos coloreados por executor_type: azul=human, púrpura=ai, mixto=degradado). Flechas muestran dependencias y secuencia. Squad asignado visible en nodos AI. Status de ejecución en tiempo real sobre cada nodo. **Librería:** React Flow / XY Flow (`@xyflow/react`, MIT). MVP: builder funcional básico. Phase 2: canvas completo con mini-map, zoom, exportar como AIOS YAML.
- **FR21:** El sistema debe generar un **Agent Leverage Report** como parte de Informes: % steps ejecutados por IA vs humano, AI Accuracy Rate (steps IA que pasaron verificación sin corrección), ratio de apalancamiento (horas IA equivalentes / horas humano), ROI por tipo de executor, top workflows por leverage. Umbral mínimo: 14 días de datos.
- **FR22:** El sistema debe soportar un **modo de procesamiento manual explícito** como fallback cuando los proveedores de IA no estén disponibles o el usuario lo prefiera. En el Inbox, si `ILLMProvider` falla (timeout, error de proveedor, límite de cuota) o está deshabilitado vía configuración, el usuario puede clasificar y calendarizar items manualmente sin degradación del flujo principal. El sistema NO debe bloquear flujos críticos (Daily Check-in, Inbox, Calendario) por dependencia de IA. Los flujos de IA deben mostrar estado visible (processing / error / disabled) con fallback graceful a modo manual. (Relacionado con FR11, FR15)

---

## Non-Functional Requirements

- **NFR1:** Stack técnico obligatorio: Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS 4 + Supabase (PostgreSQL + Auth + RLS + Realtime) + Vercel.
- **NFR2:** Todas las tablas de Supabase deben tener Row Level Security (RLS) habilitado — ninguna tabla de datos de usuario sin RLS.
- **NFR3:** CI/CD automático desde GitHub `main` → Vercel production; PR previews habilitados — time to deploy < 5 minutos.
- **NFR4:** El sistema debe operar dentro del free tier de Vercel y Supabase (≤ 500MB DB) durante MVP single-user — $0 de infraestructura.
- **NFR5:** El Calendario DEBE implementarse usando `big-calendar` (github.com/lramos33/big-calendar, MIT) como base UI — prohibido construir desde cero. Adaptaciones requeridas: migración Tailwind v3→v4, integración de `rrule` como librería separada para recurrencia. El layout general del sistema usa `TailAdmin` (github.com/TailAdmin/free-nextjs-admin-dashboard, MIT) como base para sidebar, dashboard y charts.
- **NFR6:** Los eventos recurrentes deben calcularse on-the-fly con `rrule` — solo persistir ocurrencias pasadas/presentes en DB, no pre-generar ocurrencias futuras.
- **NFR7:** El time tracking activo debe actualizarse en tiempo real vía Supabase Realtime — latencia máxima de UI < 1 segundo para timer en curso.
- **NFR8:** El motor de correlaciones corre como background job (Supabase Edge Function o cron) una vez por noche — no en tiempo real.
- **NFR9:** Arquitectura feature-based dentro de Next.js App Router: `/app/(features)/calendar`, `/app/(features)/okrs`, etc.
- **NFR10:** MVP es single-user — no requiere multi-tenancy. Auth existe para protección de datos, no para gestión de roles.
