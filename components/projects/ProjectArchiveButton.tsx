'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive } from 'lucide-react'
import { archiveProject } from '@/actions/projects'

interface ProjectArchiveButtonProps {
  projectId: string
}

/**
 * Botón de archivado para la página de detalle.
 * Redirige a /projects después del archivado exitoso.
 */
export function ProjectArchiveButton({ projectId }: ProjectArchiveButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleArchive() {
    if (!confirm('¿Archivar este proyecto? Puedes verlo en la tab "Archivados".')) return
    startTransition(async () => {
      const result = await archiveProject(projectId)
      if (result.error) {
        alert(result.error)
      } else {
        router.push('/projects')
      }
    })
  }

  return (
    <button
      onClick={handleArchive}
      disabled={isPending}
      className="flex items-center gap-1.5 text-sm font-medium text-red-600/70 hover:text-red-600 disabled:opacity-50 transition-colors"
    >
      <Archive className="w-4 h-4" />
      {isPending ? 'Archivando...' : 'Archivar proyecto'}
    </button>
  )
}
