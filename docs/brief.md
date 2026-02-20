# Project Brief: life-os

> **Generado por:** Atlas (Analyst Agent) — YOLO Mode
> **Fecha:** 2026-02-18
> **Estado:** Draft v1.8 — Modelo AIOS (Proyectos→Workflows→Tasks→Steps=Activities) + Templates + Squads + Visual Builder (React Flow) + Testing Stack (Vitest+RTL)

---

## Executive Summary

**life-os** es un sistema operativo personal de gestión de vida construido sobre Next.js + Supabase + Vercel, que integra 11 frameworks de productividad en una interfaz unificada estructurada por el principio: **planear de arriba hacia abajo, ejecutar de abajo hacia arriba**.

El sistema organiza la vida en una jerarquía descendente: Áreas de vida (eternas) → OKRs (5 años, anual, trimestral) → Proyectos / Hábitos / Sprints → Calendario de ejecución diaria. Todo lo que entra al calendario **se hace** — convirtiendo objetivos abiertos en objetivos cumplidos. El Inbox actúa como zona de aterrizaje para todo lo que está en la cabeza, donde un agente IA detecta tiempo disponible en el calendario y calendariza con 1 click.

El motor de **detección de correlaciones** es una pieza central desde el inicio: el sistema identifica automáticamente qué actividades, proyectos y hábitos potencian o dañan el enfoque del usuario — cerrando el loop entre ejecución y optimización del sistema. La arquitectura de IA es **agnóstica de proveedor** (Claude, OpenAI, Gemini, u otros) — sin vendor lock-in.

El producto resuelve un problema profundamente personal: **la dificultad de ser consistente** — no por falta de conocimiento o motivación, sino por ausencia de un sistema que cierre el gap entre la intención estratégica y la ejecución diaria, y que además aprenda de los patrones del usuario para optimizarse.

---

## Problem Statement

### El Problema Central

La inconsistencia es el mayor enemigo del progreso personal. El usuario conoce los frameworks (11 de ellos), tiene ambición estratégica, pero el sistema que usaría para conectar esa visión con la ejecución diaria no existe como producto coherente.

El resultado: planificación que no aterriza en acción, acción que no conecta con objetivos, y tiempo que se evapora sin evidencia de adónde fue — y sin mecanismo para detectar qué está funcionando y qué no.

### Pain Points Identificados

- **Brecha estrategia → ejecución:** Los OKRs existen en un documento, las actividades del día existen en otro. No hay puente automático entre ambos.
- **El calendario como compromiso vacío:** Los eventos del día se mueven, se posponen, se cancelan. No hay contrato claro de que "lo que entra al calendario, se hace".
- **Inbox mental sin sistema:** Todo lo que aparece en la cabeza (ideas, proyectos, actividades) va a algún limbo (notas sueltas, apps desconectadas) y se pierde o se acumula sin procesar.
- **Sin visibilidad de dónde va el tiempo:** Sin time tracking formal, no hay evidencia de cuánto tiempo se invierte por área, proyecto o hábito — imposible mejorar lo que no se mide.
- **Sin diagnóstico del punto de partida:** Sin un estado claro de cada área de vida, el usuario no sabe qué optimizar primero. Las decisiones de planificación son intuición, no datos.
- **Sin detección de patrones:** El usuario no sabe qué actividades lo potencian ni cuáles drenan su enfoque — correlaciones invisibles que el sistema debería revelar.
- **Fragmentación de herramientas:** Google Calendar para eventos, Notion para notas, otra app para hábitos, otra para OKRs — fricción constante, datos desconectados.

### Por Qué las Soluciones Existentes Fallan

| Solución           | Limitación crítica                                                 |
| ------------------ | ------------------------------------------------------------------ |
| Google Calendar    | Sin contexto de áreas, OKRs ni hábitos. Solo eventos.              |
| Notion             | Sin calendario real, sin time tracking, sin lógica de priorización |
| Todoist / Things   | Task managers sin jerarquía de vida ni calendario tipo Google      |
| Habitica / Streaks | Solo hábitos, sin conexión a objetivos estratégicos                |
| Toggl / Clockify   | Time tracking puro, sin planificación                              |
| Linear / Jira      | Orientado a equipos, no a vida personal multidimensional           |

**El gap:** Ninguna herramienta conecta la pirámide completa Áreas → OKRs → Proyectos/Hábitos → Calendario → Ejecución → Correlaciones → Informes en un solo sistema coherente que aprenda del usuario.

---

## Proposed Solution

### Filosofía Core

> **"Planear de arriba hacia abajo. Ejecutar de abajo hacia arriba. Optimizar con datos."**

La planificación parte de lo más abstracto (áreas de vida) y desciende hasta el día. La ejecución parte del calendario diario y asciende hacia los objetivos. El motor de correlaciones detecta qué está funcionando. El sistema cierra el loop.

### El Ciclo Fundamental — Dónde vive la app

```
INVESTIGAR → PLANEAR → EJECUTAR → MEDIR → OPTIMIZAR
   (fuera)    (mixto)   (app)     (app)    (app + IA)
```

- **Investigar:** Ocurre fuera de la app (lectura, reflexión, conversaciones, investigación externa)
- **Planear:** Parcialmente fuera (visión, estrategia mental), parcialmente dentro (OKRs, proyectos, hábitos — la app estructura lo ya pensado)
- **Ejecutar:** **El corazón de la app.** El calendario, el time tracking, el daily check-in, el inbox — todo sirve para ejecutar con consistencia
- **Medir:** Dentro de la app. Los informes cierran el ciclo con métricas automáticas
- **Optimizar:** La IA detecta correlaciones entre actividades, hábitos y rendimiento — y alimenta la siguiente iteración de Planear

**Implicación de diseño:** La app no es una herramienta de pensamiento — es una herramienta de ejecución, medición y optimización. El módulo de mayor uso esperado es el Calendario + Daily Check-in.

### Arquitectura del Sistema — 8 Módulos

```
┌─────────────────────────────────────────────────────────────────┐
│  HOME — EXECUTION SPACE (Dashboard diario)                      │
│  "¿Qué ejecuto hoy? ¿Cómo voy? ¿Cómo está mi sistema?"       │
│  Life System Health: 74%  ████████░░                           │
├─────────────────────────────────────────────────────────────────┤
│  PERFIL PERSONAL (Diagnóstico + Onboarding)                     │
│  Archivos psicométricos · Cuestionario científico · Score %    │
│  "¿Quién soy y cuál es el estado real de cada área?"          │
├─────────────────────────────────────────────────────────────────┤
│  ÁREAS DE VIDA  (Maslow 8 niveles)                              │
│  Score por área %  |  Tiempo invertido  |  Tendencia           │
│  "¿En qué dimensión de mi vida trabajo y qué tan bien está?"   │
├─────────────────────────────────────────────────────────────────┤
│  OKRs  (Visión 5Y → 3 OKRs Anuales → KRs por trimestre)        │
│  Progreso automático desde time_entries + logros confirmados    │
│  "¿Hacia dónde voy y cómo mido si llego?"                      │
├─────────────────────────────────────────────────────────────────┤
│  PROYECTOS / HÁBITOS / MILESTONES                               │
│  "¿Cuál es el vehículo de ejecución?"                          │
│  ↕ Ejecución posible desde aquí también                        │
├─────────────────────────────────────────────────────────────────┤
│  HABILIDADES                                                    │
│  Skills activas · Nivel · Tiempo invertido (desde time_entries) │
│  "¿Qué competencias estoy desarrollando?"                       │
├─────────────────────────────────────────────────────────────────┤
│  CALENDARIO  (Vista temporal de actividades)                    │
│  Vistas: Año · Mes · Semana · Día · Agenda                      │
│  Time Budget diario: "6h comprometidas / 8h disponibles"       │
│  ↕ Ejecución posible desde aquí también                        │
├─────────────────────────────────────────────────────────────────┤
│  INBOX  (Brain dump → IA → Calendarización 1-click)             │
│  "¿Tengo cabeza para esto? La IA me dice cuándo y pide conf."  │
├─────────────────────────────────────────────────────────────────┤
│  INFORMES & ANALYTICS + CORRELACIONES                           │
│  "¿Qué hice, cuánto tiempo, qué tan consistente fui?"         │
│  "¿Qué actividades potencian o dañan mi enfoque?"             │
└─────────────────────────────────────────────────────────────────┘
```

### El Calendario es una Vista, no un Módulo aislado

**Aclaración arquitectónica fundamental:** El Calendario no es donde "viven" las actividades — es la **vista temporal** de todas las actividades del sistema. Una actividad puede ser vista y ejecutada desde múltiples lugares:

```
ACTIVIDAD (entidad core)
  ├─ Vista desde CALENDARIO → ¿cuándo sucede? (por día/semana/mes/año)
  ├─ Vista desde PROYECTO   → ¿a qué proyecto pertenece?
  ├─ Vista desde MILESTONE  → ¿qué milestone avanza?
  ├─ Vista desde HÁBITO     → ¿qué streak construye?
  └─ Vista desde HOME       → ¿qué hago hoy?

La ejecución (▶ Iniciar timer / ✓ Completar) puede
dispararse desde CUALQUIERA de estas vistas.
```

"Calendarizar" = asignar una fecha de ejecución comprometida a una actividad. No significa que viva "en" el calendario — significa que aparece en la vista temporal y forma parte del contrato de ejecución del día.

### El Flujo Completo

```
PLANEAR (top-down):
Áreas de vida (con score % como punto de partida)
    └─ OKRs (5 años → anual → Q1/Q2/Q3/Q4)
         └─ Proyectos / Hábitos / Milestones
              └─ Actividades con fecha
                   └─ Calendario (compromiso)

INBOX (procesamiento con IA):
"Tengo una idea/tarea/proyecto" → Inbox
    └─ IA analiza coste de oportunidad + tiempo disponible
         ├─ 1 actividad → propone bloque de tiempo → 1-click confirmar
         ├─ Varias actividades → propone crear proyecto
         └─ Sin tiempo disponible → backlog "Algún día" o Eliminar

EJECUTAR (bottom-up):
Calendario del día (Time Budget: X/Y horas comprometidas)
    └─ Hacer la actividad (time tracking automático)
         └─ Actualiza progreso de Proyecto/Hábito/Skill
              └─ Actualiza KR automáticamente
                   └─ Actualiza OKR
                        └─ Refleja en Área de vida

MEDIR + OPTIMIZAR:
Informes → ¿Cuánto tiempo invertí por área/OKR/proyecto?
         → ¿Qué tan consistente fui en hábitos?
         → Motor de correlaciones: ¿qué actividades potencian mi enfoque?
         → Weekly Review: ROI semanal, alineación OKR, ¿qué mejorar?
```

### El Calendario como Contrato

El módulo de Calendario es el núcleo de ejecución del sistema. A diferencia de Google Calendar (donde los eventos son suggestions), en life-os **todo lo que se calendariza es un compromiso**. Si algo entra al calendario, la asunción del sistema es que se hará. Si no se hace, se registra y analiza (alimenta el motor de correlaciones).

### El Inbox con IA como Filtro Inteligente

El Inbox no es solo un GTD capture — es el punto de entrada donde la IA aplica criterio de **coste de oportunidad** de forma automática:

1. El usuario captura cualquier cosa en texto libre
2. La IA analiza: tipo de actividad, área probable, alineación con OKRs activos
3. La IA detecta ventanas de tiempo libre en el calendario
4. Propone: "Bloquear martes 10:00-11:30 para esta actividad — ¿confirmas?"
5. 1-click: confirmar → queda calendarizado
6. Si son varias actividades relacionadas → "Esto parece un proyecto — ¿crear proyecto X?"

### Dashboard — Espacio de Ejecución

```
┌─────────────────────────────────────────────────────────────────┐
│  HOME — EXECUTION SPACE                                         │
├─────────────────────────────────────────────────────────────────┤
│  Life System Health: 74%  ████████░░   [Ver por área →]        │
├─────────────────────────────────────────────────────────────────┤
│  [Daily Check-in pendiente — 3 items sin confirmar]  ← banner  │
├─────────────────────────────────────────────────────────────────┤
│  HOY — Time Budget: 5.5h / 8h comprometidas                    │
│  08:00  Ejercicio 45min       [▶ Iniciar]   [Hábito: Salud]   │
│  10:00  Deep Work — life-os   [▶ Iniciar]   [Proyecto: Dev]   │
│  12:00  Sueño (8h) confirmado [✓]           [Auto: Sueño]     │
├─────────────────────────────────────────────────────────────────┤
│  HÁBITOS HOY                                                    │
│  Meditación  ████░  4 días streak   [ ]                        │
│  Ejercicio   ██████ 6 días streak   [✓]                        │
├─────────────────────────────────────────────────────────────────┤
│  INBOX  [3 items sin procesar]        [+ Capturar idea]        │
├─────────────────────────────────────────────────────────────────┤
│  MEDIR — Semana actual                                          │
│  Tiempo total: 18h  |  Áreas activas: 5/8  |  CCR: 74%       │
└─────────────────────────────────────────────────────────────────┘
```

### Diferenciadores Clave

1. **Diagnóstico científico del punto de partida:** Score % por área basado en cuestionarios validados — el sistema sabe dónde estás antes de planificar adónde vas.
2. **Motor de correlaciones:** El sistema detecta qué potencia y qué daña tu enfoque — optimización basada en datos reales, no intuición.
3. **IA multi-proveedor:** Claude, OpenAI, Gemini u otros — sin vendor lock-in. La arquitectura de IA es intercambiable.
4. **App de ejecución, no de planificación:** La UI prioriza el hacer sobre el organizar.
5. **Jerarquía completa conectada:** La tarea de hoy se puede trazar hasta el área de vida y el objetivo de 5 años.
6. **Calendario como contrato:** Compromiso explícito — lo que entra, se hace.
7. **Métricas 100% automáticas:** Sin ingreso manual de progreso. Todo se calcula desde time_entries y acciones confirmadas.

---

## Target Users

### Primary User Segment: Mario (el creador)

**Perfil:**

- Desarrollador técnico con pensamiento sistémico
- Familiarizado con los 11 frameworks integrados
- Historial de intentar múltiples herramientas sin encontrar coherencia entre ellas
- Problema específico: conoce la teoría, falla en la consistencia de aplicación

**Comportamiento actual:**

- Planifica estratégicamente pero el plan no aterriza en el calendario con regularidad
- El inbox mental no tiene sistema de procesamiento formal
- El tiempo se va sin evidencia de cuánto fue a qué área/proyecto
- No tiene diagnóstico claro del estado actual de cada área de vida

**Necesidades:**

- Un diagnóstico objetivo de dónde está su sistema de vida ahora
- Un lugar donde volcar todo lo que está en la mente sin perderlo
- IA que procese el inbox y calendarice sin fricción
- Métricas automáticas de consistencia y correlaciones de impacto

**Objetivo:** Pasar de "tengo claridad estratégica pero inconsistencia táctica" a "lo que planifico entra al calendario, lo que entra se hace, y el sistema me dice qué está funcionando".

### Secondary User Segment: Potencial futuro

_Post-MVP: otros individuos con pensamiento sistémico que buscan un OS de vida integrado, no apps parciales._

---

## Goals & Success Metrics

### Business Objectives

- Sistema en producción (Vercel + Supabase) con despliegue continuo desde GitHub
- El creador lo usa como herramienta principal de planificación y ejecución durante 30+ días consecutivos
- Reemplaza Google Calendar + Notion + app de hábitos + time tracking manual

### User Success Metrics

- **Life System Health:** Score global ≥ 70% al finalizar el mes 1 (con al menos 4 áreas activas)
- **Consistencia de calendar:** ≥ 80% de las tareas/eventos comprometidos completados en la semana
- **Cobertura de Inbox:** Procesado al menos 1 vez por semana (Weekly Review)
- **OKR tracking:** KRs actualizados automáticamente — cero intervención manual
- **Correlaciones detectadas:** Al menos 3 correlaciones identificadas por el motor en el primer mes

### Key Performance Indicators (KPIs)

- **Life System Health Score:** % global del estado del sistema (ponderado por áreas)
- **Area Health Score:** % por cada una de las 8 áreas Maslow
- **Calendar Commitment Rate (CCR):** % de items del calendario completados vs. programados (target: ≥ 80%)
- **Inbox Processing Rate:** % de items procesados en la semana (target: 100% antes del Weekly Review)
- **Time Logged:** Horas con actividad trackeada (target: ≥ 60% de horas productivas)
- **Area Coverage:** Número de áreas con tiempo registrado en la semana (target: ≥ 4/8)
- **Streak Consistency:** % de hábitos activos sin "miss" en los últimos 7 días (target: ≥ 75%)

---

## MVP Scope

### Core Features (Must Have)

**Módulo 0 — Perfil Personal & Diagnóstico:**

El sistema necesita saber el estado actual del usuario antes de planificar. Dos vías de onboarding equivalentes:

**Vía A — Archivos psicométricos:**

```
Archivos de entrada:
- Enneagrama (tipo de personalidad, motivaciones, miedos)
- DISC (estilo de comportamiento: Dominance/Influence/Steadiness/Conscientiousness)
- Big Five / OCEAN (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism)
- Contexto personal (situación actual, goals, vida)
- Principios fundamentales (valores, compromisos personales)
- [otros tests ~5 más]
```

El usuario sube/pega el contenido. La IA procesa y genera diagnóstico.

**Vía B — Cuestionario de diagnóstico científico:**

Si el usuario no tiene archivos, el sistema aplica un cuestionario por área con **preguntas científicamente validadas y específicas** para cada dimensión Maslow:

| Área Maslow                               | Base científica del cuestionario                                 |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Fisiológica (salud, sueño, nutrición)     | Pittsburgh Sleep Quality Index (PSQI), IPAQ actividad física     |
| Seguridad (economía, vivienda, empleo)    | Financial Wellbeing Scale (FWBs), evaluación estabilidad laboral |
| Conexión social (relaciones, pertenencia) | UCLA Loneliness Scale, Social Connectedness Scale                |
| Reconocimiento (autoestima, logros)       | Rosenberg Self-Esteem Scale (RSES)                               |
| Cognitiva (aprendizaje, creatividad)      | Need for Cognition Scale (NCS)                                   |
| Estética (orden, belleza, entorno)        | Aesthetic Sensitivity Scale                                      |
| Autorrealización (propósito, crecimiento) | Meaning in Life Questionnaire (MLQ), Flourishing Scale           |
| Trascendencia (contribución, legado)      | Purpose in Life Test (PIL)                                       |

**Output del diagnóstico (ambas vías):**

- **Score por área: 0-100%** (estado actual de cada dimensión Maslow)
- **Life System Health: 0-100%** (score global ponderado)
- 3-5 hábitos recomendados según diagnóstico
- Áreas de foco sugeridas para el primer OKR anual

El usuario revisa, ajusta y confirma. El diagnóstico queda como **baseline** del sistema — se actualiza en cada Weekly Review o cuando el usuario decide repetir el diagnóstico.

**Módulo 1 — Áreas de Vida:**

Las 8 áreas se estructuran en dos grupos funcionales de la jerarquía Maslow ampliada:

**D-Needs (Necesidades de Carencia)** — déficit motiva, satisfacción elimina tensión:

```
Nivel 1 — Fisiológica (Homeostasis y Supervivencia)
          sueño/descanso, nutrición, hidratación, movimiento, refugio, salud básica
Nivel 2 — Seguridad (Protección y Estabilidad)
          salud física/mental, finanzas, empleo, vivienda, orden y estructura
Nivel 3 — Conexión Social (Pertenencia/Amor)
          pareja, familia, amigos, comunidad, intimidad emocional, aceptación
Nivel 4 — Estima (Reconocimiento y Valor)
          logros, reconocimiento externo, autoeficacia, reputación, autonomía
```

**B-Needs (Necesidades de Crecimiento)** — motivación intrínseca, nunca se agotan completamente:

```
Nivel 5 — Cognitiva (Conocimiento y Comprensión)
          aprendizaje continuo, creatividad, pensamiento crítico, resolución de problemas
Nivel 6 — Estética (Belleza y Armonía)
          arte, naturaleza, orden del entorno, expresión creativa, experiencias estéticas
Nivel 7 — Autorrealización (Potencial Máximo)
          propósito, misión personal, crecimiento continuo, vivir según valores propios
Nivel 8 — Autotrascendencia (Más Allá del Yo)
          legado, servicio a otros, causas mayores, conexión espiritual, contribución
```

**Condiciones de Contexto (prerrequisitos ambientales):**

```
- Libertad y Autonomía (capacidad de elegir sin coacción)
- Transparencia y Verdad (acceso a información confiable)
- Ambiente Eupsíquico (cultura positiva, entorno social sano)
- Desafío Adecuado (estimulación óptima — ni aburrimiento ni abrumamiento)
```

**Sistema de Scoring:**

- Score por área: 0-100% (actualizado desde diagnóstico + time tracking)
- **Life System Health Score global** = promedio ponderado con multiplicadores por nivel:
  - Niveles 1-2 (D-Needs críticos): **2.0×** — base de supervivencia
  - Niveles 3-4 (D-Needs sociales): **1.5×** — conexión y reconocimiento
  - Niveles 5-6 (B-Needs tempranos): **1.2×** — crecimiento cognitivo/estético
  - Niveles 7-8 (B-Needs avanzados): **1.0×** — autorrealización y trascendencia
- Tendencia visual por área: mejorando / estable / deteriorando

**Reglas de Validación del Sistema:**

- ❌ Bloquear soft OKRs de nivel 7-8 si algún área nivel 1-2 tiene score <50% por >14 días
- ⚠️ Alerta crítica: área nivel 1-2 sin actividad >7 días
- ⚠️ Alerta desbalance: >80% del tiempo en 1-2 áreas por >14 días
- 💡 Sugerencia automática de balanceo: el sistema prioriza D-Needs sobre B-Needs en recomendaciones

**Módulo 2 — OKRs:**

Estructura jerárquica confirmada:

```
VISIÓN 5 AÑOS (narrativa aspiracional — sin KRs)
  └─ OKR ANUAL (máximo 3 activos — 5/25 Rule)
       └─ Objective: "Convertirme en desarrollador senior" [anual]
            ├─ Q1 → KR1: "Lanzar life-os en producción"
            │        KR2: "Completar curso X de TypeScript"
            ├─ Q2 → KR3: "Contribuir a 2 proyectos open source"
            └─ Q3 → KR4: ...
```

- **Máximo 3 OKRs anuales activos** (5/25 Rule — los demás van a Backlog)
- Cada OKR anual se descompone en **KRs trimestrales** (Q1/Q2/Q3/Q4)
- **Progreso del KR: 100% automático — sin ingreso manual**
  - KRs _time-based_ (ej: "invertir 100h en X") → se actualiza desde `time_entries` vinculados
  - KRs _outcome-based_ (ej: "lanzar app en producción") → se activa por confirmación de hito (binario: logrado/no logrado, basado en actividades completadas vinculadas al KR)
  - El progreso global del OKR = promedio ponderado automático de sus KRs

**Módulo 3 — Proyectos, Workflows, Templates & Squads:**

El modelo de ejecución está inspirado en AIOS, unificando la gestión de vida con la ejecución humano+IA bajo el mismo paradigma:

```
PROYECTO (vehículo que ejecuta un KR)
  └── WORKFLOW (flujo de trabajo del proyecto — modelado como AIOS workflow)
       └── TASK (fase del workflow — secuencial o paralela)
            └── STEP = ACTIVITY (unidad atómica verificable)
                  ├── executor: human → se calendarizan automáticamente
                  ├── executor: ai    → van a cola AIOS (agente asignado)
                  └── executor: mixed → IA prepara, humano aprueba
```

**Activities espontáneas (no planeadas):** Existen sin workflow padre (ver Netflix, paseo espontáneo) pero siempre vinculadas a un Área. Alimentan el motor de correlaciones igual que las planeadas.

**Templates de Workflow (AIOS-modeled):**

- 8 templates predefinidos en MVP: Dev Sprint, Health Optimization, Learning Path, Content Creation, Financial Review, Habit Building, Product Launch, Custom
- Modelados como AIOS workflows (JSON/YAML): pre-populan tasks, steps, executor_types y squad sugerido
- Al crear proyecto → seleccionar template → workflow pre-configurado listo para ejecutar

**Squads de Agentes:**

- Un squad = grupo de agentes AIOS asignados a un workflow
- Steps tipo `ai` heredan el agente correspondiente del squad
- Squads predefinidos MVP:
  - **Dev Squad:** @architect + @dev + @qa + @devops
  - **Research Squad:** @analyst + @pm
  - **Personal Coach:** @analyst (correlaciones + insights)

**Visual Workflow Builder (React Flow / XY Flow):**

- Canvas interactivo estilo n8n para construir y editar workflows visualmente
- Nodos Task (rectángulos) y Step (círculos coloreados por executor_type)
  - 🔵 Azul = human | 🟣 Púrpura = AI | 🔀 Degradado = mixed
- Flechas muestran dependencias y secuencia de ejecución
- Squad asignado visible en nodos AI
- Status de ejecución en tiempo real sobre cada nodo
- Phase 2: exportar workflow como AIOS YAML para ejecución directa

**Hábitos:**

- Activities recurrentes generadas con rrule (RFC 5545)
- Detección emergente: el sistema identifica patrones de activities repetidas y alerta: "Llevas 18 días haciendo esto — ¿convertirlo en hábito consciente?"
- Confirmados en Daily Check-in

**Regla de vinculación:** Toda activity (planeada o espontánea) debe pertenecer a **al menos un Área de vida**. Sin excepción — garantiza que los Informes de tiempo por área sean 100% completos.

**Módulo 4 — Habilidades:**

- Registro de skills activas (nombre + descripción)
- Nivel actual: Beginner / Intermediate / Advanced / Expert
- Tiempo total invertido — calculado automáticamente desde `time_entries` vinculados (un evento del calendario puede vincularse a una skill al crearlo o al registrar time)
- Vinculación opcional a OKR o Proyecto padre
- Sin gestión de "sesiones de estudio" dedicadas en MVP — el tracking viene de events/tasks del calendario con `skill_id` asignado

**Módulo 5 — Calendario:**

_Tipos de calendario:_

- **Calendarios manuales:** el usuario crea eventos/tareas directamente
- **Calendarios automáticos:** generan eventos recurrentes por regla. Ejemplo: "Sueño — 8h diarias" genera automáticamente un bloque cada noche. Al día siguiente, el Daily Check-in confirma el tiempo real.

_Vistas (todas en MVP):_

- **Año:** grid de 365 días con indicador visual por día (punto/color si hay actividades). Al presionar un día → abre vista Día.
- **Mes:** grid mensual con indicador por día. Al presionar un día → abre vista Día.
- **Semana:** columnas de 7 días con indicador por día. Al presionar un día → abre vista Día. Incluye **Time Budget semanal**.
- **Día (vista principal):** Timeline por horas. Cada actividad con: horario, estado, contexto (hábito/proyecto/milestone), botones de acción directa. **Time Budget diario visible:** "X horas comprometidas / Y disponibles".
- **Agenda:** lista cronológica de próximas actividades sin grid.

_Justificación de todas las vistas en MVP:_ Cada vista permite una perspectiva distinta del sistema (macro→micro: Año=consistencia anual, Mes=balance mensual, Semana=planificación táctica, Día=ejecución, Agenda=próximos compromisos). Implementarlas desde el inicio evita refactoring estructural posterior.

_Time Budget (Presupuesto de Tiempo):_

- Visible en vista Día y Semana
- Calcula: horas de actividades comprometidas vs. horas disponibles en el día/semana
- Alerta visual si el día está sobre-comprometido (overcommitment)
- Permite planificación honesta: "Ya tengo 7h comprometidas — ¿agrego 2h más?"

_Eventos y tareas:_

- **Eventos:** bloque de tiempo con hora inicio/fin. Recurrencia configurable (diario, semanal, mensual, personalizado con `rrule`).
- **Tareas:** sin hora fija, aparecen en barra lateral del día. Con fecha de vencimiento y recurrencia.
- **Estado "Pospuesto":** cuando una actividad no se completa, puede marcarse como Pospuesta con nueva fecha asignada (no solo "fallida") — diferencia crítica para datos de consistency.

_Time tracking (start/stop explícito):_

- Al iniciar una actividad → el sistema registra `started_at`
- Al terminar → registra `ended_at`, calcula duración real automáticamente
- Si se **pausa** → registra motivo de pausa y tiempo acumulado hasta ese momento
- Al marcar completada → registra tiempo real total (suma de segmentos si hubo pausas)
- Para calendarios automáticos (ej. sueño): el sistema registra el bloque planificado y al día siguiente solicita confirmación/ajuste del tiempo real

**Daily Check-in (Flujo de apertura de la app):**

Cada vez que el usuario abre la app, el sistema presenta accountability sobre las actividades del día anterior. Diseñado para escalar:

```
Límite: máximo 5-7 items por sesión de check-in
Items restantes → "4 más por confirmar" (paginación)
Calendarios automáticos (sueño, meditación) → bulk confirm disponible

Para cada actividad pendiente:
  → "¿Completaste [actividad]?"
       ├─ SÍ → "¿Cuánto tiempo te tomó?" (confirmar o ajustar)
       ├─ PARCIALMENTE → "¿Cuánto completaste? ¿Por qué no terminaste?"
       ├─ NO → "¿Por qué?" (razón: tiempo/motivación/emergencia/decisión consciente/otro)
       │         └─ "¿Qué hacemos?" → Reprogramar a [fecha] / Mover a backlog / Eliminar
       └─ POSPUESTO → ya tiene nueva fecha asignada (no requiere acción)
```

El check-in es **no omitible** — es el mecanismo central de accountability. El banner persiste en el Home hasta completarse. Si el usuario cierra la app sin completarlo, reaparece en el próximo login. Los datos capturados alimentan el motor de correlaciones y los Informes.

**Módulo 6 — Inbox:**

- Captura rápida (shortcut global o botón prominente): texto libre sin estructura obligatoria
- **Procesamiento con IA:**
  - La IA clasifica el item (tarea / evento / proyecto / hábito / idea)
  - Detecta área probable y alineación con OKRs activos
  - Detecta ventanas de tiempo libre en el calendario
  - Propone: "Bloquear [día] [hora] para esto — ¿confirmas?" → 1-click para aceptar
  - Si son múltiples items relacionados → "Esto parece un proyecto ¿crear proyecto [nombre]?"
  - Si no hay tiempo disponible → sugiere backlog "Algún día" o descarte
- Opción de procesamiento manual (el usuario clasifica sin IA si lo prefiere)
- Items sin procesar > 7 días → alerta de Inbox acumulado

**Weekly Review (Revisión Semanal):**

Flujo guiado disponible desde el Home o Inbox — activado idealmente cada domingo. Estructura tipo Sprint Retrospectiva adaptada a vida personal:

```
1. MEDIR — ¿Qué pasó esta semana?
   → Tiempo por área (automático desde time_entries)
   → CCR: % de compromisos del calendario cumplidos
   → Hábitos: streaks y consistencia
   → OKRs: progreso de KRs activos

2. ANALIZAR — ¿Cuánto ROI obtuve?
   → IA destaca: "Invertiste 12h en Deep Work — OKR de desarrollo avanzó 8%"
   → Motor de correlaciones: "Los días con ejercicio tuvieron 40% más tiempo en Deep Work"
   → Áreas sin actividad esta semana

3. PLANIFICAR — ¿Qué hago la próxima semana?
   → Revisar Inbox pendiente → calendarizar con IA
   → Revisar backlog de proyectos → asignar actividades a días
   → Ajustar Time Budget semanal
   → ¿Qué mejoraría vs. esta semana?

4. CONFIRMAR — Semana siguiente comprometida
   → Vista semanal con actividades ya planificadas
   → Time Budget semanal: "32h comprometidas / 40h disponibles"
```

**Módulo 7 — Informes & Analytics + Motor de Correlaciones:**

_Reportes básicos (MVP):_

- **Time by Area:** tiempo total por área Maslow en período seleccionable (semana/mes/trimestre)
- **Time by Project:** top proyectos por tiempo invertido
- **Habit Consistency:** tabla de streaks y % de cumplimiento por hábito
- **Calendar Commitment Rate:** % de items del calendario completados vs. programados
- **OKR Progress:** estado visual de todos los OKRs activos y sus KRs (calculado automáticamente)
- **Area Health Trend:** evolución del score % por área a lo largo del tiempo

_Motor de Correlaciones (MVP — diferenciador core):_

El sistema analiza patrones entre variables de ejecución para detectar qué potencia y qué daña el rendimiento del usuario:

```
Correlaciones que el motor detecta:
→ Hábito X + Actividad Y → ¿mayor tiempo en Deep Work?
→ Días sin ejercicio → ¿menor CCR?
→ Inbox procesado el domingo → ¿mejor planificación semana siguiente?
→ Horas de sueño vs. productividad del día siguiente
→ Tipo de actividad vs. energía auto-reportada (Daily Check-in)

Output: "Los días que meditaste completaste 35% más actividades del calendario"
        "Tus sesiones de Deep Work son 2x más largas después de ejercicio"
        "El área de Conexión Social lleva 3 semanas por debajo del 40%"
```

La IA analiza los `time_entries`, `checkin_responses` y `habit_completions` para identificar patrones estadísticos. Los resultados se presentan en lenguaje natural en la sección de Informes y en el Weekly Review.

### Out of Scope para MVP

- Scrum completo: kanban board, sprint planning formal, sprint retrospectiva guiada (→ Phase 2)
- Intelligence Layer cronobiológica automática (→ Phase 2)
- Validaciones automáticas Maslow (alertas de crisis nivel 1-2 programáticas) (→ Phase 2)
- Pareto Analysis automático (→ Phase 2)
- Design Sprint workflow guiado (→ Phase 2)
- Mobile app (→ Phase 2)
- Integraciones con Google Calendar, Apple Calendar (→ Phase 2)
- Multi-usuario / compartir (→ Phase 2)
- Export de datos (CSV/PDF) (→ Phase 2)
- Wearables integration (Oura Ring, Apple Watch) (→ Phase 2)

### MVP Success Criteria

El MVP es exitoso si el creador:

1. Usa el Calendario de life-os como su única agenda (reemplaza Google Calendar)
2. Completa el Daily Check-in ≥ 5 días por semana
3. Realiza el Weekly Review ≥ 3 semanas consecutivas
4. Tiene al menos 1 hábito con streak activo ≥ 14 días al final del mes 1
5. El motor de correlaciones ha detectado al menos 3 patrones con datos reales
6. El Life System Health Score ha mejorado vs. baseline del diagnóstico inicial

---

## Post-MVP Vision

### Phase 2 Features

- **Scrum completo:** Board kanban con columnas Todo/In Progress/Done, sprint planning guiado, retrospectiva formal
- **Intelligence Layer — Cronobiología:** Configuración de cronotipo + ventanas de energía sugeridas. El sistema propone cuándo hacer deep work vs. admin vs. ejercicio.
- **Análisis IA avanzado:** Múltiples agentes IA especializados — uno para análisis de hábitos, otro para optimización de calendario, otro para OKR coaching
- **Correlaciones avanzadas:** Motor de correlaciones con ML real — predicción de días de alta productividad, detección temprana de burnout
- **PARA como sistema de referencias:** Biblioteca de recursos vinculada a áreas/proyectos
- **Validaciones Maslow automáticas:** Sistema alerta y bloquea soft si nivel 1-2 en crisis
- **Heatmap anual:** Vista Año como GitHub contributions heatmap con drill-down

### Long-Term Vision (1-2 años)

life-os como SaaS para "sistemas-pensadores" — individuos técnicos frustrados con apps de productividad genéricas. El producto en producción del creador se convierte en el dogfooding perfecto para una eventual productización.

### Expansion Opportunities

- **Wearables integration:** Datos de Oura Ring / Apple Watch para energy tracking real vs. cronobiología teórica — correlaciones basadas en biometría
- **Life OS Teams:** Versión para parejas o grupos pequeños con OKRs compartidos
- **Mobile (React Native):** Para captura de Inbox y consulta de calendario on-the-go
- **API pública:** Para integraciones con otras herramientas (Notion, Obsidian, calendarios externos)

---

## Technical Considerations

### Deployment Stack (Confirmado)

- **Frontend + SSR:** Next.js 16 → **Vercel** (deploy automático desde GitHub `main`)
- **Base de datos + Auth + Storage:** **Supabase** (PostgreSQL + Row Level Security + Auth + Realtime)
- **CI/CD:** GitHub Actions → Vercel (pull request previews + production deploy en merge a main)

### Technology Stack Completo

- **Frontend:** Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS 4
- **Base de datos:** Supabase (PostgreSQL) — cloud-first, preparado para sync
- **Autenticación:** Supabase Auth — magic link o email/password (single user MVP)
- **ORM/Query:** Drizzle ORM o Supabase JS Client directo (decisión @architect)
- **Estado global:** Zustand
- **Calendario UI:** `big-calendar` (github.com/lramos33/big-calendar, MIT) — 5 vistas exactas (Año/Mes/Semana/Día/Agenda), shadcn/ui, drag&drop, time indicator. Adaptar: Tailwind v3→v4 + `rrule` separado para recurrencia
- **Layout / Dashboard base:** `TailAdmin` (github.com/TailAdmin/free-nextjs-admin-dashboard, MIT) — Next.js 16 + React 19 + Tailwind v4 nativo, ApexCharts, sidebar, dark mode. Base para Home, Informes y estructura general
- **Charts/Analytics:** Recharts o Nivo para informes
- **Recurrencia:** `rrule` (RFC 5545) para eventos recurrentes
- **Testing:** Vitest + React Testing Library (unit/integration) — configuración base en Story 1.6 (E1)
- **Hosting:** Vercel (free tier suficiente para MVP single-user)

### Arquitectura de IA — Multi-Proveedor (Agnóstica de Vendor)

**Principio:** El sistema no debe tener vendor lock-in con ningún proveedor de IA. La arquitectura debe permitir intercambiar el modelo subyacente sin cambiar la lógica de negocio.

```
Capa de abstracción IA:
  ILLMProvider (interface)
    ├─ ClaudeProvider    (Anthropic Claude API)
    ├─ OpenAIProvider    (GPT-4o, o1, etc.)
    ├─ GeminiProvider    (Google Gemini)
    └─ [Extendible a otros]

Casos de uso IA en el sistema:
  1. Diagnóstico inicial (Perfil Personal) → análisis de archivos o cuestionario
  2. Inbox processing → clasificación + detección de tiempo libre + propuesta de calendarización
  3. Motor de correlaciones → análisis de time_entries + checkin_responses → insights en lenguaje natural
  4. Weekly Review → síntesis semanal + recomendaciones
  5. [Phase 2] Agentes especializados (hábitos, OKR coaching, calendario)
```

La configuración del proveedor activo se define en variables de entorno — el usuario puede cambiar de Claude a OpenAI modificando una variable sin tocar código.

### Motor de Correlaciones — Arquitectura

```
Inputs del motor:
  - time_entries      (qué actividad, cuándo, cuánto tiempo, área, proyecto)
  - checkin_responses (completado/no, razón, energía percibida)
  - habit_completions (streak, hora del día, duración real)
  - area_scores       (score % del diagnóstico por fecha)

Procesamiento:
  - Correlaciones estadísticas entre variables (Pearson/Spearman para MVP)
  - Análisis de IA sobre los patrones detectados → insights en lenguaje natural
  - Umbral mínimo de datos: 14 días de datos para activar correlaciones

Output:
  - Insights en Informes ("Los días que meditaste completaste 35% más items del calendario")
  - Insights en Weekly Review (top 3 correlaciones de la semana)
  - Alertas proactivas en Home ("Llevas 5 días sin ejercicio — históricamente esto baja tu productividad")
```

### Modelo de Datos Core (Draft — requiere refinamiento con @architect)

```sql
-- Diagnóstico y perfil
profiles        (id, user_id, profile_text, diagnosis_method, created_at)
area_scores     (id, area_id, score_pct, scored_at, method)
                -- method: 'questionnaire' | 'ai_analysis' | 'weekly_review'

-- Jerarquía de vida
areas           (id, name, maslow_level, color, icon, current_score_pct)
okrs            (id, area_id, title, horizon, type, status, year, quarter)
key_results     (id, okr_id, title, kr_type, current_pct, target_value,
                 unit, is_auto_calculated)
                -- kr_type: 'time_based' | 'outcome_based'
projects        (id, area_id, okr_id, title, status, start_date, end_date)
milestones      (id, project_id, goal, start_date, end_date, status)
habits          (id, area_id, okr_id, title, frequency, cue, reward)
skills          (id, area_id, okr_id, name, level, target_level, target_date)

-- Calendario
calendars       (id, name, color, calendar_type)
                -- calendar_type: 'manual' | 'automatic'
events          (id, calendar_id, title, start_at, end_at,
                 recurrence_rule,            -- rrule string (RFC 5545)
                 is_automatic,
                 planned_duration_minutes,
                 linked_to_type,             -- 'habit'|'project'|'milestone'|null
                 linked_to_id,
                 skill_id,                   -- vinculación a skill si aplica
                 status)                     -- 'scheduled'|'in_progress'|'completed'|
                                             --  'partial'|'postponed'|'missed'
tasks           (id, calendar_id, title, due_date, recurrence_rule,
                 linked_to_type, linked_to_id, skill_id, status)

-- Time tracking
time_entries    (id, event_id, task_id, area_id, project_id, skill_id,
                 started_at, ended_at,
                 actual_duration_minutes,
                 status)                     -- 'in_progress'|'paused'|'completed'
time_pauses     (id, time_entry_id, paused_at, resumed_at, pause_reason)

-- Daily Check-in
checkin_responses (id, event_id, task_id, checkin_date,
                   status,                   -- 'completed'|'partial'|'missed'|'postponed'
                   actual_duration_minutes,
                   completion_rate,
                   skip_reason,              -- 'time'|'motivation'|'emergency'|'conscious_decision'|'other'
                   skip_notes,
                   postponed_to,             -- nueva fecha si status='postponed'
                   perceived_energy)         -- 1-5: input para correlaciones

-- Inbox
inbox_items     (id, raw_text, status, processed_at, classified_type,
                 ai_suggestion, ai_proposed_slot, confirmed_at, notes)

-- Correlaciones
correlation_insights (id, detected_at, variable_a, variable_b,
                      correlation_coefficient, insight_text, period_days,
                      confidence_level)
```

### Architecture Considerations

- **Arquitectura:** Feature-based dentro de Next.js App Router (`/app/(features)/calendar`, `/app/(features)/okrs`, etc.)
- **API:** Next.js Server Actions + Supabase RLS (sin API layer separado para MVP)
- **IA abstraction layer:** Interface `ILLMProvider` con implementaciones intercambiables — configurada via env vars
- **Motor de correlaciones:** Corre como background job (Supabase Edge Function o cron) cada noche — no en tiempo real
- **Recurrencia de eventos:** `rrule` para generación de ocurrencias — calcular on-the-fly en el render (no pre-generar en DB) para eventos futuros; persistir solo ocurrencias pasadas/presentes con `checkin_responses`
- **Realtime:** Supabase Realtime para actualizaciones de timer (time tracking activo) — crítico para UX del timer start/stop

---

## Constraints & Assumptions

### Constraints

- **Budget:** $0 MVP — Vercel free tier + Supabase free tier (500MB DB) + costos de API IA por uso (mínimos para single user)
- **Timeline:** Sin fecha límite fija — MVP funcional en 8-12 semanas a tiempo parcial con AIOS
- **Resources:** Un solo desarrollador + AIOS para velocity
- **Complejidad del Calendario:** El componente técnicamente más complejo — usar librería (fullcalendar-react) es mandatorio para no construir desde cero

### Key Assumptions

- **El Calendario es el núcleo de ejecución** — si el calendario no funciona bien, el sistema falla
- Supabase free tier es suficiente para single user durante toda la vida del MVP
- El usuario accede principalmente desde desktop — mobile es post-MVP
- La implementación de recurrencia de eventos es no-negociable para el MVP
- Costos de API IA son mínimos para single user — sin riesgo de runaway costs en MVP
- Un usuario "avanzado" puede tolerar UI funcional sobre UI pulida — priorizar funcionalidad en MVP
- El motor de correlaciones necesita mínimo 14 días de datos para generar insights útiles

---

## Risks & Open Questions

### Key Risks

- **Complejidad del Calendario:** Implementar 5 vistas + eventos recurrentes + tareas + time tracking es un proyecto de frontend significativo. **Mitigación:** Usar `fullcalendar-react` como base. Es la decisión más crítica antes de escribir código de dominio.
- **Motor de correlaciones — datos suficientes:** El motor necesita al menos 14 días de datos para ser útil. Si el usuario no usa el sistema consistentemente en las primeras 2 semanas, el motor no puede activarse. **Mitigación:** Diseñar la UI para maximizar el Daily Check-in desde el día 1.
- **Integración multi-IA:** Diseñar la capa de abstracción de IA desde el inicio requiere más arquitectura que una integración directa. **Mitigación:** Empezar con Claude API como implementación concreta + interface bien definida. Añadir otros proveedores en Phase 2.
- **Over-engineering del modelo de datos:** Con diagnóstico + correlaciones + multi-IA el schema puede volverse complejo prematuramente. **Mitigación:** Diseñar con @architect antes de escribir código de dominio.
- **UX del Inbox → Calendarización IA:** El flujo de propuesta IA debe ser de 1-click o el usuario lo ignora. **Mitigación:** Prototipo UX del flujo de Inbox antes de construirlo.
- **Feature creep:** El alcance sigue siendo ambicioso para 1 persona. **Mitigación:** El Calendario + Daily Check-in + Inbox son el corazón. Si hay que recortar, recortar Habilidades e Informes avanzados, nunca el Calendario.

### Open Questions

- ~~**¿Qué librería de calendario?**~~ ✅ **CERRADA:** `big-calendar` (lramos33) + `rrule` separado. `TailAdmin` como base de layout/dashboard.
- **¿Cómo se calculan correlaciones con pocos datos?** ¿Pearson simple o se necesita algo más robusto? ¿Qué umbral mínimo de confianza se muestra al usuario?
- **¿Cuántas ocurrencias futuras se pre-generan para hábitos?** Opciones: ninguna (on-the-fly), 30 días, 90 días. Impacta performance y complejidad del schema.
- **¿Qué modelo IA por defecto para MVP?** Claude Haiku (rápido/barato) vs. Claude Sonnet (mejor análisis) para diagnóstico y correlaciones.
- **¿Cómo se estructura el cuestionario científico?** ¿Cuántas preguntas por área para ser riguroso pero no tedioso? (estimación: 5-8 preguntas por área = 40-64 preguntas totales — ¿aceptable para onboarding?)
- **¿Tareas vs. Eventos en el calendario?** ¿Las tareas aparecen en el día de vencimiento como bloques de tiempo o en una barra lateral de "pendientes del día"?
- **¿Los KRs outcome-based tienen sub-actividades?** ¿O el "logro" se confirma con un check manual único?

### Areas Needing Further Research

- Evaluación de librerías de calendario: FullCalendar vs. react-big-calendar (UX, bundle size, recurrencia nativa, integración con rrule)
- Cuestionarios científicos validados para cada área Maslow — selección y adaptación de ítems
- Métodos de correlación estadística aplicables con datasets pequeños (< 90 días)
- UX patterns de procesamiento de Inbox con IA — cómo lo hacen Reclaim.ai, Motion, Sunsama
- Capacidades de análisis de Supabase para queries de correlaciones (Window functions, CTEs)

---

## Appendices

### A. Arquitectura de Módulos — Vista Completa

```
life-os/
├── Módulo 0: PERFIL + DIAGNÓSTICO → /profile (onboarding + scores)
├── Módulo 1: ÁREAS               → /areas
├── Módulo 2: OKRs                → /okrs
├── Módulo 3: PROYECTOS           → /projects
│            HÁBITOS              → /habits
│            MILESTONES           → /milestones
├── Módulo 4: HABILIDADES         → /skills
├── Módulo 5: CALENDARIO          → /calendar (Año/Mes/Semana/Día/Agenda)
├── Módulo 6: INBOX               → /inbox
└── Módulo 7: INFORMES            → /reports (+ correlaciones)
```

### B. Frameworks Integrados

| #   | Framework                            | Módulo                               | Propósito                                                                                                  |
| --- | ------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | Maslow 8 Niveles (D-Needs + B-Needs) | Áreas + Perfil                       | Estructura base, scoring ponderado (2.0×/1.5×/1.2×/1.0×), validaciones jerárquicas, diagnóstico científico |
| 2   | OKRs                                 | OKRs                                 | Planificación 5Y → Anual → Trimestral, progreso automático                                                 |
| 3   | GTD                                  | Inbox + Weekly Review                | Captura, filtro IA, organización, revisión semanal                                                         |
| 4   | Design Sprint                        | Proyectos                            | Proyectos de alta incertidumbre (Phase 2)                                                                  |
| 5   | Scrum Sprint                         | Milestones (MVP) → Sprints (Phase 2) | Ejecución iterativa con sprint goal                                                                        |
| 6   | Atomic Habits                        | Hábitos                              | 4 leyes + streak + never-miss-twice                                                                        |
| 7   | Eisenhower                           | Tareas/Eventos                       | Q1/Q2/Q3/Q4 tagging para análisis de tiempo                                                                |
| 8   | Pareto 80/20                         | Correlaciones + Informes             | Identificar el 20% de actividades de mayor impacto                                                         |
| 9   | Buffett 5/25                         | OKRs                                 | Máximo 3 OKRs activos, foco radical                                                                        |
| 10  | Cronobiología                        | Calendario (Phase 2)                 | Ventanas de energía óptimas para scheduling                                                                |
| 11  | PARA Method                          | Inbox + Áreas                        | Projects/Areas/Resources/Archive como estructura                                                           |

### C. Stack Técnico Confirmado

```
Frontend:      Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS 4
Base de datos: Supabase (PostgreSQL + Auth + RLS + Realtime)
Deploy:        Vercel (CI/CD automático desde GitHub main)
IA:            Multi-proveedor (Claude/OpenAI/Gemini) via ILLMProvider interface
OS Desarrollo: Windows 11 Pro
Repositorio:   https://github.com/mariomina/life-os
Node.js:       v24.13.1 / npm 11.10.0
```

### D. References

- [OKRs: "Measure What Matters" — John Doerr]
- [GTD: "Getting Things Done" — David Allen]
- ["Atomic Habits" — James Clear]
- ["Building a Second Brain" — Tiago Forte (PARA Method)]
- [Maslow's Hierarchy — Extended 8-Level]
- [Warren Buffett 5/25 Rule]
- ["Sprint" — Jake Knapp]
- ["The Scrum Guide" — Schwaber & Sutherland]
- [Eisenhower Matrix]
- ["Why We Sleep" — Matthew Walker + Huberman Lab Podcast]
- [Pittsburgh Sleep Quality Index (PSQI)]
- [UCLA Loneliness Scale]
- [Rosenberg Self-Esteem Scale (RSES)]
- [Meaning in Life Questionnaire (MLQ) — Steger et al.]
- [Flourishing Scale — Diener et al.]
- [Financial Wellbeing Scale (FWBs)]

---

## Next Steps

### Immediate Actions

1. **Decisión de librería de calendario** — Evaluar FullCalendar vs. react-big-calendar antes de diseñar el módulo (bloquea arquitectura de componentes)
2. **Diseño del modelo de datos con @architect** — Schema completo + capa de abstracción IA + motor de correlaciones antes de escribir código de dominio
3. **Selección de cuestionario científico por área** — Investigar y adaptar ítems validados para las 8 áreas Maslow (5-8 preguntas por área)
4. **Configurar Supabase + Vercel** — Setup de infraestructura con `@devops *setup-github`
5. **Crear PRD con @pm** — Este brief es la base. El PRD definirá requisitos funcionales y criterios de aceptación precisos
6. **Primera story: Scaffold + Auth + Diagnóstico** — Setup de Supabase Auth + layout base + flujo de onboarding (la primera experiencia define todo)

### PM Handoff

Este Project Brief v1.5 provee el contexto completo para life-os: 8 módulos, stack confirmado (Next.js + Supabase + Vercel), arquitectura IA multi-proveedor agnóstica de vendor, motor de correlaciones como diferenciador core, y filosofía "planear top-down, ejecutar bottom-up, optimizar con datos". El brief incorpora decisiones clave: diagnóstico científico por área (scores en %), KR progress 100% automático, Inbox con IA de 1-click, Weekly Review tipo Sprint Retro, Time Budget diario, y todas las vistas del calendario en MVP. Por favor inicia en "PRD Generation Mode" y trabaja sección por sección con foco especial en: (1) flujo de diagnóstico inicial y cuestionario científico, (2) módulo de Calendario con todas las vistas, (3) arquitectura de la capa IA, y (4) motor de correlaciones.

---

_— Atlas, investigando a verdade 🔎_
_Draft v1.5 · 2026-02-18 · AIOS Analyst Agent — Multi-IA + Correlaciones + Diagnóstico científico + KR automático_
