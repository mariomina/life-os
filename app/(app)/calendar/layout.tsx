// app/(app)/calendar/layout.tsx
// Calendar Mode layout — full height, no padding.
// Story 10.2 (AC7): el canvas del calendario ocupa toda la pantalla disponible
// debajo del Header (h-14 = 3.5rem).

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">{children}</div>
}
