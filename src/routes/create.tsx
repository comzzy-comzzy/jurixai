import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { judges } from "@/lib/mock-data";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Host a Hackathon — JuriXAI" },
      { name: "description", content: "Spin up an autonomous hackathon: define criteria, fund a Circle wallet, and let AI agents handle judging." },
    ],
  }),
  component: CreateHackathon,
});

type Criterion = { id: string; name: string; description: string; weight: number; assignedJudge: string };

function CreateHackathon() {
  const [step, setStep] = useState(0);
  const [criteria, setCriteria] = useState<Criterion[]>([
    { id: "c1", name: "Technical Quality", description: "", weight: 30, assignedJudge: "Vex" },
    { id: "c2", name: "Originality",       description: "", weight: 25, assignedJudge: "Oryn" },
    { id: "c3", name: "Architecture",      description: "", weight: 20, assignedJudge: "Kael" },
    { id: "c4", name: "Demo Polish",       description: "", weight: 15, assignedJudge: "Zera" },
    { id: "c5", name: "Agent Integration", description: "", weight: 10, assignedJudge: "Dusk" },
  ]);
  const [done, setDone] = useState(false);

  const steps = ["BASICS", "PRIZE_POOL", "CRITERIA", "REVIEW"];
  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);

  if (done) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center font-mono">
        <div className="size-16 mx-auto mb-6 border border-accent text-accent grid place-items-center text-2xl">✓</div>
        <h1 className="text-2xl font-bold tracking-tight mb-3 uppercase">HACKATHON_CREATED</h1>
        <p className="text-muted-foreground mb-1">Circle wallet provisioned. AI judges armed.</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-10">
          AWAITING_USDC_FUNDING → GOES_LIVE_ON_CONFIRMATION
        </p>
        <Link to="/hackathons" className="bg-accent text-accent-foreground px-5 py-3 text-xs font-bold uppercase tracking-widest">
          BROWSE_HACKATHONS
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl md:text-4xl font-headline italic font-normal tracking-tight mb-3">HOST_A_HACKATHON</h1>
        <p className="text-muted-foreground max-w-xl">
          Four steps. No human judges. Prizes settle automatically when the deadline expires.
        </p>
      </header>

      <div className="flex border border-border-dim mb-8">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex-1 px-3 py-3 text-[10px] font-mono uppercase tracking-widest text-center border-r last:border-r-0 border-border-dim ${
              i === step ? "bg-accent text-accent-foreground" : i < step ? "text-accent" : "text-muted-foreground"
            }`}
          >
            <span className="opacity-60 mr-1">0{i + 1}</span>{s}
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
            <Field label="HACKATHON_NAME" required />
            <Field label="ORGANIZER_NAME" required />
            <Field label="DESCRIPTION" required textarea />
            <div className="grid grid-cols-2 gap-4">
              <Field label="START_DATE" type="date" required />
              <Field label="SUBMISSION_DEADLINE" type="date" required />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="PRIZE_POOL_USDC" type="number" required mono />
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                WINNER_SPLIT (% / RANK)
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[60, 30, 10].map((v, i) => (
                  <input
                    key={i}
                    defaultValue={v}
                    type="number"
                    className="bg-transparent border border-border-dim px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-accent"
                  />
                ))}
              </div>
            </div>
            <div className="border border-accent/40 bg-accent/5 p-4 font-mono text-[11px] text-muted-foreground">
              <p className="text-accent uppercase tracking-widest mb-1">CIRCLE_WALLET</p>
              A new Circle wallet will be provisioned on Arc. Fund it after creation; the hackathon goes live on confirmation.
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
              <span className="text-muted-foreground">CRITERIA · WEIGHT_TOTAL</span>
              <span className={totalWeight === 100 ? "text-accent" : "text-warn"}>{totalWeight}% / 100%</span>
            </div>
            {criteria.map((c, idx) => (
              <div key={c.id} className="border border-border-dim p-4 grid grid-cols-12 gap-3 items-center">
                <input
                  value={c.name}
                  onChange={(e) => setCriteria(criteria.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                  className="col-span-5 bg-transparent border-b border-border-dim px-1 py-1 text-sm focus:outline-none focus:border-accent"
                />
                <select
                  value={c.assignedJudge}
                  onChange={(e) => setCriteria(criteria.map((x, i) => i === idx ? { ...x, assignedJudge: e.target.value as Criterion["assignedJudge"] } : x))}
                  className="col-span-4 bg-background border border-border-dim px-2 py-1 text-xs font-mono uppercase tracking-widest text-ai focus:outline-none focus:border-accent"
                >
                  {judges.map((j) => (
                    <option key={j.name} value={j.name}>{j.name.toUpperCase()} — {j.focus}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={c.weight}
                  onChange={(e) => setCriteria(criteria.map((x, i) => i === idx ? { ...x, weight: Number(e.target.value) } : x))}
                  className="col-span-3 bg-transparent border border-border-dim px-2 py-1 text-xs font-mono text-accent text-right focus:outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="border border-border-dim p-6 font-mono text-xs space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">JUDGES</span><span className="text-ai">5_AGENTS_READY</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CRITERIA</span><span>{criteria.length}_DEFINED</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">WEIGHT_TOTAL</span><span className={totalWeight === 100 ? "text-accent" : "text-warn"}>{totalWeight}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">PIPELINE</span><span>SUBMIT → SCORE → SETTLE</span></div>
            <p className="text-muted-foreground pt-3 border-t border-border-dim leading-relaxed">
              On submit, a Circle wallet is provisioned. Builders submit. The 5 agents score every project. At deadline, USDC settles to winner wallets — no human signoff.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-border-dim flex justify-between">
          <button
            type="button"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="border border-border-dim text-muted-foreground px-5 py-3 text-xs font-mono font-bold uppercase tracking-widest disabled:opacity-40 hover:text-foreground hover:border-accent transition-colors"
          >
            ← BACK
          </button>
          <button
            type="submit"
            className="bg-accent text-accent-foreground px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest"
          >
            {step === steps.length - 1 ? "DEPLOY_HACKATHON" : "CONTINUE →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, textarea, type = "text", mono }: { label: string; required?: boolean; textarea?: boolean; type?: string; mono?: boolean }) {
  return (
    <div>
      <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        {label}{required && <span className="text-accent ml-1">*</span>}
      </label>
      {textarea ? (
        <textarea required={required} rows={3} className="w-full bg-transparent border border-border-dim px-3 py-2 text-sm focus:outline-none focus:border-accent" />
      ) : (
        <input required={required} type={type} className={`w-full bg-transparent border border-border-dim px-3 py-2 text-sm focus:outline-none focus:border-accent ${mono ? "font-mono" : ""}`} />
      )}
    </div>
  );
}
