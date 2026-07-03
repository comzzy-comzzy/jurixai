import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { createHackathon, loadHomeData } from "@/lib/jurix/actions.server";
import { useWallet } from "@/lib/circle/useWallet";

export const Route = createFileRoute("/create")({
  loader: () => loadHomeData(),
  head: () => ({
    meta: [
      { title: "Host a Hackathon — JuriXAI" },
      {
        name: "description",
        content:
          "Spin up an autonomous hackathon: define criteria, fund a Circle wallet, and let AI agents handle judging.",
      },
    ],
  }),
  component: CreateHackathon,
});

type Criterion = {
  id: string;
  name: string;
  description: string;
  weight: number;
  agentId: string;
};

function buildHackathonDescription(
  summary: string,
  submissionInstructions: string,
  requiredDeliverables: string[],
) {
  const deliverables = requiredDeliverables
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `- ${item}`)
    .join("\n");

  return [
    summary.trim(),
    "",
    "Submission Instructions:",
    submissionInstructions.trim(),
    "",
    "Required Deliverables:",
    deliverables || "- Not provided",
  ].join("\n");
}

function CreateHackathon() {
  const { wallet, profile } = useWallet();
  const navigate = useNavigate();
  const { active_agents } = Route.useLoaderData();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    organizerName: "",
    organizerEmail: "",
    description: "",
    submissionInstructions: "",
    requiredDeliverables: [
      "GitHub repository",
      "Problem solved and target users",
      "How to run or test the agent",
      "Optional live demo or walkthrough video",
    ],
    startDate: "",
    deadline: "",
    prizePoolUsdc: "50",
    winnerSplit: ["50", "30", "20"],
  });

  useEffect(() => {
    if (wallet && !form.organizerEmail) {
      setForm((prev) => ({
        ...prev,
        organizerEmail: wallet.identifier,
        organizerName: prev.organizerName || profile?.displayName || "",
      }));
    }
  }, [wallet, profile, form.organizerEmail]);

  const defaultAgents = active_agents.slice(0, 4);
  const [criteria, setCriteria] = useState<Criterion[]>(
    defaultAgents.map((agent, index) => ({
      id: `c${index + 1}`,
      name:
        index === 0
          ? "Technical Quality"
          : index === 1
            ? "Product Value"
            : index === 2
              ? "Originality"
              : "Documentation & Delivery",
      description: "",
      weight: agent.weight_percent,
      agentId: agent.id,
    })),
  );

  const steps = ["Basics", "Prize pool", "Criteria", "Review"];
  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);

  const durationDays = form.startDate && form.deadline
    ? Math.ceil((new Date(form.deadline).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const extraMonths = durationDays > 0 ? Math.floor(durationDays / 30) : 0;
  const adminFee = 1000 + (extraMonths * 100);
  const totalFunding = Number(form.prizePoolUsdc || 0) + adminFee;

  async function handleCreate() {
    setBusy(true);
    setError(null);
    try {
      const result = await createHackathon({
        data: {
          name: form.name,
          description: buildHackathonDescription(
            form.description,
            form.submissionInstructions,
            form.requiredDeliverables,
          ),
          organizer_name: form.organizerName,
          organizer_email: form.organizerEmail,
          prize_pool_usdc: Number(form.prizePoolUsdc),
          start_date: form.startDate,
          deadline: form.deadline,
          winner_split: form.winnerSplit.map((value) => Number(value)),
          criteria: criteria.map((criterion) => ({
            name: criterion.name,
            description: criterion.description,
            weight_percent: criterion.weight,
            agent_id: criterion.agentId,
          })),
        },
      });
      await navigate({ to: "/hackathons/$id", params: { id: result.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hackathon.");
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in required</h1>
          <p className="text-sm text-muted-foreground mt-3 mb-6">
            You must create an account or log in to host a hackathon on JuriXAI.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              to="/"
              className="w-full inline-flex justify-center items-center rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold italic tracking-tight mb-3">
          Host a hackathon
        </h1>
        <p className="text-muted-foreground max-w-xl">
          Four steps. Configure real judging criteria and create a live event in Supabase.
        </p>
      </header>

      <div className="flex gap-1 mb-8 rounded-lg border border-border bg-muted p-1">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`flex-1 px-3 py-2 text-xs font-semibold text-center rounded-md transition-colors ${
              index === step
                ? "bg-accent text-accent-foreground shadow-sm"
                : index < step
                  ? "text-accent"
                  : "text-muted-foreground"
            }`}
          >
            <span className="opacity-60 mr-1">{index + 1}</span>
            {label}
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {step === 0 && (
          <>
            <Field
              label="Hackathon name"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              required
            />
            <Field
              label="Organizer name"
              value={form.organizerName}
              onChange={(value) => setForm({ ...form, organizerName: value })}
              required
            />
            <Field
              label="Organizer email"
              type="email"
              value={form.organizerEmail}
              onChange={(value) => setForm({ ...form, organizerEmail: value })}
              required
            />
            <Field
              label="Description"
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value })}
              required
              textarea
            />
            <Field
              label="Submission instructions"
              value={form.submissionInstructions}
              onChange={(value) => setForm({ ...form, submissionInstructions: value })}
              required
              textarea
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Required deliverables
                <span className="text-accent ml-1">*</span>
              </label>
              <div className="space-y-2">
                {form.requiredDeliverables.map((value, index) => (
                  <input
                    key={index}
                    value={value}
                    onChange={(e) => {
                      const next = [...form.requiredDeliverables];
                      next[index] = e.target.value;
                      setForm({ ...form, requiredDeliverables: next });
                    }}
                    className="w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Start date"
                type="date"
                value={form.startDate}
                onChange={(value) => setForm({ ...form, startDate: value })}
                required
              />
              <Field
                label="Submission deadline"
                type="date"
                value={form.deadline}
                onChange={(value) => setForm({ ...form, deadline: value })}
                required
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Field
              label="Prize pool (USDC)"
              type="number"
              value={form.prizePoolUsdc}
              onChange={(value) => setForm({ ...form, prizePoolUsdc: value })}
              required
              mono
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Winner split (% by rank)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {form.winnerSplit.map((value, index) => (
                  <input
                    key={index}
                    value={value}
                    type="number"
                    onChange={(e) => {
                      const next = [...form.winnerSplit];
                      next[index] = e.target.value;
                      setForm({ ...form, winnerSplit: next });
                    }}
                    className="rounded-lg bg-background border border-border px-3.5 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-5 text-sm space-y-3">
              <p className="font-semibold text-accent mb-1 text-base">Payment & Funding Calculation</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Hosting a hackathon requires funding the prize pool + a platform fee in **Arc USDC**. 
                The platform fee includes a flat $1,000 base fee, plus an extra 10% ($100) for each full month of duration.
              </p>
              
              <div className="grid grid-cols-2 gap-y-2 border-t border-b border-border/80 py-3 font-mono text-xs text-foreground">
                <span className="text-muted-foreground">Prize Pool:</span>
                <span className="text-right font-bold">{Number(form.prizePoolUsdc || 0).toLocaleString()} USDC</span>
                
                <span className="text-muted-foreground">Flat Admin Fee:</span>
                <span className="text-right">1,000 USDC</span>

                <span className="text-muted-foreground">Duration Extra Fee ({durationDays} days):</span>
                <span className="text-right">{(extraMonths * 100).toLocaleString()} USDC</span>

                <span className="text-foreground font-semibold text-sm">Total Required Funding:</span>
                <span className="text-right font-bold text-accent text-sm">{totalFunding.toLocaleString()} USDC</span>
              </div>

              <p className="text-xs text-muted-foreground italic leading-relaxed">
                Note: Upon deployment, your hackathon details will be published and pending funding. 
                You will be prompted to deposit the total required **Arc USDC** to your dedicated Treasury Address, 
                visible on the hackathon details page.
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">Criteria · weight total</span>
              <span className={totalWeight === 100 ? "text-accent" : "text-warn"}>
                {totalWeight}% / 100%
              </span>
            </div>
            {criteria.map((criterion, index) => (
              <div
                key={criterion.id}
                className="rounded-xl border border-border bg-card p-4 grid grid-cols-12 gap-3 items-center shadow-sm"
              >
                <input
                  value={criterion.name}
                  onChange={(e) =>
                    setCriteria(
                      criteria.map((item, i) =>
                        i === index ? { ...item, name: e.target.value } : item,
                      ),
                    )
                  }
                  className="col-span-4 bg-transparent border-b border-border px-1 py-1 text-sm font-medium focus:outline-none focus:border-accent"
                />
                <input
                  value={criterion.description}
                  onChange={(e) =>
                    setCriteria(
                      criteria.map((item, i) =>
                        i === index ? { ...item, description: e.target.value } : item,
                      ),
                    )
                  }
                  placeholder="What this judge should inspect"
                  className="col-span-4 rounded-lg bg-background border border-border px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent"
                />
                <select
                  value={criterion.agentId}
                  onChange={(e) =>
                    setCriteria(
                      criteria.map((item, i) =>
                        i === index ? { ...item, agentId: e.target.value } : item,
                      ),
                    )
                  }
                  className="col-span-2 rounded-lg bg-background border border-border px-2 py-1.5 text-xs font-medium text-ai focus:outline-none focus:border-accent"
                >
                  {active_agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={criterion.weight}
                  onChange={(e) =>
                    setCriteria(
                      criteria.map((item, i) =>
                        i === index ? { ...item, weight: Number(e.target.value) } : item,
                      ),
                    )
                  }
                  className="col-span-2 rounded-lg bg-background border border-border px-2 py-1.5 text-sm font-mono text-accent text-right focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="rounded-xl border border-border bg-card p-6 text-sm space-y-3 shadow-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Judges</span>
              <span className="font-medium text-ai">{active_agents.length} agents available</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criteria</span>
              <span className="font-medium">{criteria.length} defined</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Required deliverables</span>
              <span className="font-medium">
                {form.requiredDeliverables.filter(Boolean).length} listed
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight total</span>
              <span className={`font-medium ${totalWeight === 100 ? "text-accent" : "text-warn"}`}>
                {totalWeight}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pipeline</span>
              <span className="font-medium">Submit → Score → Settle</span>
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Prize pool:</span>
                <span className="font-semibold tabular-nums">{Number(form.prizePoolUsdc || 0).toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Flat platform fee:</span>
                <span className="font-semibold tabular-nums">1,000 USDC</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Duration extra fee ({durationDays} days):</span>
                <span className="font-semibold tabular-nums">{(extraMonths * 100).toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-accent pt-1 border-t border-dashed border-border">
                <span className="text-foreground">Total required funding:</span>
                <span className="tabular-nums">{totalFunding.toLocaleString()} USDC</span>
              </div>
            </div>
            <p className="text-muted-foreground pt-3 border-t border-border leading-relaxed text-xs">
              This will create a live hackathon row and its judging criteria in Supabase
              immediately.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-warn">{error}</p>}

        <div className="pt-4 border-t border-border flex justify-between">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || busy}
            className="rounded-lg border border-border text-foreground px-5 py-3 text-sm font-semibold disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ← Back
          </button>
          {step === steps.length - 1 ? (
            <button
              type="button"
              onClick={handleCreate}
              disabled={busy}
              className="rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {busy ? "Creating…" : "Deploy hackathon"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              Continue →
            </button>
          )}
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
