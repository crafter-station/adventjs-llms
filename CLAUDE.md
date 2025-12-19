# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

**AdventJS LLM Battle Arena** is a web application that pits AI models against each other to solve coding challenges from [AdventJS 2025](https://adventjs.dev). Models compete head-to-head, and the app tracks which model solves challenges faster, with fewer iterations, and using fewer tokens.

Key features:
- Real-time streaming of AI model responses during battles
- Code execution via the exec0 sandbox API
- Leaderboard with win/loss statistics per model
- Battle history with filters and pagination

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Database**: PostgreSQL via Neon (serverless), Drizzle ORM
- **Background Jobs**: Trigger.dev for long-running AI tasks
- **AI Integration**: Vercel AI SDK (`ai` package)
- **Linting/Formatting**: Biome
- **Package Manager**: Bun

## Commands

```bash
bun dev          # Start development server
bun run build    # Production build
bun run lint     # Run Biome linter (run before commits)
bun run format   # Auto-fix formatting with Biome
```

No test framework is configured; verify changes with `bun run build`.

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── battle/         # POST - Start a new battle
│   │   ├── battles/        # GET - List battles, GET [id] - Battle details
│   │   ├── challenges/     # GET - List challenges, GET [id] - Challenge details
│   │   ├── leaderboard/    # GET - Model rankings
│   │   ├── revalidate/     # POST - Cache revalidation endpoint
│   │   └── test/           # Test endpoints
│   ├── battles/            # Battle list and detail pages
│   ├── leaderboard/        # Leaderboard page
│   ├── streams.ts          # Trigger.dev stream definitions for real-time updates
│   ├── layout.tsx          # Root layout with Navbar
│   ├── page.tsx            # Home page with BattleArena component
│   └── globals.css         # Global styles and Tailwind config
├── components/
│   ├── battle-arena.tsx    # Model selection and battle configuration UI
│   ├── model-selector.tsx  # Searchable model dropdown
│   ├── navbar.tsx          # Site navigation
│   └── stream-viewer.tsx   # Real-time streaming display component
├── db/
│   ├── index.ts            # Drizzle client initialization (Neon)
│   └── schema.ts           # Database tables: challenges, battles
├── lib/
│   └── models.ts           # AI model definitions (large file with model metadata)
└── trigger/
    ├── dual-solve-challenge.ts  # Orchestrates two models solving same challenge
    ├── solve-challenge.ts       # Single model challenge solver with streaming
    ├── execute-code.ts          # Code execution via exec0 API
    └── simple-stream-test.ts    # Test task for streaming

challenges/                 # Markdown files with challenge descriptions
scripts/                    # Utility scripts for seeding, backfilling, testing
public/                     # Static assets including AdventJS images
```

## Database Schema

Two main tables in `src/db/schema.ts`:

**challenges**
- `id` (integer, PK) - Challenge number (1-18)
- `title` (text) - Challenge name
- `difficulty` (enum: easy/medium/hard)
- `description` (text) - Full challenge markdown
- `functionSignature` (text) - Required function template

**battles**
- `id` (uuid, PK)
- `triggerRunId` / `triggerPublicToken` - Trigger.dev run tracking
- `modelA` / `modelB` (text) - Model IDs in format "provider/model-name"
- `challengeId` (integer)
- `modelASuccess` / `modelBSuccess` (boolean)
- `modelAExecutionCount` / `modelBExecutionCount` (integer)
- `modelATimeToSolution` / `modelBTimeToSolution` (integer, ms)
- `modelAInputTokens` / `modelAOutputTokens` / `modelBInputTokens` / `modelBOutputTokens` (integer)
- `modelACost` / `modelBCost` (real)
- `modelASolution` / `modelBSolution` (text)
- `modelAError` / `modelBError` (text)
- `status` (enum: pending/completed/failed)
- `createdAt` / `completedAt` (timestamp)

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `TRIGGER_SECRET_KEY` - Trigger.dev API key
- `NEXT_PUBLIC_APP_URL` - App URL for revalidation callbacks
- `REVALIDATION_SECRET` - Auth token for cache revalidation

## Key Architectural Patterns

### Battle Flow
1. User selects two models and a challenge on the home page
2. `POST /api/battle` triggers `dual-solve-challenge` task via Trigger.dev
3. `dual-solve-challenge` runs two `solve-challenge` subtasks in parallel
4. Each `solve-challenge` task streams AI responses and calls `execute-code` for testing
5. Results are stored in the database and the UI updates in real-time via Trigger.dev streams

### Model Configuration
Models are defined in `src/lib/models.ts` with metadata including:
- `copyString` - The model ID used for API calls (format: "provider/model-name")
- `displayName` - Human-readable name
- `inputCost` / `outputCost` - Cost per million tokens
- `tags` - Capabilities like "tool-use", "reasoning", "vision"

### Streaming
- Uses Trigger.dev's `streams.define()` for real-time updates
- Two stream channels: `model-a` and `model-b`
- Frontend uses `@trigger.dev/react-hooks` to subscribe to streams
- `StreamViewer` component processes chunks into UI elements

### Code Execution
- Uses exec0 API (`https://api.uprizing.me/api/v1/run/javascript`)
- 15-second timeout per execution
- Retry logic with exponential backoff for failures

## Code Style Conventions

- **Formatting**: 2-space indent, Biome enforced
- **Imports**: External packages first, then `@/*` aliases (auto-organized by Biome)
- **Types**: Strict TypeScript; use `import type { X }` for type-only imports
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Errors**: `error instanceof Error ? error.message : String(error)`
- **Comments**: Avoid unless absolutely necessary
- **Exports**: Named exports for functions; default exports only for Next.js pages
- **API Routes**: `export async function POST(request: Request)`
- **Trigger Tasks**: Use `schemaTask` with `z.object()` for input validation
- **Path Alias**: `@/*` maps to `./src/*`

## Common Tasks

### Adding a New Model
Add entry to the `MODELS` array in `src/lib/models.ts` with all required fields.

### Adding a New Challenge
1. Create `challenges/challenge-XX.md` with the challenge description
2. Include `<!-- FUNCTION_SIGNATURE ... -->` block with the required function template
3. Run seed script or add to database manually

### Modifying Battle Logic
- Core logic is in `src/trigger/solve-challenge.ts`
- System prompt defines the AI's behavior and rules
- Tool definition for `runCode` handles code execution

### Debugging Battles
- Check Trigger.dev dashboard for task runs and logs
- Battle status updates in real-time via streams
- Errors are captured in `modelAError` / `modelBError` fields

## Important Files to Know

- `src/trigger/solve-challenge.ts` - Core AI solving logic with streaming
- `src/lib/models.ts` - All available AI models (large file)
- `src/db/schema.ts` - Database structure
- `src/components/stream-viewer.tsx` - Real-time streaming UI
- `src/app/page.tsx` - Home page with stats and battle configuration
