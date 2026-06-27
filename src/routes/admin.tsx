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
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-3">Restricted</p>
        <h1 className="text-2xl font-bold italic tracking-tight mb-6">Operator console</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pwd === ADMIN_PASSWORD) setAuthed(true);
            else setErr("Access denied");
          }}
          className="space-y-4"
        >
          <input
            type="password"
            value={pwd}
            onChange={(e) => {
              setPwd(e.target.value);
              setErr("");
            }}
            placeholder="Admin password"
            className="w-full rounded-lg bg-background border border-border px-3.5 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {err && <p className="text-warn text-sm font-medium">{err}</p>}
          <button className="w-full rounded-lg bg-accent text-accent-foreground px-5 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity">
            Authenticate
          </button>
          <p className="text-xs text-muted-foreground text-center pt-2">Hint: jurixai2026</p>
        </form>
      </div>
    );
  }

  const totalPool = hackathons.reduce((s, h) => s + h.prizePoolUsdc, 0);
  const totalSubs = hackathons.reduce((s, h) => s + getHackathonProjects(h.id).length, 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-10 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-2">
          Operator console
        </p>
        <h1 className="text-3xl md:text-4xl font-bold italic tracking-tight">Admin dashboard</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { l: "Hackathons", v: String(hackathons.length) },
          { l: "Submissions", v: String(totalSubs) },
          { l: "Pool total", v: `${fullUsdc(totalPool)} USDC` },
          { l: "Agents online", v: "5 / 5" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-medium text-muted-foreground mb-2">{s.l}</p>
            <p className="text-xl font-bold tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-foreground mb-3">Hackathon registry</h2>
      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Pool</th>
              <th className="p-3 font-medium">Subs</th>
              <th className="p-3 font-medium">Deadline</th>
              <th className="p-3 font-medium">Wallet</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hackathons.map((h) => (
              <tr key={h.id} className="hover:bg-muted/40 transition-colors">
                <td className="p-3 font-semibold text-foreground">{h.name}</td>
                <td className="p-3">
                  <StatusPill status={h.status} />
                </td>
                <td className="p-3 tabular-nums font-medium text-accent">
                  {fullUsdc(h.prizePoolUsdc)}
                </td>
                <td className="p-3 tabular-nums">{getHackathonProjects(h.id).length}</td>
                <td className="p-3 text-muted-foreground">{relativeDate(h.deadline)}</td>
                <td className="p-3">
                  <WalletAddress address={h.circleWalletAddress} />
                </td>
                <td className="p-3 text-right">
                  <button className="rounded-md border border-border px-3 py-1 font-semibold hover:bg-muted transition-colors">
                    Settle
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
          className="text-sm font-medium text-muted-foreground hover:text-warn"
        >
          Log out →
        </button>
      </div>
    </div>
  );
}
