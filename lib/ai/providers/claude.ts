import Anthropic from '@anthropic-ai/sdk'
import type {
  ILLMProvider,
  MaslowScores,
  ClassifyInboxContext,
  ClassifyInboxResult,
} from '@/lib/ai/types'

const MASLOW_ANALYSIS_PROMPT = `Eres un psicólogo especialista en el modelo de Maslow expandido. Analiza el siguiente texto de resultados psicométricos y asigna un score de 0 a 100 para cada una de las 8 áreas de vida.

Áreas (nivel → nombre → descripción):
1. Fisiológica (D-Need): salud física, sueño, alimentación, ejercicio, hidratación
2. Seguridad (D-Need): estabilidad financiera, empleo, entorno seguro, estructura vital
3. Conexión Social (D-Need): relaciones, familia, amigos, pertenencia, intimidad emocional
4. Estima (D-Need): reconocimiento, autoconfianza, logros, autonomía, competencia
5. Cognitiva (B-Need): aprendizaje, curiosidad intelectual, pensamiento crítico
6. Estética (B-Need): belleza, creatividad, orden, inspiración, expresión artística
7. Autorrealización (B-Need): propósito, potencial, crecimiento personal, valores
8. Autotrascendencia (B-Need): contribución, legado, impacto en otros, sentido de servicio

Instrucciones:
- Infiere los scores basándote en los rasgos, fortalezas y patrones descritos en el texto
- Si el texto indica claramente un área fuerte, asigna 70-90
- Si el texto es neutro o no da información de un área, asigna 50 como baseline
- Si el texto indica debilidad en un área, asigna 20-40
- Devuelve ÚNICAMENTE el JSON sin texto adicional, sin markdown, sin comentarios

Formato de respuesta exacto:
{"1":<number>,"2":<number>,"3":<number>,"4":<number>,"5":<number>,"6":<number>,"7":<number>,"8":<number>}`

const MASLOW_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const

function parseAndValidate(raw: string): MaslowScores {
  // Extract JSON from response (handle potential surrounding text)
  const jsonMatch = raw.match(/\{[^}]+\}/)
  if (!jsonMatch) throw new Error('La IA no devolvió un JSON válido')

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

  const scores = {} as MaslowScores
  for (const level of MASLOW_LEVELS) {
    const val = Number(parsed[String(level)])
    if (isNaN(val)) throw new Error(`Score inválido para área ${level}`)
    scores[level] = Math.max(0, Math.min(100, Math.round(val)))
  }
  return scores
}

// ─── Inbox Classification (Story 6.2) ─────────────────────────────────────────

const VALID_CLASSIFICATIONS = ['task', 'event', 'project', 'habit', 'idea', 'reference'] as const

function buildClassifyPrompt(rawText: string, context: ClassifyInboxContext): string {
  const areasText = context.areas
    .map((a) => `- ID: ${a.id} | Nombre: ${a.name} | Maslow nivel ${a.maslowLevel}`)
    .join('\n')

  const okrsText =
    context.activeOKRs.length > 0
      ? context.activeOKRs
          .map(
            (o) =>
              `- ID: ${o.id} | Tipo: ${o.type} | Título: ${o.title} | ÁreaID: ${o.areaId ?? 'ninguna'}`
          )
          .join('\n')
      : '(sin OKRs activos)'

  const slotsText =
    context.freeSlots.length > 0
      ? context.freeSlots
          .slice(0, 10) // Limit to 10 slots to keep prompt concise
          .map((s) => `- Inicio: ${s.start} | Fin: ${s.end} | Duración: ${s.durationMinutes} min`)
          .join('\n')
      : '(sin huecos libres en los próximos 7 días)'

  return `Eres un asistente de productividad personal. Clasifica el siguiente texto del inbox del usuario y sugiere cómo calendarizarlo.

TEXTO CAPTURADO:
"${rawText}"

ÁREAS DE VIDA DEL USUARIO:
${areasText}

OKRS ACTIVOS (año actual / trimestre actual):
${okrsText}

HUECOS LIBRES EN EL CALENDARIO (próximos 7 días, ventana 08:00-22:00 UTC):
${slotsText}

Instrucciones:
- Clasifica el texto como uno de: task, event, project, habit, idea, reference
- Elige el área más relevante de la lista (usa su ID exacto)
- Si hay un OKR relacionado, usa su ID exacto (si no hay ninguno relevante, usa null)
- Elige el primer hueco libre adecuado para la duración estimada (usa su timestamp de inicio exacto)
- Si no hay huecos libres, sugiere el primer día disponible a las 09:00 UTC
- El título debe ser conciso y accionable (máx 60 caracteres)
- Estima la duración realista en minutos (mínimo 15, máximo 480)
- Devuelve ÚNICAMENTE JSON válido, sin markdown, sin texto adicional

Formato de respuesta exacto:
{"classification":"<task|event|project|habit|idea|reference>","suggestedAreaId":"<uuid>","suggestedOkrId":"<uuid o null>","suggestedSlot":"<ISO 8601>","suggestedTitle":"<string>","estimatedDurationMinutes":<number>}`
}

function parseClassifyResult(raw: string): ClassifyInboxResult {
  // Extract JSON — handle potential surrounding text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('La IA no devolvió un JSON válido para clasificación')

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>

  const classification = parsed.classification as string
  if (!VALID_CLASSIFICATIONS.includes(classification as (typeof VALID_CLASSIFICATIONS)[number])) {
    throw new Error(`Clasificación inválida: ${classification}`)
  }

  const suggestedAreaId = parsed.suggestedAreaId
  if (typeof suggestedAreaId !== 'string' || !suggestedAreaId) {
    throw new Error('suggestedAreaId inválido en respuesta IA')
  }

  const suggestedSlot = parsed.suggestedSlot
  if (typeof suggestedSlot !== 'string' || !suggestedSlot) {
    throw new Error('suggestedSlot inválido en respuesta IA')
  }

  const suggestedTitle = parsed.suggestedTitle
  if (typeof suggestedTitle !== 'string' || !suggestedTitle) {
    throw new Error('suggestedTitle inválido en respuesta IA')
  }

  const estimatedDurationMinutes = Number(parsed.estimatedDurationMinutes)
  if (isNaN(estimatedDurationMinutes) || estimatedDurationMinutes <= 0) {
    throw new Error('estimatedDurationMinutes inválido en respuesta IA')
  }

  const suggestedOkrId =
    parsed.suggestedOkrId && parsed.suggestedOkrId !== 'null'
      ? (parsed.suggestedOkrId as string)
      : undefined

  return {
    classification: classification as ClassifyInboxResult['classification'],
    suggestedAreaId,
    suggestedOkrId,
    suggestedSlot,
    suggestedTitle: suggestedTitle.slice(0, 60),
    estimatedDurationMinutes: Math.max(15, Math.min(480, Math.round(estimatedDurationMinutes))),
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export class ClaudeProvider implements ILLMProvider {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }

  async analyzeText(text: string): Promise<MaslowScores> {
    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `${MASLOW_ANALYSIS_PROMPT}\n\n${text}`,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Respuesta IA inesperada')

    return parseAndValidate(content.text)
  }

  async classifyInboxItem(
    rawText: string,
    context: ClassifyInboxContext
  ): Promise<ClassifyInboxResult> {
    const prompt = buildClassifyPrompt(rawText, context)

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = message.content[0]
    if (content.type !== 'text') throw new Error('Respuesta IA inesperada para clasificación')

    return parseClassifyResult(content.text)
  }
}
