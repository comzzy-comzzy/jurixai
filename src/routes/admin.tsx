import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { hackathons, getHackathonProjects, ADMIN_PASSWORD } from "@/lib/mock-data";
import { StatusPill } from "@/components/jurix/StatusPill";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { fullUsdc, relativeDate } from "@/lib/format";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — JuriXAI" },
      { name: "description", content: "JuriXAI operator console." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto px-6 py-24">
        <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-3">RESTRICTED</p>
        <h1 className="text-3xl font-extrabold tracking-tighter mb-6">OPERATOR_CONSOLE</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pwd === ADMIN_PASSWORD) setAuthed(true);
            else setErr("ACCESS_DENIED");
          }}
          className="space-y-4"
        >
          <input
            type="password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setErr(""); }}
            placeholder="ADMIN_PASSWORD"
            className="w-full bg-transparent border border-border-dim px-3 py-2 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-accent"
          />
          {err && <p className="text-warn font-mono text-xs uppercase tracking-widest">{err}</p>}
          <button className="w-full bg-accent text-accent-foreground px-5 py-3 text-xs font-mono font-bold uppercase tracking-widest">
            AUTHENTICATE
          </button>
          <p className="text-[10px] font-mono text-muted-foreground text-center pt-2">
            HINT: jurixai2026
          </p>
        </form>
      </div>
    );
  }

  const totalPool = hackathons.reduce((s, h) => s + h.prizePoolUsdc, 0);
  const totalSubs = hackathons.reduce((s, h) => s + getHackathonProjects(h.id).length, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-10 border-b border-border-dim pb-6">
        <p className="text-[10px] font-mono uppercase tracking-widest text-accent mb-2">OPERATOR_CONSOLE</p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">ADMIN_DASHBOARD</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border-dim border border-border-dim mb-10">
        {[
          { l: "HACKATHONS", v: String(hackathons.length).padStart(2, "0") },
          { l: "SUBMISSIONS", v: String(totalSubs).padStart(3, "0") },
          { l: "POOL_TOTAL", v: `${fullUsdc(totalPool)} USDC` },
          { l: "AGENTS_ONLINE", v: "5 / 5" },
        ].map((s) => (
          <div key={s.l} className="bg-background p-5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">{s.l}</p>
            <p className="text-xl font-bold tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>

      <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">HACKATHON_REGISTRY</h2>
      <div className="border border-border-dim overflow-x-auto">
        <table className="w-full font-mono text-xs min-w-[800px]">
          <thead className="border-b border-border-dim text-left text-muted-foreground">
            <tr>
              <th className="p-3 font-normal">NAME</th>
              <th className="p-3 font-normal">STATUS</th>
              <th className="p-3 font-normal">POOL</th>
              <th className="p-3 font-normal">SUBS</th>
              <th className="p-3 font-normal">DEADLINE</th>
              <th className="p-3 font-normal">WALLET</th>
              <th className="p-3 font-normal text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-dim">
            {hackathons.map((h) => (
              <tr key={h.id}>
                <td className="p-3 font-bold text-foreground">{h.name}</td>
                <td className="p-3"><StatusPill status={h.status} /></td>
                <td className="p-3 tabular-nums text-accent">{fullUsdc(h.prizePoolUsdc)}</td>
                <td className="p-3 tabular-nums">{getHackathonProjects(h.id).length}</td>
                <td className="p-3 text-muted-foreground">{relativeDate(h.deadline)}</td>
                <td className="p-3"><WalletAddress address={h.circleWalletAddress} /></td>
                <td className="p-3 text-right">
                  <button className="border border-border-dim px-2 py-1 hover:border-accent transition-colors uppercase">
                    SETTLE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-right">
        <button
          onClick={() => setAuthed(false)}
          className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-warn"
        >
          LOG_OUT →
        </button>
      </div>
    </div>
  );
}
