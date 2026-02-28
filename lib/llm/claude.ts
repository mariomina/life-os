// lib/llm/claude.ts
// ClaudeProvider — Wrapper for @anthropic-ai/sdk (Story 8.6).

import type { ILLMProvider } from './interface'

export class ClaudeProvider implements ILLMProvider {
  readonly providerName = 'claude'

  async generateInsight(prompt: string): Promise<string> {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
    const block = msg.content[0]
    return block.type === 'text' ? block.text : ''
  }
}
