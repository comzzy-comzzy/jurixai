import { Link } from "@tanstack/react-router";
import { WalletAddress } from "./WalletAddress";
import logoUrl from "@/assets/jurixai-logo.png";

export function TerminalNav() {
  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
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
          <div className="hidden md:flex items-center gap-5 text-xs font-medium text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
              All systems normal
            </div>
            <div className="hidden lg:flex items-center gap-1.5 font-mono">
              <span className="text-foreground">Block</span> 19,482,102
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <Link
            to="/hackathons"
            className="hidden sm:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse
          </Link>
          <Link
            to="/create"
            className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Host
          </Link>
          <Link
            to="/admin"
            className="hidden md:inline text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Admin
          </Link>
          <div className="hidden lg:block">
            <WalletAddress address="0x71A4f9b2C8eD3a7B5f6c9D1E2A4b8C3d5E7f3f9c" />
          </div>
          <Link
            to="/create"
            className="rounded-lg px-4 py-2 bg-accent text-accent-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            Launch app
          </Link>
        </div>
      </div>
    </nav>
  );
}
