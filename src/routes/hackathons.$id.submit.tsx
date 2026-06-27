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
      {
        title: loaderData ? `Submit — ${loaderData.hackathon.name} — JuriXAI` : "Submit — JuriXAI",
      },
      { name: "description", content: "Submit your project for autonomous AI judging." },
    ],
  }),
  component: SubmitProject,
});

const fields = [
  { name: "projectName", label: "Project name", required: true },
  { name: "teamName", label: "Team name", required: true },
  { name: "description", label: "One-line description", required: true, textarea: true },
  { name: "githubUrl", label: "GitHub repo URL", required: true, type: "url" },
  { name: "demoUrl", label: "Live demo URL (optional)", required: false, type: "url" },
  { name: "videoUrl", label: "Video demo URL", required: true, type: "url" },
  {
    name: "teamWalletAddress",
    label: "Team wallet address (prize receipt)",
    required: true,
    mono: true,
  },
] as const;

function SubmitProject() {
  const { hackathon } = Route.useLoaderData();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="size-16 mx-auto mb-6 rounded-full bg-accent/10 text-accent grid place-items-center">
          <span className="text-2xl">✓</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-3">Submitted</h1>
        <p className="text-muted-foreground mb-2">AI judges are reviewing your project now.</p>
        <p className="text-sm text-muted-foreground mb-10">
          Verdict pipeline triggered · 5 agents dispatched
        </p>
        <div className="flex justify-center gap-3">
          <Link
            to="/hackathons/$id"
            params={{ id: hackathon.id }}
            className="rounded-lg bg-accent text-accent-foreground px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            View hackathon
          </Link>
          <button
            onClick={() => router.invalidate()}
            className="rounded-lg border border-border text-foreground px-5 py-3 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Submit another
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
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← {hackathon.name}
      </Link>
      <header className="mt-6 mb-10 border-b border-border pb-6">
        <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight mb-2">Submit project</h1>
        <p className="text-sm text-muted-foreground">→ {hackathon.name}</p>
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
            <label className="block text-sm font-medium text-foreground mb-1.5">
              {f.label}
              {f.required && <span className="text-accent ml-1">*</span>}
            </label>
            {"textarea" in f && f.textarea ? (
              <textarea
                name={f.name}
                required={f.required}
                rows={3}
                className="w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            ) : (
              <input
                name={f.name}
                required={f.required}
                type={("type" in f && f.type) || "text"}
                className={`w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${
                  "mono" in f && f.mono ? "font-mono" : ""
                }`}
              />
            )}
          </div>
        ))}
        <div className="pt-4 border-t border-border flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            Submit for judging
          </button>
          <Link
            to="/hackathons/$id"
            params={{ id: hackathon.id }}
            className="rounded-lg border border-border text-foreground px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
