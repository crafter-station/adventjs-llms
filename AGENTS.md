# AGENTS.md

## Commands
- `bun dev` - Start dev server
- `bun run build` - Production build
- `bun run lint` - Biome check (run before commits)
- `bun run format` - Auto-fix formatting
- No test framework; verify changes with `bun run build`

## Database
- **Schema changes**: Always use `bunx drizzle-kit push` to sync schema to database
- **No migrations**: Do NOT use `drizzle-kit generate` or migration files
- Schema defined in `src/db/schema.ts`

## Code Style
- **Formatting**: 2-space indent, Biome enforced (use `bun run format`)
- **Imports**: External packages first, then `@/*` aliases (Biome auto-organizes)
- **Types**: Strict TS; use `import type { X }` for type-only imports
- **Naming**: camelCase variables/functions, PascalCase components/types
- **Errors**: `error instanceof Error ? error.message : String(error)`
- **Comments**: Avoid unless absolutely necessary

## Conventions
- Named exports for functions; default exports only for Next.js pages
- API routes: `export async function POST(request: Request)`
- Trigger tasks: `schemaTask` with `z.object()` for input validation
- Path alias: `@/*` → `./src/*`
- Stack: Next.js 16 (App Router), React 19, Trigger.dev, Vercel AI SDK, Drizzle ORM
