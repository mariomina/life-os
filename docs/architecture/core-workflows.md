# Architecture — 7. Core Workflows

> **Documento:** [Architecture Index](./index.md)
> **Sección:** 7 de 17

---

## 7.1 Daily Check-in Flow

```mermaid
sequenceDiagram
    actor User
    participant Home as Home Page<br/>(Server Component)
    participant Action as Server Action<br/>actions/checkin.ts
    participant DB as Supabase DB<br/>(via Drizzle)
    participant Zustand as Zustand Store

    User->>Home: Abre la app
    Home->>DB: getUncheckedActivities(userId, yesterday)
    DB-->>Home: activities[] (máx 5-7)
    Home-->>User: Banner check-in + lista actividades

    User->>Action: confirmActivity(activityId, status)
    Action->>Zustand: optimisticUpdate(activityId, 'completed')
    Action->>DB: upsertCheckinResponse(activityId, 'completed')
    DB-->>Action: OK
    Action->>DB: updateAreaScore(areaId)
    DB-->>Action: newScore
    Action-->>Home: revalidatePath('/')
    Home-->>User: UI actualizada con nuevo score

    Note over User,Zustand: Bulk confirm para hábitos automáticos
    User->>Action: bulkConfirmHabits(habitIds[])
    Action->>DB: batchUpsertCheckinResponses(...)
    DB-->>Action: OK
    Action-->>Home: revalidatePath('/')
```

## 7.2 Inbox → IA → Calendario Flow

```mermaid
sequenceDiagram
    actor User
    participant Inbox as Inbox Page
    participant Action as actions/inbox.ts
    participant LLM as ILLMProvider<br/>(Claude Haiku)
    participant DB as Supabase DB
    participant Cal as Calendar

    User->>Inbox: Escribe texto libre
    Inbox->>Action: processInboxItem(text, userId)

    Action->>DB: getFreeSlots(userId, next7days)
    DB-->>Action: freeSlots[]
    Action->>DB: getActiveOKRs(userId)
    DB-->>Action: okrs[]

    Action->>LLM: complete(prompt{text, slots, okrs})

    alt LLM disponible
        LLM-->>Action: {classification, area, slot, title}
        Action->>DB: updateInboxItem(id, {status:'processing', ai_classification})
        DB-->>Action: OK
        Action-->>Inbox: InboxSuggestion{slot, area, title}
        Inbox-->>User: Card con propuesta + botón 1-click

        User->>Action: confirmInboxItem(itemId, slot)
        Action->>DB: createStepActivity(slot, area, title)
        Action->>DB: updateInboxItem(id, {status:'processed'})
        DB-->>Action: stepActivity
        Action-->>Cal: revalidatePath('/calendar')
        Cal-->>User: Evento aparece en calendario
    else LLM no disponible (FR22)
        LLM-->>Action: Error / timeout
        Action->>DB: updateInboxItem(id, {status:'manual'})
        Action-->>Inbox: {mode:'manual', error: 'IA no disponible'}
        Inbox-->>User: Formulario manual (área, fecha, título)
    end
```

## 7.3 Timer Start/Stop con Realtime

```mermaid
sequenceDiagram
    actor User
    participant CalDay as Calendar Vista Día
    participant Zustand as timerStore (Zustand)
    participant Action as actions/timer.ts
    participant DB as Supabase DB
    participant RT as Supabase Realtime

    User->>CalDay: Click "Iniciar" en activity
    CalDay->>Zustand: optimisticStart(activityId)
    Zustand-->>CalDay: isActive=true (inmediato)

    CalDay->>Action: startTimer(activityId, userId)
    Action->>DB: createTimeEntry({started_at: now, is_active: true})
    DB-->>RT: INSERT event
    RT-->>CalDay: Realtime push (latencia <1s)
    CalDay->>Zustand: confirmStart(timeEntryId)

    Note over User,RT: Timer corre. UI muestra tiempo transcurrido.

    User->>CalDay: Click "Pausar"
    CalDay->>Zustand: optimisticPause()
    CalDay->>Action: pauseTimer(timeEntryId, reason)
    Action->>DB: updateTimeEntry(id, {pause_reason, paused_at})

    User->>CalDay: Click "Detener"
    CalDay->>Action: stopTimer(timeEntryId)
    Action->>DB: updateTimeEntry(id, {ended_at: now, is_active: false, duration_seconds})
    Action->>DB: updateStepActivity(activityId, {status: 'completed'})
    Action->>DB: updateAreaScore(areaId) — recalcular
    Action-->>CalDay: revalidatePath('/calendar')
    CalDay->>Zustand: reset()
```

## 7.4 Motor de Correlaciones (Cron Nocturno)

```mermaid
sequenceDiagram
    participant Cron as Supabase Edge Function<br/>(cron: 03:00 UTC)
    participant DB as Supabase DB
    participant Engine as Correlation Engine
    participant LLM as ILLMProvider

    Cron->>DB: getActiveUsers()
    DB-->>Cron: users[]

    loop Para cada usuario
        Cron->>DB: getDataAvailability(userId)
        DB-->>Cron: {days_of_data, data_points}

        alt days_of_data < 7
            Note over Cron: Skip — "Gathering data" (Tiered Insights)
        else days_of_data 7-13
            Cron->>Engine: runDescriptiveStats(userId)
            Engine->>DB: getTimeEntriesByArea(userId, last14days)
            DB-->>Engine: timeData[]
            Engine->>DB: upsertCorrelations(userId, {type:'descriptive', provisional: true})
        else days_of_data >= 14
            Cron->>Engine: runFullCorrelation(userId)
            Engine->>DB: getFullDataset(userId, last90days)
            DB-->>Engine: {timeEntries, checkins, habitCompletions}
            Engine->>Engine: calculatePearsonSpearman(dataset)
            Engine->>LLM: generateInsights(correlations)
            LLM-->>Engine: insights (lenguaje natural)
            Engine->>DB: upsertCorrelations(userId, results)
        end
    end
```
