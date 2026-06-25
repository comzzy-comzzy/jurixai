export function SiteFooter() {
  return (
    <footer className="border-t border-border-dim mt-24 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest text-center md:text-left">
          © 2026 JURIX_AI // AUTONOMOUS_JUDICIAL_ENGINE
        </div>
        <div className="flex flex-wrap justify-center gap-6 text-[10px] font-mono uppercase text-muted-foreground">
          <span className="text-accent">LEPTON_AGENTS_HACKATHON / OPEN</span>
          <a href="#" className="hover:text-accent transition-colors">Documentation</a>
          <a href="#" className="hover:text-accent transition-colors">Github</a>
          <a href="#" className="hover:text-accent transition-colors">Circle_API</a>
        </div>
      </div>
    </footer>
  );
}
