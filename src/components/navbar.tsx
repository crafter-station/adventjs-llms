import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-brand-red-dark">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between">
        <div className="flex h-full">
          <Link
            href="/"
            className="flex items-center gap-2 border-r border-white/20 px-6 text-sm font-bold uppercase tracking-widest text-brand-beige transition-colors hover:bg-brand-red"
          >
            LLM Battle
          </Link>
        </div>

        <nav className="flex h-full items-center">
          <Link
            href="/"
            className="flex h-full items-center gap-2 border-l border-white/20 px-6 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            Arena
          </Link>
          <Link
            href="/battles"
            className="flex h-full items-center gap-2 border-l border-white/20 px-6 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            Battles
          </Link>
          <Link
            href="/leaderboard"
            className="flex h-full items-center gap-2 border-l border-white/20 px-6 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            Ranking
            <span className="text-lg leading-none">↗</span>
          </Link>
          <a
            href="https://adventjs.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full items-center gap-2 border-l border-white/20 px-6 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            AdventJS
            <span className="text-lg leading-none">↗</span>
          </a>
          <a
            href="https://github.com/crafter-station/exec0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full items-center gap-2 border-l border-white/20 bg-brand-beige px-6 text-sm font-bold uppercase tracking-wider text-brand-red-dark transition-colors hover:bg-brand-beige-dark"
          >
            exec0
            <span className="text-lg leading-none">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
