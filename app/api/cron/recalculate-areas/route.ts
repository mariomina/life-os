// app/api/cron/recalculate-areas/route.ts
// Vercel Cron job — recalcula GLSHS de todos los usuarios activos y aplica decay.
// Schedule: diariamente a las 3:00 AM UTC (vercel.json → "0 3 * * *")
// Story 11.4 — Triggers Automáticos + Cron de Decay.

import { gte } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { areas } from '@/lib/db/schema/areas'
import { recalculateGlobalScore } from '@/lib/scoring/area-calculator'
import { detectSubareaCorrelations } from '@/lib/areas/correlation-detector'
import { SUBAREA_CORRELATION_PAIRS } from '@/lib/areas/correlation-pairs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  // Verificar secret header — protección del endpoint
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  assertDatabaseUrl()

  // Usuarios activos: con áreas creadas y actividad en los últimos 90 días
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const activeUsers = await db
    .selectDistinct({ userId: areas.userId })
    .from(areas)
    .where(gte(areas.updatedAt, cutoff))

  let processed = 0
  let errors = 0

  await Promise.allSettled(
    activeUsers.map(async ({ userId }) => {
      try {
        await recalculateGlobalScore(userId)
        await detectSubareaCorrelations(userId, SUBAREA_CORRELATION_PAIRS)
        processed++
      } catch (err) {
        console.error(`[cron/recalculate-areas] failed for user ${userId}:`, err)
        errors++
      }
    })
  )

  return Response.json({ processed, errors, total: activeUsers.length })
}
