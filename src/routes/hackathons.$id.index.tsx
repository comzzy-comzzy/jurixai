import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useWallet } from "@/lib/circle/useWallet";
import { loadHackathonDetail, updateHackathon, deleteHackathon } from "@/lib/jurix/actions.server";
import { Countdown } from "@/components/jurix/Countdown";
import { JudgeGrid } from "@/components/jurix/JudgePanel";
import { Leaderboard } from "@/components/jurix/Leaderboard";
import { StatusPill } from "@/components/jurix/StatusPill";
import { WalletAddress } from "@/components/jurix/WalletAddress";
import { fullUsdc, relativeDate } from "@/lib/format";
import { readUsdcBalance } from "@/lib/chain";
import { RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/hackathons/$id/")({
  loader: async ({ params }) => {
    try {
      return await loadHackathonDetail({ data: { hackathon_id: params.id } });
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.name} — JuriXAI` : "Hackathon — JuriXAI" },
      { name: "description", content: loaderData?.description ?? "" },
      {
        property: "og:title",
        content: loaderData ? `${loaderData.name} — JuriXAI` : "Hackathon — JuriXAI",
      },
      { property: "og:description", content: loaderData?.description ?? "" },
    ],
  }),
  component: HackathonDetail,
});

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20";

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

function HackathonDetail() {
  const hackathon = Route.useLoaderData();
  const [tab, setTab] = useState<"leaderboard" | "submissions">("leaderboard");
  const { wallet, profile } = useWallet();
  const navigate = useNavigate();

  const isHost = wallet && hackathon.host_user_id && profile?.userId === hackathon.host_user_id;

  // Edit / Delete States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [editForm, setEditForm] = useState({
    name: hackathon.name || "",
    organizerName: hackathon.organizer_name || "",
    organizerEmail: hackathon.organizer_email || "",
    summary: hackathon.description || "",
    submissionInstructions: hackathon.submission_instructions || "",
    requiredDeliverablesText: hackathon.required_deliverables.join("\n"),
    startDate: hackathon.start_date
      ? new Date(hackathon.start_date).toISOString().split("T")[0]
      : "",
    deadline: hackathon.deadline ? new Date(hackathon.deadline).toISOString().split("T")[0] : "",
  });

  const durationDays =
    hackathon.start_date && hackathon.deadline
      ? Math.ceil(
          (new Date(hackathon.deadline).getTime() - new Date(hackathon.start_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;
  const extraMonths = durationDays > 0 ? Math.floor(durationDays / 30) : 0;
  const adminFee = 10 + extraMonths;
  const totalFunding = hackathon.prize_pool_usdc + adminFee;
  const requiredEscrowBalance = hackathon.prize_pool_usdc;

  const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [fundingBusy, setFundingBusy] = useState(false);

  const fetchBalances = () => {
    if (hackathon.treasury_address) {
      readUsdcBalance(hackathon.treasury_address)
        .then((bal) => setTreasuryBalance(bal))
        .catch(() => setTreasuryBalance(null));
    }
    if (wallet?.address) {
      readUsdcBalance(wallet.address)
        .then((bal) => setUserBalance(bal))
        .catch(() => setUserBalance(null));
    }
  };

  useEffect(() => {
    fetchBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon.treasury_address, wallet?.address]);

  const handleFundFromSmartWallet = async () => {
    if (!wallet || !hackathon.treasury_address) return;
    const fundingNeeded = requiredEscrowBalance - (treasuryBalance ?? 0);
    if (fundingNeeded <= 0) return;

    setFundingBusy(true);
    toast.info("Initiating payment...", {
      description:
        "You will be prompted to enter your PIN to authorize the USDC transfer from your smart wallet to the hackathon treasury.",
    });

    try {
      const { executeWithdrawal } = await import("@/lib/circle/userWallet");
      await executeWithdrawal(wallet.identifier, hackathon.treasury_address, fundingNeeded);
      toast.success("Funding payment completed successfully!", {
        description: `Transferred ${fundingNeeded.toFixed(2)} USDC to the hackathon treasury. Balance will update once confirmed.`,
      });
      setTimeout(() => {
        fetchBalances();
        setFundingBusy(false);
      }, 4000);
    } catch (err) {
      toast.error("Payment failed", {
        description: err instanceof Error ? err.message : "An error occurred during payment.",
      });
      setFundingBusy(false);
    }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    try {
      await deleteHackathon({
        data: { hackathon_id: hackathon.id },
      });
      toast.success("Hackathon deleted successfully.");
      setIsDeleteConfirmOpen(false);
      await navigate({ to: "/profile" });
    } catch (err) {
      toast.error("Failed to delete hackathon", {
        description: err instanceof Error ? err.message : "An error occurred.",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditBusy(true);
    setEditError(null);
    try {
      if (!editForm.name.trim()) throw new Error("Hackathon name is required.");
      if (!editForm.organizerName.trim()) throw new Error("Organizer name is required.");
      if (!editForm.organizerEmail.trim()) throw new Error("Organizer email is required.");
      if (!editForm.summary.trim()) throw new Error("Summary/description is required.");
      if (!editForm.submissionInstructions.trim()) throw new Error("Submission instructions are required.");
      if (!editForm.startDate) throw new Error("Start date is required.");
      if (!editForm.deadline) throw new Error("Submission deadline is required.");
      if (new Date(editForm.deadline) <= new Date(editForm.startDate)) {
        throw new Error("Submission deadline must be after the start date.");
      }

      const builtDescription = buildHackathonDescription(
        editForm.summary,
        editForm.submissionInstructions,
        editForm.requiredDeliverablesText.split("\n"),
      );

      await updateHackathon({
        data: {
          hackathon_id: hackathon.id,
          name: editForm.name,
          description: builtDescription,
          organizer_name: editForm.organizerName,
          organizer_email: editForm.organizerEmail,
          start_date: editForm.startDate,
          deadline: editForm.deadline,
        },
      });

      toast.success("Hackathon updated successfully!");
      setIsEditOpen(false);
      window.location.reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update hackathon.");
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <Link
        to="/hackathons"
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Browse
      </Link>

      <header className="mt-6 mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <StatusPill status={hackathon.status} />
            <span className="text-sm text-muted-foreground">
              by {hackathon.organizer_name ?? "Unknown organizer"}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold italic tracking-tight mb-4">
            {hackathon.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl text-pretty">
            {hackathon.description ?? "No description has been added yet."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mt-4 lg:mt-0 shrink-0">
          {isHost && hackathon.status === "open" && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditOpen(true)}
                className="rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Edit event
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="rounded-lg border border-warn/30 bg-warn/5 px-5 py-3 text-sm font-semibold text-warn hover:bg-warn/10 transition-colors cursor-pointer"
              >
                Delete event
              </button>
            </div>
          )}

          {hackathon.status === "open" &&
            (wallet ? (
              <Link
                to="/hackathons/$id/submit"
                params={{ id: hackathon.id }}
                className="shrink-0 rounded-lg bg-accent text-accent-foreground px-6 py-3 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
              >
                Submit project
              </Link>
            ) : (
              <button
                onClick={() => {
                  toast.error("Account required", {
                    description:
                      "Please create an account or sign in using the button in the top right to submit your project.",
                  });
                }}
                className="shrink-0 rounded-lg bg-accent/40 text-accent-foreground/75 px-6 py-3 text-sm font-semibold shadow-sm hover:bg-accent/50 transition-colors cursor-pointer"
              >
                Register to submit
              </button>
            ))}
        </div>
      </header>

      {hackathon.treasury_address &&
        treasuryBalance !== null &&
        treasuryBalance < requiredEscrowBalance && (
          <div className="mb-8 rounded-xl border border-warn/30 bg-warn/5 p-6 text-sm flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-warn flex items-center gap-2 text-base">
                  <span>⚠️</span> Hackathon Pending Funding
                </h3>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">
                  This hackathon is pending activation until the organizer deposits the required
                  prize escrow. You can fund this hackathon by sending **Arc USDC** to the treasury
                  address, or directly from your JuriXAI smart account.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Treasury Address:</span>
                  <WalletAddress address={hackathon.treasury_address} />
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0 text-xs font-mono bg-warn/10 p-3 rounded-lg border border-warn/20 min-w-44">
                <div>
                  <span className="text-muted-foreground font-normal">Received:</span>{" "}
                  <span className="text-warn font-bold">
                    {treasuryBalance.toLocaleString()} USDC
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground font-normal">Required:</span>{" "}
                  <span className="text-foreground font-bold">
                    {requiredEscrowBalance.toLocaleString()} USDC
                  </span>
                </div>
                <div className="mt-1 border-t border-warn/20 pt-1 font-bold text-accent">
                  <span>Needed: </span>
                  <span>{(requiredEscrowBalance - treasuryBalance).toLocaleString()} USDC</span>
                </div>
              </div>
            </div>

            <div className="border-t border-warn/20 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                {wallet ? (
                  <span>
                    Your Smart Wallet Balance:{" "}
                    <strong className="text-foreground">
                      {userBalance !== null ? `${userBalance.toFixed(2)} USDC` : "Loading..."}
                    </strong>
                  </span>
                ) : (
                  <span>Sign in to fund this hackathon directly from your smart account.</span>
                )}
              </div>

              {wallet && (
                <button
                  type="button"
                  disabled={
                    fundingBusy ||
                    userBalance === null ||
                    userBalance < requiredEscrowBalance - treasuryBalance
                  }
                  onClick={handleFundFromSmartWallet}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-4 py-2 text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
                >
                  {fundingBusy ? (
                    <>
                      <RefreshCw className="size-3 animate-spin" />
                      Processing Payment...
                    </>
                  ) : userBalance !== null &&
                    userBalance < requiredEscrowBalance - treasuryBalance ? (
                    "Insufficient Balance in Smart Wallet"
                  ) : (
                    `Pay ${(requiredEscrowBalance - treasuryBalance).toFixed(2)} USDC from Smart Wallet`
                  )}
                </button>
              )}
            </div>
          </div>
        )}

      {hackathon.treasury_address &&
        treasuryBalance !== null &&
        treasuryBalance >= requiredEscrowBalance && (
          <div className="mb-8 rounded-xl border border-accent/30 bg-accent/5 p-5 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-accent flex items-center gap-2">
                <span>✅</span> Hackathon Activated & Funded
              </h3>
              <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl">
                The required prize escrow of {requiredEscrowBalance.toLocaleString()} USDC has been
                successfully verified on-chain. The {adminFee.toLocaleString()} USDC platform fee is
                forwarded during registration. Submissions and payouts are fully active.
              </p>
            </div>
            <div className="flex flex-col items-end shrink-0 text-xs font-mono text-accent">
              <span className="font-bold uppercase tracking-wider bg-accent/20 px-2 py-0.5 rounded text-[10px]">
                Activated
              </span>
            </div>
          </div>
        )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Prize Pool & Admin Fees
            </p>
            <p className="text-2xl font-bold tabular-nums mb-3">
              {fullUsdc(hackathon.prize_pool_usdc)}{" "}
              <span className="text-sm font-semibold text-muted-foreground font-normal">
                USDC Pool
              </span>
            </p>
            <div className="space-y-1.5 border-t border-border/80 pt-3 text-xs text-muted-foreground font-mono">
              <div className="flex justify-between">
                <span>Prize Pool:</span>
                <span className="text-foreground">
                  {hackathon.prize_pool_usdc.toLocaleString()} USDC
                </span>
              </div>
              <div className="flex justify-between">
                <span>Admin Fee:</span>
                <span className="text-foreground">{adminFee.toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between font-bold border-t border-dashed border-border pt-1.5 text-accent">
                <span>Total Funding:</span>
                <span>{totalFunding.toLocaleString()} USDC</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Escrow Smart Contract
            </span>
            <div>
              <WalletAddress address={hackathon.treasury_address ?? "Treasury pending"} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {hackathon.status === "open" ? "Deadline" : "Ended"}
          </p>
          {hackathon.status === "open" && hackathon.deadline ? (
            <Countdown to={hackathon.deadline} className="text-2xl font-bold" />
          ) : (
            <p className="text-2xl font-bold">
              {hackathon.deadline ? relativeDate(hackathon.deadline) : "TBD"}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Start: {hackathon.start_date ? relativeDate(hackathon.start_date) : "TBD"}
          </p>
        </div>
      </div>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Host instructions</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Submission brief</p>
            <p className="text-sm leading-relaxed text-foreground">
              {hackathon.submission_instructions ?? "No submission instructions were provided."}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Required deliverables</p>
            {hackathon.required_deliverables.length > 0 ? (
              <ul className="space-y-2 text-sm text-foreground">
                {hackathon.required_deliverables.map((item, index) => (
                  <li key={index} className="rounded-md bg-background px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No required deliverables were listed.</p>
            )}
          </div>
        </div>
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">Judging criteria</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        {hackathon.criteria.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No criteria have been configured for this hackathon yet.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="p-4 font-medium">Criterion</th>
                  <th className="p-4 font-medium hidden md:table-cell">Description</th>
                  <th className="p-4 font-medium">Agent</th>
                  <th className="p-4 font-medium text-right">Weight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {hackathon.criteria.map((criterion) => {
                  const agent = hackathon.agents.find((item) => item.id === criterion.agent_id);
                  return (
                    <tr key={criterion.id}>
                      <td className="p-4 font-semibold text-foreground">{criterion.name}</td>
                      <td className="p-4 text-muted-foreground hidden md:table-cell">
                        {criterion.description ?? "No description yet."}
                      </td>
                      <td className="p-4 font-medium text-ai">{agent?.name ?? "Unassigned"}</td>
                      <td className="p-4 text-right tabular-nums text-accent font-bold">
                        {criterion.weight_percent}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-sm font-semibold text-foreground">AI judge panel</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        {hackathon.agents.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-sm text-muted-foreground">
            No judge agents are configured yet.
          </div>
        ) : (
          <JudgeGrid judges={hackathon.agents} />
        )}
      </section>

      <section>
        <div className="inline-flex gap-1 mb-6 rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => setTab("leaderboard")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "leaderboard"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setTab("submissions")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "submissions"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Submissions ({hackathon.submissions.length})
          </button>
        </div>

        {tab === "leaderboard" ? (
          hackathon.submissions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm">
              No submissions yet.
            </div>
          ) : (
            <Leaderboard hackathonId={hackathon.id} projects={hackathon.submissions} />
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hackathon.submissions.map((submission, index) => (
              <Link
                key={submission.id}
                to="/hackathons/$id/project/$projectId"
                params={{ id: hackathon.id, projectId: submission.id }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-input transition-all block"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold tracking-tight">{submission.project_name}</h3>
                    <p className="text-sm text-muted-foreground">by {submission.team_name}</p>
                  </div>
                  <span className="text-2xl font-bold text-accent tabular-nums">
                    {submission.weighted_score.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {submission.description ?? "No submission description yet."}
                </p>
                <div className="text-xs text-muted-foreground border-t border-border pt-3">
                  Rank #{index + 1}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
      {/* Edit Hackathon Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl rounded-2xl p-6 overflow-y-auto max-h-[90vh] bg-card text-card-foreground border border-border">
          <DialogTitle className="text-xl font-bold tracking-tight italic">
            Edit Hackathon Details
          </DialogTitle>
          <p className="text-xs text-muted-foreground -mt-2">
            Update your hackathon's details. Note: If the status is not open, editing is disabled.
          </p>

          <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Hackathon name *
              </label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Organizer name *
                </label>
                <input
                  required
                  value={editForm.organizerName}
                  onChange={(e) => setEditForm({ ...editForm, organizerName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Organizer email *
                </label>
                <input
                  required
                  type="email"
                  value={editForm.organizerEmail}
                  onChange={(e) => setEditForm({ ...editForm, organizerEmail: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Summary / Description *
              </label>
              <Textarea
                required
                rows={3}
                value={editForm.summary}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                placeholder="What is this hackathon about?"
                className="min-h-20 rounded-xl bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Submission instructions *
              </label>
              <Textarea
                required
                rows={3}
                value={editForm.submissionInstructions}
                onChange={(e) =>
                  setEditForm({ ...editForm, submissionInstructions: e.target.value })
                }
                placeholder="How should participants submit?"
                className="min-h-20 rounded-xl bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Required deliverables (one per line) *
              </label>
              <Textarea
                required
                rows={4}
                value={editForm.requiredDeliverablesText}
                onChange={(e) =>
                  setEditForm({ ...editForm, requiredDeliverablesText: e.target.value })
                }
                placeholder="e.g. GitHub repository&#10;Problem solved and target users&#10;Walkthrough video"
                className="min-h-24 rounded-xl bg-background border border-border px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Start date *
                </label>
                <input
                  required
                  type="date"
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Submission deadline *
                </label>
                <input
                  required
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {editError && <p className="text-sm text-warn font-medium">{editError}</p>}

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors cursor-pointer text-foreground bg-transparent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editBusy}
                className="rounded-lg bg-accent text-accent-foreground px-5 py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {editBusy ? "Saving changes..." : "Save changes"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 bg-card text-card-foreground border border-border">
          <DialogTitle className="text-xl font-bold tracking-tight italic text-warn">
            Delete Hackathon
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Are you sure you want to delete <strong>{hackathon.name}</strong>? This action is
            permanent and will delete all submissions and judging criteria associated with this
            event.
          </p>
          <div className="flex gap-3 pt-4 border-t border-border mt-4">
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50 text-foreground bg-transparent cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteBusy}
              onClick={handleDelete}
              className="flex-1 rounded-xl bg-warn text-white py-2.5 text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {deleteBusy ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete"
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
