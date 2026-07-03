import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useWallet } from "@/lib/circle/useWallet";
import { createSubmission, loadHackathonDetail } from "@/lib/jurix/actions.server";

export const Route = createFileRoute("/hackathons/$id/submit")({
  loader: async ({ params }) => {
    try {
      return await loadHackathonDetail({ data: { hackathon_id: params.id } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `Submit — ${loaderData.name} — JuriXAI` : "Submit — JuriXAI" },
      { name: "description", content: "Submit your project for autonomous AI judging." },
    ],
  }),
  component: SubmitProject,
});

function SubmitProject() {
  const hackathon = Route.useLoaderData();
  const navigate = useNavigate();
  const { wallet, profile } = useWallet();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    projectName: "",
    teamName: "",
    description: "",
    githubUrl: "",
    demoUrl: "",
    videoUrl: "",
    payoutAddress: "",
  });

  useEffect(() => {
    if (wallet && !form.payoutAddress) {
      setForm((prev) => ({
        ...prev,
        payoutAddress: profile?.payoutEvmAddress || wallet.address || "",
      }));
    }
  }, [wallet, profile, form.payoutAddress]);

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in required</h1>
          <p className="text-sm text-muted-foreground mt-3 mb-6">
            You must create an account or log in to submit a project for this hackathon.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/hackathons/$id"
              params={{ id: hackathon.id }}
              className="w-full inline-flex justify-center items-center rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              Back to Hackathon
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const result = await createSubmission({
        data: {
          hackathon_id: hackathon.id,
          project_name: form.projectName,
          team_name: form.teamName,
          description: form.description,
          github_url: form.githubUrl,
          demo_url: form.demoUrl || undefined,
          video_url: form.videoUrl,
          payout_address: form.payoutAddress,
        },
      });
      await navigate({
        to: "/hackathons/$id/project/$projectId",
        params: { id: hackathon.id, projectId: result.id },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit project.");
    } finally {
      setBusy(false);
    }
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
        <h1 className="text-2xl md:text-3xl font-bold italic tracking-tight mb-2">
          Submit project
        </h1>
        <p className="text-sm text-muted-foreground">→ {hackathon.name}</p>
      </header>
      <div className="space-y-6">
        <Field
          label="Project name"
          value={form.projectName}
          onChange={(value) => setForm({ ...form, projectName: value })}
          required
        />
        <Field
          label="Team name"
          value={form.teamName}
          onChange={(value) => setForm({ ...form, teamName: value })}
          required
        />
        <Field
          label="One-line description"
          value={form.description}
          onChange={(value) => setForm({ ...form, description: value })}
          required
          textarea
        />
        <Field
          label="GitHub repo URL"
          value={form.githubUrl}
          onChange={(value) => setForm({ ...form, githubUrl: value })}
          required
          type="url"
        />
        <Field
          label="Live demo URL (optional)"
          value={form.demoUrl}
          onChange={(value) => setForm({ ...form, demoUrl: value })}
          type="url"
        />
        <Field
          label="Video demo URL (optional)"
          value={form.videoUrl}
          onChange={(value) => setForm({ ...form, videoUrl: value })}
          type="url"
        />
        <Field
          label="Team wallet address (prize receipt)"
          value={form.payoutAddress}
          onChange={(value) => setForm({ ...form, payoutAddress: value })}
          required
          mono
        />

        {error && <p className="text-sm text-warn">{error}</p>}

        <div className="pt-4 border-t border-border flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {busy ? "Submitting…" : "Submit for judging"}
          </button>
          <Link
            to="/hackathons/$id"
            params={{ id: hackathon.id }}
            className="rounded-lg border border-border text-foreground px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  textarea,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  textarea?: boolean;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
        {label}
        {required && <span className="text-accent ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea
          required={required}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      ) : (
        <input
          required={required}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${
            mono ? "font-mono" : ""
          }`}
        />
      )}
    </div>
  );
}
