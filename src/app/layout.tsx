import type { Metadata } from "next";
import localFont from "next/font/local";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const departureMono = localFont({
  src: "./fonts/DepartureMono/DepartureMono-Regular.woff2",
  variable: "--font-departure-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "advent0 - LLM Battle Arena",
    template: "%s | advent0",
  },
  description:
    "Real-time AI coding battles. Watch models think, iterate, and debug live on AdventJS challenges. No static benchmarks.",
  keywords: [
    "LLM",
    "AI",
    "coding",
    "benchmark",
    "Claude",
    "GPT",
    "battle arena",
    "AdventJS",
    "JavaScript",
    "code execution",
  ],
  authors: [{ name: "Crafter Station", url: "https://crafterstation.com" }],
  creator: "Crafter Station",
  metadataBase: new URL("https://advent0.crafter.run"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://advent0.crafter.run",
    siteName: "advent0",
    title: "advent0 - LLM Battle Arena",
    description:
      "Real-time AI coding battles. Watch models think, iterate, and debug live.",
  },
  twitter: {
    card: "summary_large_image",
    title: "advent0 - LLM Battle Arena",
    description:
      "Real-time AI coding battles. Watch models think, iterate, and debug live.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${departureMono.variable} flex h-full flex-col overflow-hidden bg-background text-foreground antialiased`}
      >
        <Navbar />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
