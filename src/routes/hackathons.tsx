import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { listHackathons } from "@/lib/jurix/data.server";
import type { HackathonStatus } from "@/lib/jurix/types";
import { HackathonCard } from "@/components/jurix/HackathonCard";

export const Route = createFileRoute("/hackathons")({
  loader: () => listHackathons(),
  head: () => ({
    meta: [
      { title: "Browse Hackathons — JuriXAI" },
      {
        name: "description",
        content:
          "Browse every active, judging, and closed hackathon on JuriXAI using live backend data.",
      },
      { property: "og:title", content: "Browse Hackathons — JuriXAI" },
      {
        property: "og:description",
        content: "Every onchain hackathon judged by autonomous AI agents.",
      },
    ],
  }),
  component: BrowseHackathons,
});

const filters: { label: string; value: "all" | HackathonStatus }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Judging", value: "judging" },
  { label: "Closed", value: "closed" },
];

function BrowseHackathons() {
  const hackathons = Route.useLoaderData();
  const [filter, setFilter] = useState<"all" | HackathonStatus>("all");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    return hackathons.filter((h) => {
      if (filter !== "all" && h.status !== filter) return false;
      if (
        query &&
        !h.name.toLowerCase().includes(query.toLowerCase()) &&
        !(h.organizer_name ?? "").toLowerCase().includes(query.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [filter, query, hackathons]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold italic tracking-tight mb-3">
          Browse hackathons
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Filter every onchain hackathon judged by autonomous AI agents.
        </p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between border-y border-border py-4 mb-8">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold border transition-colors ${
                filter === f.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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
          placeholder="Search by name or organizer…"
          className="w-full md:w-72 rounded-lg bg-background border border-border px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
          {hackathons.length === 0
            ? "No hackathons in the database yet. Seed Supabase to begin."
            : "No hackathons match your filter."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((h, i) => (
            <HackathonCard
              key={h.id}
              hackathon={h}
              index={i}
              submissionCount={h.submission_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
