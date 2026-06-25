import { Link } from "@tanstack/react-router";
import { WalletAddress } from "./WalletAddress";

export function TerminalNav() {
  return (
    <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border-dim">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-8">
          <Link to="/" className="font-black tracking-tighter text-xl uppercase">
            JuriX<span className="text-accent">AI</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-[10px] font-mono tracking-widest text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
              SYSTEM_OK
            </div>
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-foreground">BLOCK:</span> 19,482,102
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-5">
          <Link to="/hackathons" className="hidden sm:inline text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors">
            Browse
          </Link>
          <Link to="/create" className="hidden md:inline text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors">
            Host
          </Link>
          <Link to="/admin" className="hidden md:inline text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-accent transition-colors">
            Admin
          </Link>
          <div className="hidden lg:block">
            <WalletAddress address="0x71A4f9b2C8eD3a7B5f6c9D1E2A4b8C3d5E7f3f9c" />
          </div>
          <Link
            to="/create"
            className="px-3 py-1.5 bg-accent text-accent-foreground text-[11px] font-mono font-bold tracking-wider"
          >
            LAUNCH_APP
          </Link>
        </div>
      </div>
    </nav>
  );
}
