// lib/db/queries/projects.ts
// Queries de lectura para la tabla projects.
// Todas las funciones requieren userId explícito — no confiar solo en RLS.

import { eq, and } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { projects } from '@/lib/db/schema/projects'
import { areas } from '@/lib/db/schema/areas'
import { okrs } from '@/lib/db/schema/okrs'
import type { Project } from '@/lib/db/schema/projects'
import type { Area } from '@/lib/db/schema/areas'
import type { OKR } from '@/lib/db/schema/okrs'

export type ProjectStatus = 'active' | 'completed' | 'archived' | 'paused'

export interface ProjectWithRelations extends Project {
  area: Area | null
  linkedOkr: OKR | null
}

/**
 * Retorna todos los proyectos del usuario, opcionalmente filtrados por status.
 * Incluye el área vinculada y el OKR vinculado para mostrar en la lista.
 */
export async function getProjects(
  userId: string,
  status?: ProjectStatus
): Promise<ProjectWithRelations[]> {
  assertDatabaseUrl()

  const rows = await db
    .select({
      project: projects,
      area: areas,
      okr: okrs,
    })
    .from(projects)
    .leftJoin(areas, eq(projects.areaId, areas.id))
    .leftJoin(okrs, eq(projects.okrId, okrs.id))
    .where(
      status
        ? and(eq(projects.userId, userId), eq(projects.status, status))
        : eq(projects.userId, userId)
    )
    .orderBy(projects.createdAt)

  return rows.map((row) => ({
    ...row.project,
    area: row.area ?? null,
    linkedOkr: row.okr ?? null,
  }))
}

/**
 * Retorna un proyecto por ID, verificando que pertenece al usuario.
 * Incluye el área y el OKR vinculado.
 */
export async function getProjectById(
  userId: string,
  id: string
): Promise<ProjectWithRelations | null> {
  assertDatabaseUrl()

  const rows = await db
    .select({
      project: projects,
      area: areas,
      okr: okrs,
    })
    .from(projects)
    .leftJoin(areas, eq(projects.areaId, areas.id))
    .leftJoin(okrs, eq(projects.okrId, okrs.id))
    .where(and(eq(projects.id, id), eq(projects.userId, userId)))
    .limit(1)

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    ...row.project,
    area: row.area ?? null,
    linkedOkr: row.okr ?? null,
  }
}

/**
 * Retorna los KRs activos vinculados a un área específica.
 * Usado para el selector de KR filtrado por área en ProjectForm.
 */
export async function getActiveKRsByArea(userId: string, areaId: string): Promise<OKR[]> {
  assertDatabaseUrl()

  return db
    .select()
    .from(okrs)
    .where(
      and(
        eq(okrs.userId, userId),
        eq(okrs.areaId, areaId),
        eq(okrs.type, 'key_result'),
        eq(okrs.status, 'active')
      )
    )
    .orderBy(okrs.year, okrs.quarter)
}
