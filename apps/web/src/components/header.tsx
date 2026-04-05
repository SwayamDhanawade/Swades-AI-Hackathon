"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AudioWaveform, Mic } from "lucide-react";
import { ModeToggle } from "./mode-toggle";

export default function Header() {
  const pathname = usePathname();

  const links = [
    { to: "/", label: "Home", icon: AudioWaveform },
    { to: "/recorder", label: "Recorder", icon: Mic },
  ] as const;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <AudioWaveform className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold">Swades AI</span>
        </div>

        <nav className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const isActive = pathname === to;
            return (
              <Link
                key={to}
                href={to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors                 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <ModeToggle />
      </div>
    </header>
  );
}
