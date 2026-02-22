import Anthropic from '@anthropic-ai/sdk'
import type { ILLMProvider, MaslowScores } from '@/lib/ai/types'

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
}
