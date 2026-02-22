'use client'

interface StepWelcomeProps {
  onNext: () => void
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 text-6xl">🧠</div>

      <h1 className="mb-3 text-3xl font-bold text-foreground">life-os</h1>

      <p className="mb-2 text-lg font-medium text-foreground">Tu sistema operativo personal</p>

      <p className="mb-8 max-w-md text-sm text-muted-foreground">
        life-os te ayuda a gestionar tu vida de forma integral: áreas de bienestar, objetivos,
        hábitos, proyectos y tiempo — todo conectado y con scoring automático basado en el modelo de
        Maslow.
      </p>

      <button
        onClick={onNext}
        className="rounded-lg bg-primary px-8 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Comenzar →
      </button>
    </div>
  )
}
