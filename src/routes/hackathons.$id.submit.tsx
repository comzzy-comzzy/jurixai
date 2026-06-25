import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getHackathon } from "@/lib/mock-data";

export const Route = createFileRoute("/hackathons/$id/submit")({
  loader: ({ params }) => {
    const h = getHackathon(params.id);
    if (!h) throw notFound();
    return { hackathon: h };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Submit — ${loaderData.hackathon.name} — JuriXAI` : "Submit — JuriXAI" },
      { name: "description", content: "Submit your project for autonomous AI judging." },
    ],
  }),
  component: SubmitProject,
});

const fields = [
  { name: "projectName", label: "PROJECT_NAME", required: true },
  { name: "teamName", label: "TEAM_NAME", required: true },
  { name: "description", label: "ONE_LINE_DESCRIPTION", required: true, textarea: true },
  { name: "githubUrl", label: "GITHUB_REPO_URL", required: true, type: "url" },
  { name: "demoUrl", label: "LIVE_DEMO_URL (OPTIONAL)", required: false, type: "url" },
  { name: "videoUrl", label: "VIDEO_DEMO_URL", required: true, type: "url" },
  { name: "teamWalletAddress", label: "TEAM_WALLET_ADDRESS (PRIZE_RECEIPT)", required: true, mono: true },
] as const;

function SubmitProject() {
  const { hackathon } = Route.useLoaderData();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center font-mono">
        <div className="size-16 mx-auto mb-6 border border-accent text-accent grid place-items-center">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-3 uppercase">SUBMITTED</h1>
        <p className="text-muted-foreground mb-2">AI judges are reviewing your project now.</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-10">
          VERDICT_PIPELINE_TRIGGERED · 5_AGENTS_DISPATCHED
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/hackathons/$id"
            params={{ id: hackathon.id }}
            className="bg-accent text-accent-foreground px-5 py-3 text-xs font-bold uppercase tracking-widest"
          >
            VIEW_HACKATHON
          </Link>
          <button
            onClick={() => router.invalidate()}
            className="border border-border-dim text-foreground px-5 py-3 text-xs font-bold uppercase tracking-widest hover:border-accent transition-colors"
          >
            SUBMIT_ANOTHER
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link
        to="/hackathons/$id"
        params={{ id: hackathon.id }}
        className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-accent"
      >
        ← {hackathon.name}
      </Link>
      <header className="mt-6 mb-10 border-b border-border-dim pb-6">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter mb-2">SUBMIT_PROJECT</h1>
        <p className="text-sm text-muted-foreground font-mono">→ {hackathon.name.toUpperCase()}</p>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="space-y-6"
      >
        {fields.map((f) => (
          <div key={f.name}>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              {f.label}{f.required && <span className="text-accent ml-1">*</span>}
            </label>
            {"textarea" in f && f.textarea ? (
              <textarea
                name={f.name}
                required={f.required}
                rows={3}
                className="w-full bg-transparent border border-border-dim px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            ) : (
              <input
                name={f.name}
                required={f.required}
                type={("type" in f && f.type) || "text"}
                className={`w-full bg-transparent border border-border-dim px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent ${
                  "mono" in f && f.mono ? "font-mono" : ""
                }`}
              />
            )}
          </div>
        ))}
        <div className="pt-4 border-t border-border-dim flex flex-wrap gap-3">
          <button
            type="submit"
            className="bg-accent text-accent-foreground px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest"
          >
            SUBMIT_FOR_JUDGING
          </button>
          <Link
            to="/hackathons/$id"
            params={{ id: hackathon.id }}
            className="border border-border-dim text-muted-foreground px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest hover:text-foreground hover:border-accent transition-colors"
          >
            CANCEL
          </Link>
        </div>
      </form>
    </div>
  );
}
