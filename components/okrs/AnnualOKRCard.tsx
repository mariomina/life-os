'use client'

import { useState, useTransition } from 'react'
import { ChevronDown, ChevronUp, Clock, CheckCircle2, Flag, Plus, Trash2 } from 'lucide-react'
import { OKRImpactBadge } from '@/components/okrs/OKRImpactBadge'
import { KRForm } from '@/components/okrs/KRForm'
import { createKR, deleteOKR, confirmMilestone } from '@/actions/okrs'
import type { CreateKRData } from '@/actions/okrs'
import { calculateOKRImpact, buildScoreMap } from '@/features/maslow/okr-impact'
import { Badge } from '@/components/ui/badge'
import type { OKR } from '@/lib/db/schema/okrs'
import type { Area } from '@/lib/db/schema/areas'

interface AnnualOKRCardProps {
  okr: OKR
  areas: Area[]
  krs: OKR[]
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
  paused: 'Pausado',
}

const KR_TYPE_ICONS = {
  time_based: <Clock className="w-3.5 h-3.5" />,
  outcome_based: <Flag className="w-3.5 h-3.5" />,
  milestone: <CheckCircle2 className="w-3.5 h-3.5" />,
}

export function AnnualOKRCard({ okr, areas, krs }: AnnualOKRCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showKRForm, setShowKRForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  const linkedArea = areas.find((a) => a.id === okr.areaId)
  const impactResult = okr.areaId
    ? calculateOKRImpact({ areaId: okr.areaId }, areas, buildScoreMap(areas))
    : null

  function handleCreateKR(data: CreateKRData) {
    startTransition(async () => {
      const result = await createKR(data)
      if (!result.error) {
        setShowKRForm(false)
      } else {
        alert(result.error)
      }
    })
  }

  function handleDelete() {
    if (!confirm('¿Estás seguro de que deseas cancelar este OKR y todos sus KRs?')) return
    startTransition(async () => {
      await deleteOKR(okr.id)
    })
  }

  function handleConfirmMilestone(krId: string) {
    startTransition(async () => {
      const result = await confirmMilestone(krId)
      if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition-all duration-200">
      {/* Header / Annual OKR Info */}
      <div
        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 min-w-0">
            <div className="mt-1">
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{okr.title}</p>
              {linkedArea && (
                <p className="text-xs text-muted-foreground">
                  {linkedArea.name} · Nivel {linkedArea.maslowLevel}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {impactResult && impactResult.deltaPoints > 0 && (
              <OKRImpactBadge result={impactResult} />
            )}
            <Badge variant={okr.status as 'active' | 'completed' | 'paused' | 'cancelled'}>
              {STATUS_LABELS[okr.status] ?? okr.status}
            </Badge>
          </div>
        </div>

        {/* Progress Bar (Annual) */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            <span>Progreso Anual</span>
            <span>{okr.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${okr.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Expanded Content: KRs */}
      {isExpanded && (
        <div className="border-t bg-muted/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
              Resultados Clave (KRs)
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowKRForm(!showKRForm)
              }}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Nuevo KR
            </button>
          </div>

          {/* KR List */}
          <div className="space-y-2">
            {krs.length === 0 && !showKRForm ? (
              <p className="text-xs text-muted-foreground text-center py-4 italic">
                No hay KRs definidos para este trimestre.
              </p>
            ) : (
              krs.map((kr) => (
                <div key={kr.id} className="bg-card rounded-xl border p-3 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex gap-2 min-w-0">
                      <div className="mt-0.5 text-primary">
                        {KR_TYPE_ICONS[kr.krType as key_result_type] ?? (
                          <Flag className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-tight">
                          {kr.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {kr.quarter} ·{' '}
                          {kr.krType === 'time_based'
                            ? `${kr.targetValue}h`
                            : kr.krType === 'outcome_based'
                              ? `${kr.targetValue} ${kr.targetUnit}`
                              : 'Hito'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {kr.progress}%
                      </span>
                    </div>
                  </div>
                  {/* Mini Progress Bar for KR */}
                  <div className="w-full bg-muted rounded-full h-1">
                    <div
                      className="h-1 rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${kr.progress}%` }}
                    />
                  </div>
                  {/* Confirm Milestone Button */}
                  {kr.krType === 'milestone' && kr.progress === 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConfirmMilestone(kr.id)
                      }}
                      disabled={isPending}
                      className="w-full mt-1 flex items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmar hito
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* New KR Form */}
          {showKRForm && (
            <div className="bg-card rounded-xl border p-4 shadow-md space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase tracking-wider">Nuevo KR Trimestral</h5>
                <button
                  onClick={() => setShowKRForm(false)}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
              <KRForm parentId={okr.id} year={okr.year!} onSubmit={handleCreateKR} />
            </div>
          )}

          {/* Dangerous Actions */}
          <div className="pt-2 flex justify-end border-t border-dashed">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-600/70 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Cancelar OKR
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type key_result_type = 'time_based' | 'outcome_based' | 'milestone'
