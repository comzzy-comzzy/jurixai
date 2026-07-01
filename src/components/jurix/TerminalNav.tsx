import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AccountButton } from "./AccountButton";
import logoUrl from "@/assets/jurixai-logo.png";

const NAV = [
  { to: "/hackathons", label: "Browse" },
  { to: "/create", label: "Host" },
  { to: "/admin", label: "Admin" },
  { to: "/profile", label: "Dashboard" },
] as const;

export function TerminalNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group" onClick={() => setOpen(false)}>
            <img
              src={logoUrl}
              alt="JuriXAI"
              width={28}
              height={28}
              className="size-7 object-contain"
            />
            <span className="text-xl font-bold tracking-tight leading-none">
              juri<span className="text-accent">X</span>ai
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-5 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
              All systems normal
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                activeProps={{ className: "text-sm font-semibold text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <AccountButton />

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="md:hidden grid size-9 place-items-center rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="mx-auto flex max-w-7xl flex-col px-6 py-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="border-b border-border/60 py-3 text-sm font-medium text-muted-foreground last:border-b-0 hover:text-foreground transition-colors"
                activeProps={{
                  className:
                    "border-b border-border/60 py-3 text-sm font-semibold text-foreground last:border-b-0",
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
