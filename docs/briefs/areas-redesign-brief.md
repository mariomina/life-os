# Brief: Rediseño del Sistema de Áreas — Scoring Preciso Multi-Nivel

**Tipo:** Feature Mayor / Rediseño de Sistema
**Autor:** @analyst (Atlas)
**Fecha:** 2026-03-09
**Fuente primaria:** `docs/areas.md` + investigación científica + sistema actual

---

## 1. Contexto y Problema

El sistema de Áreas actual tiene 8 áreas (una por nivel Maslow) con un único `currentScore` (0–100) que solo se actualiza desde el cuestionario de onboarding. Esto genera tres problemas críticos:

1. **Score estático**: No refleja el comportamiento real del usuario (tiempo invertido, hábitos, OKRs)
2. **Score opaco**: Un área en 45% no dice si el problema es sueño, nutrición o ejercicio — no permite intervención específica
3. **Sin correlaciones**: No es posible detectar que "sueño bajo → rendimiento cognitivo bajo" si ambos están en el mismo bucket plano

El documento `docs/areas.md` define la arquitectura correcta: cada nivel Maslow se descompone en sub-áreas con sus propios factores medibles. Esta descomposición permite scoring preciso, correlaciones y recomendaciones específicas.

---

## 2. Objetivo

Reemplazar el scoring plano de 8 áreas por un sistema de **3 niveles jerárquicos** donde cada score es una función continua de señales conductuales y subjetivas reales.

**Score Global (Life System Health Score):**
```
GLSHS = Σ(score_nivel[i] × peso_maslow[i]) / 11.4
```

**Score de Nivel:**
```
score_nivel[i] = Σ(score_subarea[j] × peso_interno[j])
```

**Score de Sub-área:**
```
score_subarea[j] = f(señales_conductuales, cuestionario_subjetivo, progreso_objetivos)
```

---

## 3. Arquitectura del Sistema

### 3.1 Jerarquía de 3 Niveles

```
Nivel Maslow (8) — pesos: 2.0 / 1.5 / 1.2 / 1.0
  └── Sub-áreas (~30 total) — pesos internos por nivel
        └── Componentes medibles (3–5 por sub-área) — inputs del score
```

### 3.2 Pesos de Nivel Maslow (sin cambio — validados científicamente)

| Nivel | Nombre | Peso | Grupo |
|-------|--------|------|-------|
| 1 | Fisiológicas | ×2.0 | D-Needs |
| 2 | Seguridad | ×2.0 | D-Needs |
| 3 | Pertenencia | ×1.5 | D-Needs |
| 4 | Estima | ×1.5 | D-Needs |
| 5 | Cognitivas | ×1.2 | B-Needs |
| 6 | Estéticas | ×1.2 | B-Needs |
| 7 | Autorrealización | ×1.0 | B-Needs |
| 8 | Autotrascendencia | ×1.0 | B-Needs |

**Base científica pesos Maslow**: Efecto cascada confirmado — privación de sueño deteriora función cognitiva y social; estrés financiero reduce ancho de banda cognitivo (Princeton/Harvard). Los pesos D-Needs > B-Needs reflejan la prepotencia funcional documentada aunque no jerárquica absoluta.

---

## 4. Sub-áreas y Pesos Internos por Nivel

### Nivel 1 — Fisiológicas (×2.0)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Sueño y Descanso | **25%** | `(horas_promedio/8)×0.4 + (calidad_1_10/10)×0.4 + (consistencia%/100)×0.2` | Meta-análisis BMC Psychology 2025: sueño = predictor #1 de 5 dimensiones de bienestar |
| Ejercicio y Movimiento | **20%** | `(min_cardio/150)×0.4 + (sesiones_fuerza/2)×0.3 + (pasos/8000)×0.3` | Meta-análisis BMC Psychology 2025: correlación causal con satisfacción de vida |
| Nutrición e Hidratación | **20%** | `(comidas_balanceadas/3)×0.6 + (litros_agua/2.5)×0.4` | Evidencia sólida de impacto a mediano plazo |
| Respiración y Salud Respiratoria | **15%** | `(respiracion_nasal_habito? 1:0)×0.35 + (dias_breathwork/7)×0.35 + cuestionario×0.30` | PMC 2025: breathwork reduce cortisol, mejora HRV sostenido; respiración nasal vs bucal: -4,000% ronquido, apnea nil (Nestor/Nayak) |
| Salud Musculoesquelética y Dolor | **12%** | `(dias_sin_dolor/7)×0.5 + (sesiones_movilidad/3)×0.3 + cuestionario×0.2` | CDC 2024: 20.5% adultos con dolor crónico; afecta sueño, humor, productividad, relaciones |
| Homeostasis Corporal | **5%** | `cuestionario_subjetivo (energía, temperatura, digestión 1-10)` | Parcialmente capturado por sub-áreas anteriores |
| Salud Sexual y Reproductiva | **3%** | `cuestionario_subjetivo (satisfacción, 1-10)` — **opcional** | Relevante pero personal; peso reducido por carácter opcional |

**Componentes de Sueño (Level 3-4 de areas.md):**
- Cantidad: 7–9h óptimas, meta <30 min variación
- Calidad: target 15–25% sueño profundo, 20–25% REM
- Higiene: temperatura 15–19°C, oscuridad, rutina 60–90 min
- Timing: cronotipo, sol matutino primeros 30 min

---

### Nivel 2 — Seguridad (×2.0)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Seguridad Financiera | **40%** | `(meses_emergencia/6)×0.3 + (tasa_ahorro%)×0.25 + (deuda_ratio<36%)×0.25 + cuestionario×0.2` | CFPB Financial Well-Being Scale; Vanguard 2024: fondo emergencia = +21% bienestar |
| Estabilidad Laboral y Profesional | **25%** | `(satisfaccion_laboral/10)×0.4 + (seguridad_empleo/10)×0.4 + (empleabilidad/10)×0.2` | Ingreso es fuente de la seguridad financiera |
| Seguridad Jurídica y Legal | **15%** | `(testamento? 1:0)×0.3 + (seguros_vigentes? 1:0)×0.3 + (documentos_orden? 1:0)×0.2 + cuestionario×0.2` | Estate planning reduce estrés familiar y conflictos; power of attorney, directivas médicas = paz mental ante emergencias |
| Seguridad Física y Salud Preventiva | **12%** | `(chequeos_al_dia? 1:0)×0.5 + (seguros_salud_activos? 1:0)×0.3 + cuestionario×0.2` | Relevante pero menos variable en contextos estables |
| Estabilidad Habitacional | **8%** | `cuestionario_subjetivo (tranquilidad vivienda, 1-10)` | Alta correlación con financiera |

**Umbrales financieros validados (CFPB + Vanguard 2024):**
- Fondo emergencia ≥2 meses → +21% bienestar
- Fondo emergencia 3–6 meses → +13% adicional
- Deuda no-hipotecaria <15% ingreso → etapa "flourishing"
- Ratio vivienda ≤30% ingreso neto → saludable

---

### Nivel 3 — Pertenencia y Amor (×1.5)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Relación de Pareja / Intimidad | **30%** | `cuestionario_calidad×0.6 + (tiempo_calidad_h/semana/10)×0.4` | Harvard Study 85 años: calidad relación íntima a los 50 predice salud mejor que colesterol |
| Familia Nuclear | **25%** | `cuestionario_calidad×0.5 + (tiempo_individual_h/objetivo)×0.5` | Fuente primaria de seguridad emocional |
| Amistades | **25%** | `cuestionario_calidad_inner_circle×0.6 + (encuentros_significativos/mes/4)×0.4` | Harvard Study: calidad > cantidad en predicción de bienestar |
| Familia Extendida | **8%** | `(contactos_mensuales/2)×0.5 + cuestionario×0.5` | |
| Comunidad y Pertenencia | **8%** | `(participacion_activa? 1:0)×0.5 + cuestionario×0.5` | |
| Mascotas y Vínculo Animal | **4%** | `cuestionario_subjetivo (1-10)` — **opcional** | PMC meta-análisis: mascotas reducen depresión, soledad e incrementan actividad física; oxitocina, dopamina; evidencia mixta pero significativa |

**Hallazgo clave (PMC 2014)**: satisfacción con calidad de contacto social predice bienestar más que frecuencia → cuestionario de calidad tiene mayor peso que métricas de frecuencia.

---

### Nivel 4 — Estima (×1.5)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Logro Profesional | **22%** | `(okrs_completados/total)×0.5 + cuestionario_impacto×0.5` | SDT (Deci & Ryan): competencia = necesidad psicológica universal |
| Autoeficacia y Confianza | **18%** | `cuestionario_bandura (1-10) / 10` | Bandura: autoeficacia predice acción y bienestar de forma robusta |
| Desarrollo de Habilidades | **18%** | `(skills_nuevas_año/2)×0.4 + (horas_aprendizaje/semana/5)×0.6` | PGI scale: crecimiento intencional correlaciona con bienestar |
| Salud Emocional y Regulación | **15%** | `(dias_practica_regulacion/7)×0.4 + cuestionario_eq×0.6` | PMC 2024 (World Psychiatry): regulación emocional = predictor clave de salud mental y física; maladaptive strategies → psicopatología |
| Independencia y Autonomía | **12%** | `cuestionario_sdt_autonomia (1-10) / 10` | SDT: autonomía = necesidad básica universal al mismo nivel que competencia |
| Imagen Corporal y Autocuidado | **8%** | `cuestionario_imagen_corporal (1-10)×0.6 + (rutina_autocuidado_dias/7)×0.4` | PMC 2024: relación recíproca fuerte entre imagen corporal y autoestima; body image = predictor de bienestar y comportamientos de salud |
| Reputación e Imagen Externa | **7%** | `cuestionario_subjetivo (1-10)` | Importante pero externo e incontrolable; menor peso que factores internos |

---

### Nivel 5 — Cognitivas (×1.2)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Aprendizaje Continuo | **28%** | `(libros_leidos/año/24)×0.5 + (cursos_completados/año/2)×0.5` | PGI meta-análisis: crecimiento activo → reducción síntomas depresivos |
| Atención y Concentración | **25%** | `(sesiones_deep_work/semana/5)×0.5 + (horas_sin_distraccion/dia/4)×0.3 + cuestionario×0.2` | PNAS Nexus 2025: bloquear internet móvil mejoró atención + salud mental en 91% de participantes; presencia de smartphone sola reduce rendimiento cognitivo basal |
| Pensamiento Crítico | **22%** | `cuestionario_subjetivo (1-10)` | Metacognición = factor de resiliencia validado |
| Curiosidad Intelectual | **15%** | `(temas_nuevos_explorados/trimestre/1)×0.5 + cuestionario×0.5` | Kashdan et al.: curiosidad predice bienestar |
| Creatividad e Innovación | **10%** | `(proyectos_creativos/año/3)×0.5 + cuestionario×0.5` | PMC 2022: frecuencia de arte activo correlaciona con bienestar |

---

### Nivel 6 — Estéticas (×1.2)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Entorno Físico Estético | **28%** | `cuestionario_satisfaccion_entorno (1-10) / 10` | Entorno directo afecta estado emocional diario |
| Gastronomía y Experiencia Culinaria | **25%** | `(comidas_conscientes/semana/7)×0.5 + cuestionario_placer_comer×0.5` | PLOS One: placer de comer tiene 7 dimensiones estéticas con asociaciones favorables a salud; única experiencia estética que ocurre 3 veces/día — alta frecuencia de impacto |
| Arte y Apreciación Cultural | **22%** | `(eventos_culturales/año/12)×0.5 + cuestionario×0.5` | PMC 2022: arte activo y bienestar psicológico |
| Naturaleza y Belleza Natural | **15%** | `(horas_naturaleza/semana/5)×0.5 + cuestionario×0.5` | Reducción de cortisol por exposición a naturaleza (validado) |
| Diseño y Estética Funcional | **10%** | `cuestionario_subjetivo (1-10)` | Más difícil de cuantificar, componente subjetivo |

---

### Nivel 7 — Autorrealización (×1.0)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Propósito y Misión Personal | **25%** | `cuestionario_ikigai (1-10) / 10` | Ohsaki study (43,000 personas): ikigai predice mortalidad cardiovascular |
| Crecimiento Personal Continuo | **22%** | `(metas_desarrollo_completadas/5)×0.5 + cuestionario×0.5` | PGI scale validada |
| Experiencias Cumbre y Flow | **20%** | `(sesiones_flow_percibidas/semana/5)×0.5 + cuestionario_peak×0.5` | Maslow: peak experiences = núcleo de la autorrealización; Csikszentmihalyi: flow aumenta significado y satisfacción de vida; "overlap between self-actualization and peak experience" confirmado en décadas de investigación |
| Expresión Auténtica | **18%** | `cuestionario_sdt_autonomia_profunda (1-10) / 10` | SDT: autonomía = necesidad básica universal |
| Contribución Significativa | **10%** | `cuestionario_impacto_percibido (1-10) / 10` | Amplificador del propósito |
| Gestión de Energía Personal | **5%** | `(bloques_90min_respetados/dia/4)×0.5 + cuestionario_energia×0.5` | Ultradian rhythms: violinistas clase mundial practican en bloques 90 min; napping = mayor impacto en rendimiento de 16 actividades medidas (Schwartz/Loehr, Harvard Business Review) |

---

### Nivel 8 — Autotrascendencia (×1.0)

| Sub-área | Peso interno | Fórmula de score | Base científica |
|----------|-------------|------------------|-----------------|
| Servicio y Altruismo | **28%** | `(horas_voluntariado/mes/8)×0.5 + cuestionario×0.5` | Eudaimonia: servicio activo correlaciona con longevidad y bienestar en adultos mayores |
| Legado y Contribución Duradera | **25%** | `cuestionario_legado (1-10) / 10` | Eudaimonia: sentido más allá de uno mismo; Erikson: generatividad vs estancamiento |
| Gratitud como Práctica | **20%** | `(dias_practica_gratitud/7)×0.5 + cuestionario×0.5` | JAMA Psychiatry 2024 (49,275 mujeres): gratitud alta = 9% menor mortalidad; meta-análisis 64 RCTs: reduce ansiedad, depresión, mejora sueño y presión arterial |
| Espiritualidad y Conexión Trascendente | **15%** | `(dias_practica/semana/7)×0.5 + cuestionario×0.5` | Ikigai; evidencia transcultural; práctica contemplativa reduce cortisol |
| Unidad e Interconexión | **12%** | `cuestionario_subjetivo (1-10)` | El más subjetivo; consciencia ecológica y compasión universal como práctica |

---

## 5. Fuentes de Señal por Tipo

### Principio fundamental: Hechos, no aspiraciones

**El score se calcula exclusivamente sobre actividades completadas, no sobre intenciones.**

- Tener un hábito creado **no cuenta** — solo cuentan los días en que fue marcado como completado
- Tener un proyecto o OKR creado **no cuenta** — solo cuenta el progreso real registrado (key results actualizados con evidencia)
- Tener una actividad en el calendario **no cuenta** — solo cuenta si fue realizada (marcada como completada o con time entry registrado)
- Un checkin subjetivo **no cuenta** si no fue respondido en el ciclo correspondiente

La existencia de una intención es irrelevante para el score. Solo los **hechos registrados** mueven el número.

| Tipo | Fuente en la app | Qué cuenta | Cuándo actualizar |
|------|-----------------|-----------|------------------|
| **Conductual** | `time_entries` completados | Tiempo real logueado (no planificado) | Al stop del timer |
| **Hábitos** | `habit_logs` con status = `completed` | Días realmente completados (no el hábito en sí) | Al marcar completado |
| **Objetivos** | `key_results` con progreso registrado | Avance real documentado (no el OKR en sí) | Al actualizar KR con evidencia |
| **Actividades** | `calendar_events` completados | Evento realizado (no agendado) | Al marcar como realizado |
| **Subjetivo** | Checkin respondido en el ciclo | Respuesta real en ventana de tiempo | Al completar checkin |

**Proporción conductual vs subjetivo por grupo:**
- D-Needs (L1–4): conductual tiene más peso (no puedes "sentir" que duermes bien si no lo haces)
- B-Needs (L5–8): subjetivo tiene más peso (creatividad y trascendencia son experiencia vivida)

---

## 6. Reglas del Sistema

### REGLA 1 — Cascada (Bloqueador)
```
IF score_nivel[1] < 40 OR score_nivel[2] < 40 durante > 14 días:
  ALERT crítico en dashboard
  Sugerir priorizar nivel afectado antes de OKRs nivel 7-8
```

### REGLA 2 — Balance (Desequilibrio)
```
IF > 80% de actividades semanales en ≤ 2 sub-áreas:
  ALERT: "Desequilibrio sistémico detectado"
  SUGERIR: 1 actividad del área menos atendida
```

### REGLA 3 — Ciclo de revisión
```
Nivel 1 → checkin DIARIO (sueño, nutrición, ejercicio)
Nivel 2 → checkin SEMANAL (finanzas, seguridad)
Nivel 3 → checkin SEMANAL (relaciones)
Nivel 4 → checkin MENSUAL (logro, habilidades)
Nivel 5–6 → checkin MENSUAL
Nivel 7–8 → checkin TRIMESTRAL
```

### REGLA 4 — Decay por inactividad
```
IF sin actividad en sub-área > N días:
  score_subarea *= decay_factor (exponencial)
  N varía por nivel: L1=3d, L2=7d, L3=14d, L4-8=30d
```
*Justificación: el bienestar requiere mantenimiento continuo; un área que abandones no puede mantener score alto.*

### REGLA 5 — Alertas de crisis
```
Sueño < 6h por 3 días → CRITICAL (pausa proyectos P2-P3)
Fondo emergencia < 2 meses → CRITICAL
0 contacto social íntimo > 14 días → WARNING
```

### REGLA 6 — Progresión natural
```
IF nivel 1-2 > 80% por 90 días consecutivos:
  SUGERIR: OKR en nivel 5-7
IF usuario > 60 años AND nivel 8 < 40%:
  SUGERIR: Reflexión sobre legado
```

---

## 7. Implicaciones Técnicas

### Schema de BD — Cambios necesarios

**Tabla nueva: `area_subareas`**
```sql
CREATE TABLE area_subareas (
  id UUID PRIMARY KEY,
  area_id UUID REFERENCES areas(id),
  maslow_level INTEGER NOT NULL,  -- 1-8
  name TEXT NOT NULL,
  slug TEXT NOT NULL,             -- 'sueno', 'ejercicio', etc.
  internal_weight NUMERIC(3,2),   -- 0.10 a 0.45
  current_score INTEGER DEFAULT 0, -- 0-100 (calculado)
  is_optional BOOLEAN DEFAULT false, -- 'salud_sexual', etc.
  is_active BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

**Tabla nueva: `area_subarea_scores`**
```sql
CREATE TABLE area_subarea_scores (
  id UUID PRIMARY KEY,
  subarea_id UUID REFERENCES area_subareas(id),
  user_id UUID NOT NULL,
  score INTEGER,                  -- 0-100
  behavioral_score INTEGER,       -- componente conductual
  subjective_score INTEGER,       -- componente cuestionario
  progress_score INTEGER,         -- componente OKRs
  scored_at DATE NOT NULL,
  UNIQUE(subarea_id, scored_at)
)
```

**Tabla modificada: `areas`**
- `currentScore` → pasa a ser calculado como `Σ(subarea.current_score × subarea.internal_weight)`
- Agregar `score_updated_at TIMESTAMP`

**Tabla nueva: `subarea_time_entries`** (vinculación time_entries → sub-área)
- O bien: agregar `subarea_id` opcional a `time_entries` existente

### Motor de cálculo
Función server-side `recalculateAreaScore(areaId)`:
1. Leer señales conductuales de la ventana de tiempo relevante
2. Leer último checkin subjetivo
3. Leer progreso en OKRs ligados
4. Calcular `score_subarea[j]` para cada sub-área
5. Agregar → `score_nivel[i]`
6. Agregar → `GLSHS`
7. Insertar snapshot en `area_subarea_scores` + actualizar `areas.currentScore`

**Triggers para recalcular:**
- Stop de timer (time entry completed)
- Hábito completado/fallado
- Key result actualizado
- Checkin de cuestionario completado
- Cron diario (decay + recalculo de inactivos)

---

## 8. Validación Científica de Pesos

Los pesos internos definidos en `areas.md` tienen alineación con la investigación revisada:

| Área | Peso mayor asignado | Validación |
|------|--------------------|-----------|
| L1: Sueño al 30% | ✅ | Meta-análisis BMC 2025: sueño = predictor #1 de bienestar |
| L2: Fondo emergencia al 30% | ✅ | Vanguard 2024: predictor #1 de bienestar financiero |
| L3: Pareja al 30% | ✅ | Harvard 85 años: calidad relación íntima = predictor #1 |
| L4: Logro y autoeficacia al 55% | ✅ | SDT (Deci & Ryan): competencia = necesidad universal |
| L7: Propósito al 30% | ✅ | Ikigai (Ohsaki, 43,000 personas): predice mortalidad |
| L8: Servicio al 30% | ✅ | Eudaimonia: sentido más allá del yo como predictor de longevidad |

**Único ajuste sugerido vs areas.md:**
- L4: Autonomía actualmente en 10% — SDT la considera igual de fundamental que Competencia. Considerar subir a 15–20% en versión futura después de validar con datos reales.

---

## 9. Integración con Capas del Sistema

```
ÁREAS (permanentes, score dinámico)
  ↑ alimentan
ÁREA → SUB-ÁREAS → COMPONENTES
  ↑ alimentados por
TIME ENTRIES → vinculados a sub-área (no solo área)
HÁBITOS → vinculados a sub-área
OKRs → vinculados a área (propagan a sub-área correspondiente)
CHECKIN → cuestionario por sub-área según ciclo de revisión

OUTPUTS:
→ Dashboard Maslow (radar chart 8 niveles)
→ Detalle por nivel (barras de sub-áreas)
→ Alertas automáticas (cascada, desequilibrio, crisis)
→ Sugerencias de priorización
→ Motor de correlaciones (sueño ↔ cognitivo, finanzas ↔ relaciones)
```

---

## 9B. Diseño de la Vista de Áreas (UX)

### Modelo Mental Fundamental

**Areas es un espejo analítico — no captura datos, los lee.**

Los datos provienen de Calendar, Habits y Projects. Areas solo muestra: *¿qué tan cubierto estás y qué lo está cubriendo?*
No hay formularios, no hay "Registrar" — el score emerge de las actividades que ya existen en el sistema.

---

### Flujo de datos (dirección única)

```
Calendar (actividades sueltas) ─┐
Habits (hábitos activos)        ├──► Areas (análisis + score)
Projects (progreso de OKRs)    ─┘
```

---

### Vista Principal `/areas`

**Zona 1 — Panel Central: GLSHS Chart (hero, ~220px alto)**

Chart de línea única (score global GLSHS), ancho completo. Filtros de tiempo: **7D · 30D · Q1 · Q2 · Q3 · Q4 · Año**.

- Línea suavizada del GLSHS con gradiente de relleno debajo
- Score GLSHS actual en esquina superior izquierda con delta vs período anterior animado
- Selector de período cambia el rango del eje X y recalcula el delta
- Tooltip flotante: fecha, score GLSHS, variación vs misma fecha del período anterior
- Si GLSHS < 50 → línea roja pulsante + banner de alerta sobre el chart

**Zona 2 — Grid de Tarjetas (2 cols móvil · 4 cols desktop)**

Ordenadas L1 → L8. Cada card:
- Color dot del área + número de nivel + nombre
- Score circular grande con fill animado al cargar (0 → score, 700ms)
- Tendencia con flecha (↗ ↘ →)
- Top 3 sub-áreas: nombre + barra de progreso + score % + tipo de fuente (Hábito / Proyecto / Actividad)
- Alerta ⚠ si alguna sub-área tiene decay activo
- Texto "X sub-áreas · Y activas"
- Click → navega al detalle del área

**Estados visuales de card:**
- score ≥ 80 → borde verde sutil
- score 60–79 → borde amarillo
- score 40–59 → borde naranja
- score < 40 → borde rojo pulsante + badge "⚠ Atención"
- Sin datos recientes → overlay semitransparente + "Sin actividad reciente"

---

### Vista Detalle `/areas/[slug]`

**Estructura: Panel de gráfico arriba + tarjetas de sub-áreas abajo**

---

**Panel Superior — Chart del Área**

- Header: nombre del área, nivel Maslow, peso (×N.N), score actual + delta vs período anterior
- Chart de línea del score del área con los mismos filtros: **7D · 30D · Q1 · Q2 · Q3 · Q4 · Año**
- Misma mecánica de tooltip y delta que el chart global
- Score del área destacado junto al selector de período

---

**Panel Inferior — Tarjetas de Sub-áreas**

Grid de tarjetas (1 col móvil · 2 cols desktop), una por sub-área del nivel:

```
NOMBRE SUB-ÁREA                    XX%  ·  peso X%
████████░░░░  [barra de progreso]

Cubierto por:
  🔁  "Nombre hábito"      Hábito      · streak N días   →
  📋  "Nombre proyecto"    Proyecto    · N% completado   →
  📅  "Nombre actividad"   Actividad   · última: hace Xd →

[mensaje si no hay fuentes: "Ninguna actividad cubre esta sub-área"]
```

- Cada ítem con `→` enlaza directamente a ese hábito/proyecto/actividad en su vista nativa
- Sub-áreas con decay muestran chip `⚠ Sin actividad X días`
- Sub-áreas opcionales (Salud Sexual, Mascotas) muestran chip `Opcional`
- **Areas es solo lectura** — no hay formularios ni entrada de datos aquí; los datos provienen de Calendar, Habits y Projects

**Leyenda de íconos de fuente:**
- 🔁 Hábito activo
- 📋 Proyecto en curso
- 📅 Actividad suelta (Calendar)

---

### Interacciones Clave

1. **Tap en línea del chart** → scroll automático a la card de esa área + expand
2. **Long-press en card** (móvil) → mini-menú contextual: `Ver historial · Silenciar alerta`
3. **Tap en ítem de actividad** dentro del detalle → navega a esa entidad (no abre modal)
4. **Pull-to-refresh** → recalcula scores en tiempo real
5. **Badge flotante de crisis** → si hay área(s) en rojo, banner persistente sobre el grid

---

## 10. Plan de Implementación por Fases

### Fase 1 — Fundación de datos (BLOQUEANTE)
- Migración de schema: `area_subareas` + `area_subarea_scores`
- Seed de sub-áreas para todos los usuarios existentes (con scores = 0 o heredados)
- Vinculación de `time_entries` a sub-área (campo opcional)
- Vinculación de `habits` a sub-área

### Fase 2 — Motor de cálculo
- Función `recalculateSubareaScore(subareaId, userId, date)`
- Función `recalculateAreaScore(areaId)`
- Función `recalculateGlobalScore(userId)`
- Triggers en: timer stop, habit log, key result update
- Cron diario para decay + recálculo

### Fase 3 — Checkin periódico
- UI de checkin semanal (preguntas guía de `areas.md`)
- Preguntas dinámicas según nivel de revisión (diario L1, semanal L2-3, etc.)
- Almacenamiento en `area_subarea_scores.subjective_score`

### Fase 4 — UI y visualización
- Dashboard rediseñado: radar chart + barra de sub-áreas por nivel
- Detalle de área: desglose de sub-áreas con scores individuales
- AlertBanner con reglas 1–6
- Heatmap semanal por área
- Progresión histórica 6 meses

### Fase 5 — Correlaciones
- Engine de correlación: detectar patrones entre sub-áreas de distintos niveles
- Reportes: "Tu sueño bajo coincide con baja productividad cognitiva"

---

## 11. Criterios de Éxito

1. Score de área refleja comportamiento real en < 24h de cualquier actividad registrada
2. Usuario puede identificar qué sub-área específica está tirando hacia abajo su área
3. GLSHS cambia cuando el usuario actúa (no solo cuando completa cuestionario)
4. Alertas de cascada se activan correctamente cuando L1/L2 bajan
5. Motor de correlaciones detecta al menos 3 patrones validados en primeras 4 semanas de uso

---

## 12. Referencias

- `docs/areas.md` — Arquitectura completa de 8 niveles × 4 profundidades
- `lib/utils/maslow-weights.ts` — Pesos Maslow actuales (sin cambio)
- `features/maslow/scoring.ts` — Función de score global (expandir, no reemplazar)
- `lib/db/schema/areas.ts` — Schema actual (modificar)
- CFPB Financial Well-Being Scale (2017)
- Harvard Study of Adult Development (2024, PMC)
- Meta-análisis BMC Psychology (2025)
- Ohsaki Study — Ikigai y mortalidad (PMC 2022)
- Self-Determination Theory — Deci & Ryan (2000, 2017)
- Vanguard Research — Emergency Savings and Financial Well-being (2024)
