'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboardingMethod, type OnboardingMethod } from '@/actions/onboarding'

// Step components
import { StepWelcome } from './StepWelcome'
import { StepMaslow } from './StepMaslow'
import { StepSelection } from './StepSelection'

type Step = 1 | 2 | 3

const STEP_LABELS = ['Bienvenida', 'Tu sistema', 'Diagnóstico']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  const goNext = () => setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev))
  const goBack = () => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))

  const handleSelectMethod = async (method: OnboardingMethod) => {
    setLoading(true)
    await saveOnboardingMethod(method)
    router.push(method === 'questionnaire' ? '/onboarding/questionnaire' : '/onboarding/upload')
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className={i + 1 <= step ? 'font-medium text-foreground' : ''}>
              {label}
            </span>
          ))}
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-muted-foreground">Paso {step} de 3</p>
      </div>

      {/* Step content */}
      {step === 1 && <StepWelcome onNext={goNext} />}
      {step === 2 && <StepMaslow onNext={goNext} onBack={goBack} />}
      {step === 3 && (
        <StepSelection onSelect={handleSelectMethod} onBack={goBack} loading={loading} />
      )}
    </div>
  )
}
