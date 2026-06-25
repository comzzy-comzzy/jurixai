import { createFileRoute, Link } from "@tanstack/react-router";
import { hackathons, judges, getHackathonProjects } from "@/lib/mock-data";
import { StatsBar } from "@/components/jurix/StatsBar";
import { HackathonCard } from "@/components/jurix/HackathonCard";
import { JudgePanel } from "@/components/jurix/JudgePanel";
import { JudgeActivityFeed } from "@/components/jurix/JudgeActivityFeed";
import { Leaderboard } from "@/components/jurix/Leaderboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JuriXAI — Host a hackathon. AI agents judge it." },
      { name: "description", content: "Autonomous evaluation for onchain builders. USDC prizes distributed instantly via Circle wallets on Arc." },
      { property: "og:title", content: "JuriXAI — Autonomous hackathon judging" },
      { property: "og:description", content: "Five named AI agents score every submission. Winners paid in USDC automatically." },
    ],
  }),
  component: Home,
});

function Home() {
  const featured = hackathons.slice(0, 6);
  const leaderboardId = "solana-speedrun";
  const leaderboardProjects = getHackathonProjects(leaderboardId).slice(0, 5);
  const leaderboardHackathon = hackathons.find(h => h.id === leaderboardId)!;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
      <section className="mb-20 animate-slide-in">
        <div className="max-w-4xl">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-[0.9] text-balance mb-8">
            HOST A HACKATHON. <span className="text-muted-foreground">AI AGENTS JUDGE IT.</span>{" "}
            <span className="text-accent">WINNERS GET PAID.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium mb-10 max-w-2xl text-pretty">
            Onchain hackathon hosting where five autonomous agents score every submission and USDC prizes settle instantly via Circle wallets on Arc.
          </p>
          <div className="flex flex-wrap gap-3 mb-12">
            <Link
              to="/create"
              className="bg-accent text-accent-foreground px-5 py-3 text-xs font-mono font-bold uppercase tracking-widest"
            >
              HOST_A_HACKATHON
            </Link>
            <Link
              to="/hackathons"
              className="border border-border-dim hover:border-accent transition-colors text-foreground px-5 py-3 text-xs font-mono font-bold uppercase tracking-widest"
            >
              BROWSE_HACKATHONS
            </Link>
          </div>
          <StatsBar />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between border-b border-border-dim pb-4">
            <h2 className="text-xs font-mono tracking-widest text-muted-foreground uppercase">
              ACTIVE_HACKATHONS ({String(featured.length).padStart(2, "0")})
            </h2>
            <Link to="/hackathons" className="text-xs font-mono text-accent uppercase tracking-widest">VIEW_ALL →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((h, i) => (
              <HackathonCard
                key={h.id}
                hackathon={h}
                index={i}
                submissionCount={getHackathonProjects(h.id).length || Math.floor(20 + i * 18)}
              />
            ))}
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="sticky top-20 space-y-6">
            <JudgePanel judges={judges} />
            <JudgeActivityFeed />
          </div>
        </aside>
      </div>

      <section className="mt-24">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">
            Live Standings: <span className="text-accent">{leaderboardHackathon.name}</span>
          </h2>
          <div className="h-px flex-1 bg-border-dim" />
          <Link
            to="/hackathons/$id"
            params={{ id: leaderboardId }}
            className="text-xs font-mono text-accent uppercase tracking-widest shrink-0"
          >
            FULL_BOARD →
          </Link>
        </div>
        <Leaderboard hackathonId={leaderboardId} projects={leaderboardProjects} />
      </section>
    </div>
  );
}
