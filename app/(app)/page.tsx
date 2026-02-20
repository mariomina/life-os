import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Home — Execution Space</h1>
      <p className="text-sm text-muted-foreground">life-os dashboard — Setup Story 1.1</p>
      {/* shadcn/ui Button smoke test */}
      <Button>Comenzar</Button>
    </div>
  )
}
