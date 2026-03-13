// app/(app)/areas/[slug]/page.tsx
// Server Component — Detalle de un área Maslow con chart histórico y grid de sub-áreas.
// Story 11.7 — UI /areas/[slug] Detalle de Área con Tarjetas de Sub-áreas y Fuentes.
//
// Modelo mental: "Vista de detalle analítica — solo lectura, sin formularios."

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAreaDetailWithSources } from '@/lib/db/queries/areas'
import { getSubareaCorrelationsForArea } from '@/lib/areas/correlation-detector'
import { AreaDetailChart } from './_components/AreaDetailChart'
import { SubareaCard } from './_components/SubareaCard'
import { CorrelationPanel } from './_components/CorrelationPanel'
import type { AreaSource } from '@/lib/db/queries/areas'
import { Briefcase } from 'lucide-react'

// ─── Area Projects Section ─────────────────────────────────────────────────────

function AreaProjectsSection({ projects }: { projects: AreaSource[] }) {
  if (projects.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Proyectos del área</h2>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5">
        {projects.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="flex items-center justify-between gap-2 text-xs rounded hover:bg-accent/50 px-1 py-0.5 -mx-1 transition-colors group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Briefcase className="w-3 h-3 shrink-0 text-purple-500" />
              <span className="truncate text-foreground">{p.title}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-muted-foreground">{p.progress ?? 0}% completado</span>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function AreaDetailPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { slug } = await params
  const areaDetail = await getAreaDetailWithSources(user.id, decodeURIComponent(slug))

  if (!areaDetail) notFound()

  const areaCorrelations = await getSubareaCorrelationsForArea(user.id, areaDetail.id).catch(
    () => []
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link
          href="/areas"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Áreas
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-sm font-medium text-foreground">{areaDetail.name}</span>
      </div>

      {/* Zona 1 — Chart del área */}
      <AreaDetailChart
        data={areaDetail.scoreHistory}
        area={{
          name: areaDetail.name,
          maslowLevel: areaDetail.maslowLevel,
          weightMultiplier: areaDetail.weightMultiplier,
          currentScore: areaDetail.currentScore,
        }}
      />

      {/* Zona 2 — Proyectos del área (proxy — no tienen subareaId) */}
      <AreaProjectsSection projects={areaDetail.areaProjects} />

      {/* Zona 3 — Correlaciones detectadas */}
      <CorrelationPanel correlations={areaCorrelations} />

      {/* Zona 4 — Grid de sub-áreas */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Sub-áreas</h2>
          <span className="text-xs text-muted-foreground">
            {areaDetail.subareas.length} sub-área{areaDetail.subareas.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {areaDetail.subareas.map((subarea) => (
            <SubareaCard key={subarea.id} subarea={subarea} />
          ))}
        </div>
      </section>
    </div>
  )
}
