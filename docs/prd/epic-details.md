# life-os PRD — 6. Epic Details

> **Documento:** [PRD Index](./index.md)
> **Sección:** 6 de 8

---

## E1 — Foundation & Auth

**Goal:** Infraestructura base funcional — Next.js + TailAdmin corriendo en Vercel, DB schema completo en Supabase con RLS, Auth operativa, CI/CD automático desde GitHub.

| Story | Título                                                                                | Executor            |
| ----- | ------------------------------------------------------------------------------------- | ------------------- |
| 1.1   | Setup proyecto (Next.js 16 + TailAdmin + Tailwind v4 + TypeScript + shadcn/ui)        | Human + AI          |
| 1.2   | Configuración Supabase (proyecto, Auth magic link/email, RLS base)                    | Human + AI          |
| 1.3   | CI/CD GitHub → Vercel (auto-deploy main + PR previews)                                | AI (@devops)        |
| 1.4   | DB Schema completo (activities, workflows, tasks, steps, areas, okrs, habits, skills) | AI (@data-engineer) |
| 1.5   | Layout base con TailAdmin (sidebar, navbar, routing App Router, dark mode)            | AI (@dev)           |
| 1.6   | Setup testing framework (Vitest + React Testing Library + configuración base E2E)     | AI (@dev)           |

---

## E2 — Perfil & Diagnóstico

**Goal:** El usuario obtiene su diagnóstico inicial de las 8 áreas Maslow (D-Needs/B-Needs) con scoring ponderado como baseline del sistema.

| Story | Título                                                                                      | Executor   |
| ----- | ------------------------------------------------------------------------------------------- | ---------- |
| 2.1   | Onboarding: flujo inicial post-login + selección de vía diagnóstico                         | Human + AI |
| 2.2   | Cuestionario científico por área (5-8 preguntas × 8 áreas, bases validadas)                 | AI (@dev)  |
| 2.3   | Upload/paste archivos psicométricos + análisis ILLMProvider                                 | AI (@dev)  |
| 2.4   | Cálculo de scores por área + Life System Health Score (código puro, multiplicadores Maslow) | AI (@dev)  |
| 2.5   | Vista Perfil: scores D-Needs/B-Needs, tendencia, resumen diagnóstico                        | AI (@dev)  |

---

## E3 — Áreas de Vida & OKRs

**Goal:** Gestión completa de áreas con scoring ponderado, alertas jerárquicas, y jerarquía OKR con progreso 100% automático. Incluye OKR Impact Score para selección óptima.

| Story | Título                                                                              | Executor  |
| ----- | ----------------------------------------------------------------------------------- | --------- |
| 3.1   | Vista Áreas: scores D-Needs/B-Needs, tendencia, tiempo invertido                    | AI (@dev) |
| 3.2   | Alertas: área nivel 1-2 >7 días sin actividad, desbalance >80% concentración        | AI (@dev) |
| 3.3   | Validación jerárquica: bloqueo soft OKR 7-8 si crisis nivel 1-2 (<50% por >14 días) | AI (@dev) |
| 3.4   | OKR Impact Score: cálculo de impacto en salud global por OKR candidato              | AI (@dev) |
| 3.5   | Visión 5 años (narrativa) + OKRs anuales (máx 3 — Buffett 5/25)                     | AI (@dev) |
| 3.6   | KRs trimestrales (Q1-Q4): time-based + outcome-based                                | AI (@dev) |
| 3.7   | Progreso automático KRs desde activities completadas + confirmación de hitos        | AI (@dev) |

---

## E4 — Proyectos, Workflows, Templates & Squads

**Goal:** El usuario puede crear proyectos con workflows visuales (React Flow), seleccionar templates AIOS-modeled, asignar squads de agentes, y ver steps ejecutados por IA vs humano.

| Story | Título                                                                                          | Executor  |
| ----- | ----------------------------------------------------------------------------------------------- | --------- |
| 4.1   | CRUD Proyectos (vinculados a Área + KR opcional)                                                | AI (@dev) |
| 4.2   | Visual Workflow Builder — React Flow canvas básico (nodos Task + Step, executor_type coloreado) | AI (@dev) |
| 4.3   | Templates de Workflow (8 predefinidos: Dev, Health Sprint, Learning, etc.) — AIOS-modeled       | AI (@dev) |
| 4.4   | Squads de agentes (Dev Squad, Research Squad, Personal Coach) asignables a workflows            | AI (@dev) |
| 4.5   | Steps tipo `ai` → cola AIOS automática \| Steps tipo `human` → calendarizan automáticamente     | AI (@dev) |
| 4.6   | CRUD Hábitos + generación de activities recurrentes (rrule) + detección emergente               | AI (@dev) |
| 4.7   | Daily Check-in: accountability activities del día anterior (máx 5-7 items, bulk confirm)        | AI (@dev) |

---

## E5 — Calendario & Time Tracking _(CRÍTICA)_

**Goal:** El calendario es el corazón de ejecución. 5 vistas sobre big-calendar, Time Budget visible, time tracking con start/stop/pausas y Realtime activo.

| Story | Título                                                                     | Executor  |
| ----- | -------------------------------------------------------------------------- | --------- |
| 5.1   | Integración big-calendar: adaptar Tailwind v3→v4 + configuración base      | AI (@dev) |
| 5.2   | Vista Día: timeline por horas + Time Budget + botones acción directa       | AI (@dev) |
| 5.3   | Vista Semana: 7 columnas + Time Budget semanal                             | AI (@dev) |
| 5.4   | Vista Mes: grid mensual con indicador por día                              | AI (@dev) |
| 5.5   | Vista Año: heatmap 365 días con drill-down a vista Día                     | AI (@dev) |
| 5.6   | Vista Agenda: lista cronológica de próximos compromisos                    | AI (@dev) |
| 5.7   | CRUD Eventos y Tareas (manual + recurrente con rrule)                      | AI (@dev) |
| 5.8   | Time tracking: start/stop explícito, pausas con razón, duración automática | AI (@dev) |
| 5.9   | Supabase Realtime para timer activo (latencia <1s)                         | AI (@dev) |

---

## E6 — Inbox & IA Calendarización

**Goal:** El usuario captura cualquier idea en texto libre y la IA propone cuándo ejecutarla con confirmación 1-click. Detección de proyectos emergentes desde inbox.

| Story | Título                                                                        | Executor  |
| ----- | ----------------------------------------------------------------------------- | --------- |
| 6.1   | Captura rápida Inbox (texto libre, shortcut global, desde Home)               | AI (@dev) |
| 6.2   | Pipeline IA: clasificación + área/OKR sugerido + detección huecos calendario  | AI (@dev) |
| 6.3   | Propuesta de slot + confirmación 1-click → activity creada                    | AI (@dev) |
| 6.4   | Detección de proyecto emergente: "Esto parece un workflow ¿crear proyecto X?" | AI (@dev) |
| 6.5   | Procesamiento manual (sin IA) + alerta inbox acumulado >7 días                | AI (@dev) |

---

## E7 — Habilidades

**Goal:** El usuario registra skills y el sistema detecta automáticamente skills emergentes desde el patrón de activities.

| Story | Título                                                                     | Executor  |
| ----- | -------------------------------------------------------------------------- | --------- |
| 7.1   | CRUD Habilidades (nombre, nivel Beginner→Expert, área/OKR vinculado)       | AI (@dev) |
| 7.2   | Tiempo invertido automático desde activities con skill_id                  | AI (@dev) |
| 7.3   | Detección emergente: "Has invertido 50h en TypeScript — ¿registrar skill?" | AI (@dev) |
| 7.4   | Vista progreso por skill (nivel + tiempo acumulado + tendencia)            | AI (@dev) |

---

## E8 — Informes, Correlaciones & Agent Leverage

**Goal:** El usuario ve métricas automáticas de su sistema, el motor detecta patrones invisibles (bucles, leverage points, bottlenecks), y un Agent Leverage Report muestra el ROI de los agentes IA.

| Story | Título                                                                                    | Executor            |
| ----- | ----------------------------------------------------------------------------------------- | ------------------- |
| 8.1   | Time by Area + Time by Project (semana/mes/trimestre)                                     | AI (@dev)           |
| 8.2   | Habit Consistency + CCR + OKR Progress + Area Health Trend                                | AI (@dev)           |
| 8.3   | Motor correlaciones: background job nocturno, Pearson/Spearman, umbral 14 días            | AI (@data-engineer) |
| 8.4   | Detección avanzada: bucles autodestructivos, puntos de apalancamiento, cuellos de botella | AI (@data-engineer) |
| 8.5   | Hábitos inconscientes detectados desde patterns de activities                             | AI (@dev)           |
| 8.6   | Insights en lenguaje natural (ILLMProvider) en Informes + Weekly Review                   | AI (@dev)           |
| 8.7   | Agent Leverage Report: % IA vs humano, AI Accuracy Rate, ROI por executor_type            | AI (@dev)           |
| 8.8   | Weekly Review guiado (4 fases: Medir→Analizar→Planificar→Confirmar)                       | AI (@dev)           |
