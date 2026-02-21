-- ============================================
-- Seed: workflow_templates — 8 MVP System Templates
-- Story 1.4: DB Schema Refinement
-- is_system=true, user_id=NULL
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
-- ============================================

INSERT INTO public.workflow_templates (id, name, category, description, executor_type_default, squad_type, tasks_config, is_system)
VALUES

-- Template 1: Personal Development
(
  '11111111-1111-1111-1111-111111111111',
  'Desarrollo Personal',
  'personal_development',
  'Workflow completo para ciclos de desarrollo personal: diagnóstico, metas, ejecución y revisión.',
  'mixed',
  'coach',
  '[
    {
      "title": "Diagnóstico",
      "order": 0,
      "steps": [
        { "title": "Evaluar estado actual de todas las áreas Maslow", "executor_type": "human" },
        { "title": "Analizar patrones y correlaciones de los últimos 90 días", "executor_type": "ai", "ai_agent": "@analyst" }
      ]
    },
    {
      "title": "Definición de Metas",
      "order": 1,
      "steps": [
        { "title": "Definir OKR anual con visión a 5 años", "executor_type": "human" },
        { "title": "Desglosar en Key Results trimestrales", "executor_type": "mixed", "ai_agent": "@pm" }
      ]
    },
    {
      "title": "Plan de Acción",
      "order": 2,
      "steps": [
        { "title": "Identificar hábitos prioritarios para el trimestre", "executor_type": "mixed", "ai_agent": "@analyst" },
        { "title": "Definir proyectos de ejecución por área", "executor_type": "human" }
      ]
    },
    {
      "title": "Revisión Semanal",
      "order": 3,
      "steps": [
        { "title": "Revisar progreso de hábitos y actividades", "executor_type": "human" },
        { "title": "Ajustar prioridades para la siguiente semana", "executor_type": "mixed", "ai_agent": "@analyst" }
      ]
    }
  ]'::jsonb,
  true
),

-- Template 2: Product Launch
(
  '22222222-2222-2222-2222-222222222222',
  'Lanzamiento de Producto',
  'product_launch',
  'Proceso estructurado para llevar un producto desde la idea hasta el lanzamiento al mercado.',
  'mixed',
  'dev',
  '[
    {
      "title": "Research y Validación",
      "order": 0,
      "steps": [
        { "title": "Investigar mercado objetivo y competencia", "executor_type": "ai", "ai_agent": "@analyst" },
        { "title": "Definir propuesta de valor única", "executor_type": "human" },
        { "title": "Validar hipótesis con usuarios potenciales", "executor_type": "human" }
      ]
    },
    {
      "title": "Diseño y Especificación",
      "order": 1,
      "steps": [
        { "title": "Crear wireframes y user flows", "executor_type": "human" },
        { "title": "Escribir especificaciones técnicas", "executor_type": "mixed", "ai_agent": "@architect" }
      ]
    },
    {
      "title": "Desarrollo",
      "order": 2,
      "steps": [
        { "title": "Implementar MVP con funcionalidades core", "executor_type": "mixed", "ai_agent": "@dev" },
        { "title": "Integrar sistemas externos necesarios", "executor_type": "mixed", "ai_agent": "@dev" }
      ]
    },
    {
      "title": "Testing y QA",
      "order": 3,
      "steps": [
        { "title": "Ejecutar pruebas funcionales y de regresión", "executor_type": "ai", "ai_agent": "@qa" },
        { "title": "Corrección de bugs críticos", "executor_type": "mixed", "ai_agent": "@dev" }
      ]
    },
    {
      "title": "Lanzamiento",
      "order": 4,
      "steps": [
        { "title": "Preparar materiales de marketing y comunicación", "executor_type": "human" },
        { "title": "Deploy a producción y monitoreo inicial", "executor_type": "mixed", "ai_agent": "@devops" }
      ]
    }
  ]'::jsonb,
  true
),

-- Template 3: Health Sprint
(
  '33333333-3333-3333-3333-333333333333',
  'Sprint de Salud',
  'health_sprint',
  'Sprint de 4 semanas para mejorar indicadores de salud física con seguimiento diario.',
  'human',
  'coach',
  '[
    {
      "title": "Evaluación Inicial",
      "order": 0,
      "steps": [
        { "title": "Medir métricas base: peso, VO2, fuerza, flexibilidad", "executor_type": "human" },
        { "title": "Definir metas SMART para el sprint de 4 semanas", "executor_type": "mixed", "ai_agent": "@analyst" }
      ]
    },
    {
      "title": "Rutina Diaria",
      "order": 1,
      "steps": [
        { "title": "Establecer rutina de ejercicio (mínimo 30 min/día)", "executor_type": "human" },
        { "title": "Configurar seguimiento nutricional", "executor_type": "human" },
        { "title": "Definir protocolo de sueño (7-9 horas)", "executor_type": "human" }
      ]
    },
    {
      "title": "Check-in Semanal",
      "order": 2,
      "steps": [
        { "title": "Registrar métricas semanales", "executor_type": "human" },
        { "title": "Analizar progreso vs metas del sprint", "executor_type": "ai", "ai_agent": "@analyst" }
      ]
    },
    {
      "title": "Ajuste y Consolidación",
      "order": 3,
      "steps": [
        { "title": "Identificar qué funcionó y qué ajustar", "executor_type": "mixed", "ai_agent": "@analyst" },
        { "title": "Convertir hábitos exitosos en rutina permanente", "executor_type": "human" }
      ]
    }
  ]'::jsonb,
  true
),

-- Template 4: Learning
(
  '44444444-4444-4444-4444-444444444444',
  'Aprendizaje de Habilidad',
  'learning',
  'Proceso estructurado para dominar una nueva habilidad técnica o profesional.',
  'mixed',
  'research',
  '[
    {
      "title": "Fundamentos",
      "order": 0,
      "steps": [
        { "title": "Mapear el área de conocimiento y sus sub-dominios", "executor_type": "ai", "ai_agent": "@analyst" },
        { "title": "Identificar recursos de aprendizaje (cursos, libros, mentores)", "executor_type": "mixed", "ai_agent": "@analyst" },
        { "title": "Estudiar conceptos fundamentales", "executor_type": "human" }
      ]
    },
    {
      "title": "Práctica Guiada",
      "order": 1,
      "steps": [
        { "title": "Resolver ejercicios progresivos (fácil → difícil)", "executor_type": "human" },
        { "title": "Documentar aprendizajes y dudas", "executor_type": "human" }
      ]
    },
    {
      "title": "Proyecto Aplicado",
      "order": 2,
      "steps": [
        { "title": "Definir proyecto real que use la habilidad", "executor_type": "human" },
        { "title": "Ejecutar proyecto con soporte de IA cuando sea necesario", "executor_type": "mixed", "ai_agent": "@dev" }
      ]
    },
    {
      "title": "Revisión y Síntesis",
      "order": 3,
      "steps": [
        { "title": "Documentar lecciones aprendidas", "executor_type": "human" },
        { "title": "Identificar próximos pasos para profundizar", "executor_type": "mixed", "ai_agent": "@analyst" }
      ]
    }
  ]'::jsonb,
  true
),

-- Template 5: Content Creation
(
  '55555555-5555-5555-5555-555555555555',
  'Creación de Contenido',
  'content_creation',
  'Flujo completo para producir contenido de calidad: desde la idea hasta la publicación.',
  'mixed',
  'research',
  '[
    {
      "title": "Ideación",
      "order": 0,
      "steps": [
        { "title": "Investigar tendencias y temas relevantes para la audiencia", "executor_type": "ai", "ai_agent": "@analyst" },
        { "title": "Seleccionar ángulo único y propuesta de valor del contenido", "executor_type": "human" },
        { "title": "Definir estructura y outline del contenido", "executor_type": "mixed", "ai_agent": "@pm" }
      ]
    },
    {
      "title": "Producción / Borrador",
      "order": 1,
      "steps": [
        { "title": "Redactar borrador inicial", "executor_type": "human" },
        { "title": "Enriquecer con datos, ejemplos y referencias", "executor_type": "mixed", "ai_agent": "@analyst" }
      ]
    },
    {
      "title": "Revisión y Edición",
      "order": 2,
      "steps": [
        { "title": "Revisar coherencia, claridad y gramática", "executor_type": "mixed", "ai_agent": "@qa" },
        { "title": "Incorporar feedback y hacer ajustes finales", "executor_type": "human" }
      ]
    },
    {
      "title": "Publicación",
      "order": 3,
      "steps": [
        { "title": "Preparar assets visuales (imágenes, infografías)", "executor_type": "human" },
        { "title": "Publicar en plataformas seleccionadas", "executor_type": "human" },
        { "title": "Monitorear engagement durante las primeras 48 horas", "executor_type": "human" }
      ]
    }
  ]'::jsonb,
  true
),

-- Template 6: Financial Review
(
  '66666666-6666-6666-6666-666666666666',
  'Revisión Financiera',
  'financial_review',
  'Proceso mensual de revisión y planificación financiera personal.',
  'mixed',
  'coach',
  '[
    {
      "title": "Recopilación de Datos",
      "order": 0,
      "steps": [
        { "title": "Consolidar ingresos del mes", "executor_type": "human" },
        { "title": "Categorizar todos los gastos del mes", "executor_type": "human" },
        { "title": "Calcular ahorro neto y ratio ahorro/ingreso", "executor_type": "ai", "ai_agent": "@analyst" }
      ]
    },
    {
      "title": "Análisis",
      "order": 1,
      "steps": [
        { "title": "Comparar vs mes anterior y vs presupuesto objetivo", "executor_type": "ai", "ai_agent": "@analyst" },
        { "title": "Identificar categorías con desvío significativo", "executor_type": "mixed", "ai_agent": "@analyst" }
      ]
    },
    {
      "title": "Ajuste de Presupuesto",
      "order": 2,
      "steps": [
        { "title": "Revisar y actualizar presupuesto para el próximo mes", "executor_type": "human" },
        { "title": "Definir meta de ahorro e inversión del próximo mes", "executor_type": "human" }
      ]
    },
    {
      "title": "Plan de Acción",
      "order": 3,
      "steps": [
        { "title": "Identificar 1-3 acciones concretas para mejorar situación financiera", "executor_type": "mixed", "ai_agent": "@analyst" },
        { "title": "Programar recordatorios y compromisos del mes", "executor_type": "human" }
      ]
    }
  ]'::jsonb,
  true
),

-- Template 7: Habit Building
(
  '77777777-7777-7777-7777-777777777777',
  'Construcción de Hábito',
  'habit_building',
  'Proceso de 90 días para instalar un nuevo hábito usando principios de neuroplasticidad.',
  'mixed',
  'coach',
  '[
    {
      "title": "Definición",
      "order": 0,
      "steps": [
        { "title": "Definir el hábito específico con claridad (¿qué, cuándo, dónde?)", "executor_type": "human" },
        { "title": "Identificar el disparador (cue) y la recompensa (reward)", "executor_type": "mixed", "ai_agent": "@analyst" },
        { "title": "Vincular el hábito a un OKR o área Maslow existente", "executor_type": "human" }
      ]
    },
    {
      "title": "Micro-Hábito Inicial (Semanas 1-2)",
      "order": 1,
      "steps": [
        { "title": "Comenzar con versión mínima (2 minutos rule)", "executor_type": "human" },
        { "title": "Registrar completions diariamente", "executor_type": "human" }
      ]
    },
    {
      "title": "Escalado Gradual (Semanas 3-8)",
      "order": 2,
      "steps": [
        { "title": "Incrementar duración/intensidad semanalmente (+10%)", "executor_type": "human" },
        { "title": "Analizar patrones de completions y ajustar horario si necesario", "executor_type": "ai", "ai_agent": "@analyst" }
      ]
    },
    {
      "title": "Automatización (Semanas 9-13)",
      "order": 3,
      "steps": [
        { "title": "Verificar que el hábito se ejecuta sin esfuerzo conscioso", "executor_type": "human" },
        { "title": "Documentar el hábito como parte de la identidad y rutina", "executor_type": "human" },
        { "title": "Evaluar si extender o agregar nuevo hábito complementario", "executor_type": "mixed", "ai_agent": "@analyst" }
      ]
    }
  ]'::jsonb,
  true
),

-- Template 8: Custom
(
  '88888888-8888-8888-8888-888888888888',
  'Plantilla Personalizada',
  'custom',
  'Plantilla de ejemplo editable para crear workflows personalizados desde cero.',
  'human',
  'none',
  '[
    {
      "title": "Tarea de ejemplo",
      "order": 0,
      "steps": [
        { "title": "Paso de ejemplo — editar para personalizar", "executor_type": "human" }
      ]
    }
  ]'::jsonb,
  true
)

ON CONFLICT (id) DO NOTHING;
