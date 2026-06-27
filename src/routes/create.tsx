import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { judges } from "@/lib/mock-data";

export const Route = createFileRoute("/create")({
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
  assignedJudge: string;
};

function CreateHackathon() {
  const [step, setStep] = useState(0);
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: "c1", name: "Technical Quality", description: "", weight: 30, assignedJudge: "Vex" },
    { id: "c2", name: "Originality", description: "", weight: 25, assignedJudge: "Oryn" },
    { id: "c3", name: "Architecture", description: "", weight: 20, assignedJudge: "Kael" },
    { id: "c4", name: "Demo Polish", description: "", weight: 15, assignedJudge: "Zera" },
    { id: "c5", name: "Agent Integration", description: "", weight: 10, assignedJudge: "Dusk" },
  ]);
  const [done, setDone] = useState(false);

  const steps = ["Basics", "Prize pool", "Criteria", "Review"];
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="size-16 mx-auto mb-6 rounded-full bg-accent/10 text-accent grid place-items-center text-2xl">
          ✓
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-3">Hackathon created</h1>
        <p className="text-muted-foreground mb-1">Circle wallet provisioned. AI judges armed.</p>
        <p className="text-sm text-muted-foreground mb-10">
          Awaiting USDC funding → goes live on confirmation
        </p>
        <Link
          to="/hackathons"
          className="inline-flex rounded-lg bg-accent text-accent-foreground px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          Browse hackathons
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">Host a hackathon</h1>
        <p className="text-muted-foreground max-w-xl">
          Four steps. No human judges. Prizes settle automatically when the deadline expires.
        </p>
      </header>

      <div className="flex gap-1 mb-8 rounded-lg border border-border bg-muted p-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 px-3 py-2 text-xs font-semibold text-center rounded-md transition-colors ${
              i === step
                ? "bg-accent text-accent-foreground shadow-sm"
                : i < step
                  ? "text-accent"
                  : "text-muted-foreground"
            }`}
          >
            <span className="opacity-60 mr-1">{i + 1}</span>
            {s}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < steps.length - 1) setStep(step + 1);
          else setDone(true);
        }}
        className="space-y-6"
      >
        {step === 0 && (
          <>
            <Field label="Hackathon name" required />
            <Field label="Organizer name" required />
            <Field label="Description" required textarea />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start date" type="date" required />
              <Field label="Submission deadline" type="date" required />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Prize pool (USDC)" type="number" required mono />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Winner split (% by rank)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[60, 30, 10].map((v, i) => (
                  <input
                    key={i}
                    defaultValue={v}
                    type="number"
                    className="rounded-lg bg-background border border-border px-3.5 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-accent mb-1">Circle wallet</p>A new Circle wallet
              will be provisioned on Arc. Fund it after creation; the hackathon goes live on
              confirmation.
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
            {criteria.map((c, idx) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-card p-4 grid grid-cols-12 gap-3 items-center shadow-sm"
              >
                <input
                  value={c.name}
                  onChange={(e) =>
                    setCriteria(
                      criteria.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  className="col-span-5 bg-transparent border-b border-border px-1 py-1 text-sm font-medium focus:outline-none focus:border-accent"
                />
                <select
                  value={c.assignedJudge}
                  onChange={(e) =>
                    setCriteria(
                      criteria.map((x, i) =>
                        i === idx
                          ? { ...x, assignedJudge: e.target.value as Criterion["assignedJudge"] }
                          : x,
                      ),
                    )
                  }
                  className="col-span-4 rounded-lg bg-background border border-border px-2 py-1.5 text-xs font-medium text-ai focus:outline-none focus:border-accent"
                >
                  {judges.map((j) => (
                    <option key={j.name} value={j.name}>
                      {j.name} — {j.focus}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={c.weight}
                  onChange={(e) =>
                    setCriteria(
                      criteria.map((x, i) =>
                        i === idx ? { ...x, weight: Number(e.target.value) } : x,
                      ),
                    )
                  }
                  className="col-span-3 rounded-lg bg-background border border-border px-2 py-1.5 text-sm font-mono text-accent text-right focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="rounded-xl border border-border bg-card p-6 text-sm space-y-3 shadow-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Judges</span>
              <span className="font-medium text-ai">5 agents ready</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criteria</span>
              <span className="font-medium">{criteria.length} defined</span>
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
            <p className="text-muted-foreground pt-3 border-t border-border leading-relaxed">
              On submit, a Circle wallet is provisioned. Builders submit. The 5 agents score every
              project. At deadline, USDC settles to winner wallets — no human signoff.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-border flex justify-between">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="rounded-lg border border-border text-foreground px-5 py-3 text-sm font-semibold disabled:opacity-40 hover:bg-muted transition-colors"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            {step === steps.length - 1 ? "Deploy hackathon" : "Continue →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  textarea,
  type = "text",
  mono,
}: {
  label: string;
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
          className="w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      ) : (
        <input
          required={required}
          type={type}
          className={`w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 ${mono ? "font-mono" : ""}`}
        />
      )}
    </div>
  );
}
