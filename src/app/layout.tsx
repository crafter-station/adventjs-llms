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
  title: "AdventJS LLM Battle",
  description:
    "Watch AI models compete head-to-head solving coding challenges from AdventJS 2025",
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
