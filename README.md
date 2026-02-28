# life-os

> AI-powered personal life management system — OKRs, habits, time tracking, inbox scheduling & weekly review

![CI](https://github.com/mariomina/life-os/actions/workflows/ci.yml/badge.svg)
![Tests](https://img.shields.io/badge/tests-678%20passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

---

## What is life-os?

**life-os** is a full-stack personal productivity system that integrates AI to help you manage your life with clarity and intention. It connects your long-term goals (OKRs) to your daily habits, tracks time across projects and areas, processes your inbox intelligently, and delivers weekly reviews with AI-generated insights — all in a single, unified interface.

Built for the individual who wants to operate with the rigor of a high-performance team, but applied to their own life.

---

## Features

| Module                    | Description                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Areas of Life**         | Define the domains of your life (Health, Career, Finance, etc.) and track their health scores using the Maslow scoring model                                        |
| **OKRs**                  | Set quarterly Objectives and Key Results linked to your areas — track progress with CCR (Completion-to-Commitment Ratio)                                            |
| **Habits**                | Daily habit tracking with consistency metrics, streak counts, and correlation analysis                                                                              |
| **Projects**              | Manage projects with tasks and steps, linked to areas and OKRs                                                                                                      |
| **Calendar & Scheduling** | Schedule activities with AI-assisted slot recommendations based on your energy patterns                                                                             |
| **Inbox**                 | Capture anything — AI classifies inbox items and routes them to the right module                                                                                    |
| **Skills**                | Track skill development with level progression, XP points, and emerging skill detection                                                                             |
| **Reports & Insights**    | Weekly and periodic reports with natural language AI insights powered by Claude — habit consistency, OKR progress, correlation analysis, and agent leverage metrics |
| **Weekly Review**         | Guided 4-phase wizard (Measure → Analyze → Plan → Confirm) for structured weekly reflection                                                                         |

---

## Tech Stack

| Layer         | Technology                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, RSC)                                                |
| **UI**        | [React 19](https://react.dev/) + [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **Database**  | [Supabase](https://supabase.com/) (PostgreSQL) + [Drizzle ORM](https://orm.drizzle.team/)                          |
| **Auth**      | [Supabase Auth](https://supabase.com/docs/guides/auth) (server-side, SSR)                                          |
| **AI**        | [Anthropic Claude](https://www.anthropic.com/) via `@anthropic-ai/sdk` (insights + inbox classification)           |
| **Language**  | [TypeScript 5](https://www.typescriptlang.org/) (strict mode)                                                      |
| **Testing**   | [Vitest](https://vitest.dev/) — 678 tests                                                                          |
| **Deploy**    | [Vercel](https://vercel.com/)                                                                                      |

---

## Architecture

```
app/                    Next.js App Router (pages, layouts, API routes)
├── (app)/              Authenticated routes
│   ├── dashboard/      Main dashboard with area health overview
│   ├── areas/          Areas of life management
│   ├── okrs/           OKR tracking
│   ├── habits/         Habit tracker
│   ├── projects/       Project & task management
│   ├── calendar/       Scheduling & calendar view
│   ├── inbox/          Inbox capture & processing
│   ├── skills/         Skill progression
│   ├── reports/        Analytics & AI insights
│   └── weekly-review/  Guided weekly review wizard
├── (auth)/             Auth pages (login, signup)
actions/                Next.js Server Actions (business logic layer)
features/               Pure business logic (domain functions + tests)
├── maslow/             Area health scoring (Maslow model)
├── reports/            Report computations (habits, OKRs, correlations, leverage)
├── correlations/       Statistical correlation engine
└── skills/             Skill level + emerging skill detection
lib/
├── db/                 Drizzle ORM schema + queries
├── supabase/           Supabase client (server + browser)
└── llm/                LLM provider abstraction (ILLMProvider + ClaudeProvider)
components/             Shared React components (shadcn/ui + custom)
types/                  TypeScript type definitions
supabase/               Database migrations
docs/
├── prd.md              Product Requirements Document
├── architecture.md     Architecture overview
├── prd/                PRD sections by epic
└── architecture/       Architecture decision records
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project
- (Optional) An [Anthropic API key](https://console.anthropic.com/) for AI features

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/mariomina/life-os.git
cd life-os

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Apply database migrations
npx supabase db push

# 5. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Environment Variables

| Variable                        | Required | Description                                                       |
| ------------------------------- | -------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Your Supabase project URL                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous (public) key                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key (server-side only)                      |
| `ANTHROPIC_API_KEY`             | No       | Anthropic API key for AI insights (falls back to static messages) |
| `NEXT_PUBLIC_LLM_PROVIDER`      | No       | LLM provider: `claude` or `mock` (default: `mock`)                |

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
```

The project has **678 tests** covering all business logic functions, edge cases, and domain computations.

---

## Deploy

### Vercel (recommended)

1. Push to GitHub
2. Import the repository in [Vercel](https://vercel.com/new)
3. Add environment variables in the Vercel dashboard
4. Deploy

### Database

Run Supabase migrations against your production database:

```bash
npx supabase db push --linked
```

---

## License

MIT
