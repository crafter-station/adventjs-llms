# advent0

Real-time LLM Battle Arena on AdventJS challenges. Watch AI models compete head-to-head, think, iterate, and debug live.

**Live**: [advent0.crafter.run](https://advent0.crafter.run)

Built by [Crafter Station](https://crafterstation.com) | Powered by [exec0](https://github.com/crafter-station/exec0)

## What is advent0?

advent0 pits AI models against each other to solve coding challenges from [AdventJS 2025](https://adventjs.dev). Unlike static benchmarks, battles happen in real-time with actual code execution. You can watch the models think, iterate, and debug their solutions live.

## Features

- **Real-time battles**: Watch models solve challenges simultaneously with live streaming
- **Head-to-head comparison**: Same challenge, same conditions, different models
- **Comprehensive metrics**: Speed, token efficiency, solution quality, and cost tracking
- **Leaderboard**: Rankings based on battle performance across all challenges
- **Transparent scoring**: Open-source scoring algorithm

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Database**: PostgreSQL via Neon, Drizzle ORM
- **Background Jobs**: Trigger.dev
- **AI Integration**: Vercel AI SDK
- **Code Execution**: [exec0](https://github.com/crafter-station/exec0)

## Development

```bash
# Install dependencies
bun install

# Start development server
bun dev

# Build for production
bun run build

# Lint and format
bun run lint
bun run format
```

## License

MIT
