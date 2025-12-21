"use client";

import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-brand-red-dark">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 md:px-0">
        <div className="flex h-full">
          <Link
            href="/"
            className="flex items-center gap-3 border-r border-white/20 px-4 text-sm font-bold uppercase tracking-widest text-brand-beige transition-colors hover:bg-brand-red md:px-6"
          >
            <span className="flex h-7 w-7 items-center justify-center bg-brand-beige text-xs font-bold text-brand-red-dark">
              A0
            </span>
            <span className="hidden sm:inline">advent0</span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-10 items-center justify-center text-brand-beige md:hidden"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            {isOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>

        {/* Desktop navigation */}
        <nav className="hidden h-full items-center md:flex">
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
            href="https://github.com/crafter-station/advent0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full items-center gap-2 border-l border-white/20 px-6 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            GitHub
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

      {/* Mobile navigation */}
      {isOpen && (
        <nav className="border-t border-white/20 bg-brand-red-dark md:hidden">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 border-b border-white/10 px-6 py-3 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            Arena
          </Link>
          <Link
            href="/battles"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 border-b border-white/10 px-6 py-3 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            Battles
          </Link>
          <Link
            href="/leaderboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 border-b border-white/10 px-6 py-3 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            Ranking
            <span className="text-lg leading-none">↗</span>
          </Link>
          <a
            href="https://adventjs.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border-b border-white/10 px-6 py-3 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            AdventJS
            <span className="text-lg leading-none">↗</span>
          </a>
          <a
            href="https://github.com/crafter-station/advent0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border-b border-white/10 px-6 py-3 text-sm uppercase tracking-wider text-brand-beige transition-colors hover:bg-brand-red"
          >
            GitHub
            <span className="text-lg leading-none">↗</span>
          </a>
          <a
            href="https://github.com/crafter-station/exec0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-brand-beige px-6 py-3 text-sm font-bold uppercase tracking-wider text-brand-red-dark transition-colors hover:bg-brand-beige-dark"
          >
            exec0
            <span className="text-lg leading-none">↗</span>
          </a>
        </nav>
      )}
    </header>
  );
}
