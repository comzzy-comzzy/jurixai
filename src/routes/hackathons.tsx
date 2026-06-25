import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { hackathons, getHackathonProjects, type HackathonStatus } from "@/lib/mock-data";
import { HackathonCard } from "@/components/jurix/HackathonCard";

export const Route = createFileRoute("/hackathons")({
  head: () => ({
    meta: [
      { title: "Browse Hackathons — JuriXAI" },
      { name: "description", content: "Browse every active, judging, and closed hackathon on JuriXAI. Filter by status and search by name." },
      { property: "og:title", content: "Browse Hackathons — JuriXAI" },
      { property: "og:description", content: "Every onchain hackathon judged by autonomous AI agents." },
    ],
  }),
  component: BrowseHackathons,
});

const filters: { label: string; value: "all" | HackathonStatus }[] = [
  { label: "ALL", value: "all" },
  { label: "OPEN", value: "open" },
  { label: "JUDGING", value: "judging" },
  { label: "CLOSED", value: "closed" },
];

function BrowseHackathons() {
  const [filter, setFilter] = useState<"all" | HackathonStatus>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return hackathons.filter((h) => {
      if (filter !== "all" && h.status !== filter) return false;
      if (query && !h.name.toLowerCase().includes(query.toLowerCase()) && !h.organizerName.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-3">
          BROWSE_HACKATHONS
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Filter every onchain hackathon judged by autonomous AI agents.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between border-y border-border-dim py-4 mb-8">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-widest border transition-colors ${
                filter === f.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border-dim text-muted-foreground hover:border-accent hover:text-accent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="SEARCH_BY_NAME..."
          className="w-full md:w-72 bg-transparent border border-border-dim px-3 py-2 text-xs font-mono uppercase tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
        />
      </div>

      {visible.length === 0 ? (
        <div className="border border-border-dim p-12 text-center font-mono text-muted-foreground text-sm">
          NO_HACKATHONS_MATCH_FILTER
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((h, i) => (
            <HackathonCard
              key={h.id}
              hackathon={h}
              index={i}
              submissionCount={getHackathonProjects(h.id).length || Math.floor(20 + i * 18)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
