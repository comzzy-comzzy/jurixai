// JuriXAI mock data — replace with real Supabase queries when backend is wired.

export type HackathonStatus = "open" | "judging" | "closed";
export type JudgeStatus = "idle" | "reviewing" | "done";

export interface Criterion {
  id: string;
  name: string;
  description: string;
  weight: number; // percent
  assignedJudge: string;
}

export interface JudgeScore {
  judgeName: string;
  criterionId: string;
  score: number; // 1-10
  rationale: string;
  createdAt: string;
}

export interface Project {
  id: string;
  hackathonId: string;
  name: string;
  teamName: string;
  description: string;
  githubUrl: string;
  demoUrl?: string;
  videoUrl: string;
  teamWalletAddress: string;
  aiScore: number;
  communityVotes: number;
  compositeScore: number;
  judgingStatus: "pending" | "reviewing" | "complete";
  scores: JudgeScore[];
  createdAt: string;
}

export interface Hackathon {
  id: string;
  name: string;
  description: string;
  organizerName: string;
  organizerEmail: string;
  prizePoolUsdc: number;
  startDate: string;
  deadline: string; // ISO
  status: HackathonStatus;
  circleWalletId: string;
  circleWalletAddress: string;
  winnerSplit: number[]; // e.g. [50,30,20]
  criteria: Criterion[];
  createdAt: string;
}

export interface Judge {
  name: string;
  initial: string;
  focus: string;
  status: JudgeStatus;
  reviewsToday: number;
  reviewsTotal: number;
  colorHex: string;
}

export const judges: Judge[] = [
  { name: "Vex",  initial: "VX", focus: "Engineering Quality",          status: "reviewing", reviewsToday: 14, reviewsTotal: 842,  colorHex: "#00D8C8" },
  { name: "Kael", initial: "KL", focus: "Architecture",                  status: "idle",      reviewsToday: 9,  reviewsTotal: 1102, colorHex: "#3B82F6" },
  { name: "Oryn", initial: "OR", focus: "Innovation",                    status: "done",      reviewsToday: 22, reviewsTotal: 954,  colorHex: "#7C3AED" },
  { name: "Zera", initial: "ZR", focus: "Documentation + Deliverables",  status: "reviewing", reviewsToday: 5,  reviewsTotal: 521,  colorHex: "#EF4444" },
  { name: "Dusk", initial: "DK", focus: "AI / Agent Integration",        status: "idle",      reviewsToday: 11, reviewsTotal: 389,  colorHex: "#F59E0B" },
];

export const defaultCriteria: Omit<Criterion, "id">[] = [
  { name: "Implementation & Engineering Quality", description: "Code quality, testing, performance.", weight: 20, assignedJudge: "Vex" },
  { name: "Architecture & Complexity Fit",        description: "System design and appropriate complexity.", weight: 16, assignedJudge: "Kael" },
  { name: "Deliverable Completeness",             description: "Working demo, complete features.", weight: 20, assignedJudge: "Zera" },
  { name: "Project Documentation",                description: "README, setup, API docs, video.", weight: 16, assignedJudge: "Zera" },
  { name: "AI/Agent Integration Evidence",        description: "Real agent use, not buzzword.", weight: 20, assignedJudge: "Dusk" },
  { name: "Implementation Innovation",            description: "Novelty of approach.", weight: 8,  assignedJudge: "Oryn" },
];

function buildCriteria(hid: string): Criterion[] {
  return defaultCriteria.map((c, i) => ({ ...c, id: `${hid}-c${i}` }));
}

const now = Date.now();
const days = (n: number) => new Date(now + n * 86_400_000).toISOString();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

export const hackathons: Hackathon[] = [
  {
    id: "solana-speedrun",
    name: "Solana Speedrun",
    description: "Ship a working onchain product on Solana in 7 days. AI agents will score speed, completeness, and execution.",
    organizerName: "Anchor Protocol",
    organizerEmail: "hack@anchor.xyz",
    prizePoolUsdc: 50_000,
    startDate: daysAgo(5),
    deadline: days(2),
    status: "open",
    circleWalletId: "wlt_8f2a1b9c",
    circleWalletAddress: "0x71A4f9b2C8eD3a7B5f6c9D1E2A4b8C3d5E7f3f9c",
    winnerSplit: [50, 30, 20],
    criteria: buildCriteria("solana-speedrun"),
    createdAt: daysAgo(5),
  },
  {
    id: "eth-berlin-modular",
    name: "Eth-Berlin Modular",
    description: "Modular blockchain primitives. Rollups, data availability, shared sequencers.",
    organizerName: "Modular Labs",
    organizerEmail: "team@modular.xyz",
    prizePoolUsdc: 25_000,
    startDate: daysAgo(20),
    deadline: daysAgo(1),
    status: "judging",
    circleWalletId: "wlt_3c9d8e2f",
    circleWalletAddress: "0xacB12e8d4F1c7A9b3D6e5f2A8c4B1d9E7f8e3112",
    winnerSplit: [50, 30, 20],
    criteria: buildCriteria("eth-berlin-modular"),
    createdAt: daysAgo(20),
  },
  {
    id: "privacy-first-build",
    name: "Privacy First Build",
    description: "ZK and FHE-powered consumer apps that respect user data. Aleo, Aztec, FHE.",
    organizerName: "Aleo Foundation",
    organizerEmail: "hack@aleo.org",
    prizePoolUsdc: 100_000,
    startDate: daysAgo(2),
    deadline: days(14),
    status: "open",
    circleWalletId: "wlt_6d4e9a1b",
    circleWalletAddress: "0xf4Cd9e7B2a8F6c1D5e3B9a4C7d2E8f5A1b6C88cc",
    winnerSplit: [50, 30, 20],
    criteria: buildCriteria("privacy-first-build"),
    createdAt: daysAgo(2),
  },
  {
    id: "zk-social-apps",
    name: "Zk-Social Apps",
    description: "Privacy-preserving social experiences with zero-knowledge identity.",
    organizerName: "Polygon ID",
    organizerEmail: "build@polygon.id",
    prizePoolUsdc: 40_000,
    startDate: daysAgo(60),
    deadline: daysAgo(30),
    status: "closed",
    circleWalletId: "wlt_2a8b3c4d",
    circleWalletAddress: "0x9b3E7d2c1A8F5b6D4e2C9a7F8e3d1B5c2A6f4D21",
    winnerSplit: [50, 30, 20],
    criteria: buildCriteria("zk-social-apps"),
    createdAt: daysAgo(60),
  },
  {
    id: "lepton-agents-showcase",
    name: "Lepton Agents Showcase",
    description: "Autonomous agents built on Canteen × Circle. Open category submissions welcome.",
    organizerName: "Lepton",
    organizerEmail: "hack@lepton.dev",
    prizePoolUsdc: 75_000,
    startDate: daysAgo(8),
    deadline: days(11),
    status: "open",
    circleWalletId: "wlt_7e1f5a9b",
    circleWalletAddress: "0x4f21d8e9B2a7C6f3E5d8A1c9B4e7F2d6A8b3E2a1",
    winnerSplit: [50, 30, 20],
    criteria: buildCriteria("lepton-agents-showcase"),
    createdAt: daysAgo(8),
  },
  {
    id: "arc-defi-sprint",
    name: "Arc DeFi Sprint",
    description: "Stablecoin-native DeFi primitives on Circle Arc. Yield, payments, settlement.",
    organizerName: "Circle Systems",
    organizerEmail: "arc@circle.com",
    prizePoolUsdc: 120_000,
    startDate: daysAgo(1),
    deadline: days(20),
    status: "open",
    circleWalletId: "wlt_9b2c7d8e",
    circleWalletAddress: "0xc7d3F8a2B9e4D1f6A5c8B7e2D9f4A1c6B3e8D5f2",
    winnerSplit: [60, 25, 15],
    criteria: buildCriteria("arc-defi-sprint"),
    createdAt: daysAgo(1),
  },
];

function makeScores(criteria: Criterion[], base: number): JudgeScore[] {
  return criteria.map((c, i) => ({
    judgeName: c.assignedJudge,
    criterionId: c.id,
    score: Math.min(10, Math.max(1, base + ((i % 3) - 1) * 0.5 + (Math.sin(i + base) * 0.4))),
    rationale: rationales[(i + Math.floor(base)) % rationales.length],
    createdAt: daysAgo(1),
  }));
}

const rationales = [
  "Test coverage is strong and the implementation handles edge cases like reorgs and partial fills. Production-ready engineering. Minor improvements possible in error surfacing.",
  "Architecture is appropriate for the problem — no over-engineering. The agent loop is cleanly separated from state management.",
  "All committed deliverables ship. Demo loads instantly, video is clear, the live URL works on first try. Rare at this stage.",
  "README is thorough, includes setup, architecture diagram, and a 2-minute video walkthrough. Comments are sparse but the code is self-documenting.",
  "Agent integration is real — Anthropic calls are routed through a proper tool-use loop with retries, not a single inference. The reasoning trace is exposed in the UI.",
  "Novel composition of existing primitives. Not net-new tech, but the framing creates a category that did not exist before.",
];

function compositeOf(scores: JudgeScore[], criteria: Criterion[], votes: number): { ai: number; composite: number } {
  let ai = 0;
  for (const c of criteria) {
    const s = scores.find(x => x.criterionId === c.id);
    if (s) ai += (s.score / 10) * c.weight;
  }
  const aiNorm = ai; // 0-100
  const voteNorm = Math.min(100, votes * 4);
  return { ai: aiNorm, composite: aiNorm * 0.5 + voteNorm * 0.5 };
}

function buildProject(
  id: string,
  hid: string,
  name: string,
  team: string,
  base: number,
  votes: number,
  walletEnd: string,
): Project {
  const h = hackathons.find(x => x.id === hid)!;
  const scores = makeScores(h.criteria, base);
  const { ai, composite } = compositeOf(scores, h.criteria, votes);
  return {
    id,
    hackathonId: hid,
    name,
    teamName: team,
    description: descriptions[Math.abs(id.charCodeAt(0) + id.charCodeAt(1)) % descriptions.length],
    githubUrl: `https://github.com/${team.toLowerCase().replace(/\s+/g, "-")}/${id}`,
    demoUrl: `https://${id}.demo.app`,
    videoUrl: `https://youtu.be/demo-${id}`,
    teamWalletAddress: `0x${id.padEnd(8, "a").slice(0, 8)}${"b".repeat(28)}${walletEnd}`,
    aiScore: ai,
    communityVotes: votes,
    compositeScore: composite,
    judgingStatus: "complete",
    scores,
    createdAt: daysAgo(2),
  };
}

const descriptions = [
  "Onchain liquidity router with agent-driven rebalancing across 12 DEX venues.",
  "Stablecoin payroll automation built on Circle Arc with USDC streaming.",
  "Zero-knowledge identity layer for permissionless reputation graphs.",
  "Autonomous market maker that adjusts curves based on volatility regimes.",
  "Privacy-preserving compute marketplace using FHE for ML inference.",
  "Cross-chain agent communication bus with verifiable message ordering.",
];

export const projects: Project[] = [
  buildProject("hyperdrive-dex", "solana-speedrun", "Hyperdrive DEX", "Hyperdrive", 9.4, 24, "f92a"),
  buildProject("solpay-rails", "solana-speedrun", "SolPay Rails", "Rails Team", 8.9, 19, "e112"),
  buildProject("lumine-identity", "solana-speedrun", "Lumine Identity", "Lumine", 8.2, 14, "88cc"),
  buildProject("modular-da", "eth-berlin-modular", "Modular DA Cache", "DA Crew", 9.1, 31, "1a2b"),
  buildProject("seq-shared", "eth-berlin-modular", "Shared Sequencer", "Seq Labs", 8.6, 22, "3c4d"),
  buildProject("aztec-feed", "privacy-first-build", "Aztec Private Feed", "Privacy Block", 8.8, 12, "9f8e"),
  buildProject("lepton-router", "lepton-agents-showcase", "Lepton Agent Router", "Lepton Builders", 9.3, 28, "b1c2"),
  buildProject("arc-yield", "arc-defi-sprint", "Arc Yield Vault", "Arc Yield", 9.0, 17, "d4e5"),
];

export const activityFeed = [
  { ts: "21:04:12", judge: "Vex",  color: "ai",     text: "Scoring project Hyperdrive DEX..." },
  { ts: "21:03:55", judge: "Kael", color: "accent", text: "Completed scoring SolPay Rails (8.90)" },
  { ts: "21:03:01", judge: "Oryn", color: "warn",   text: "Flagged submission #39 — repo empty" },
  { ts: "21:02:14", judge: "Dusk", color: "accent", text: "Completed scoring Lumine Identity (8.20)" },
  { ts: "21:01:48", judge: "Zera", color: "ai",     text: "Reviewing documentation for Modular DA Cache" },
  { ts: "21:00:22", judge: "Vex",  color: "accent", text: "Completed scoring Shared Sequencer (8.60)" },
];

export const stats = {
  activeHackathons: hackathons.filter(h => h.status === "open").length,
  totalSubmissions: 1248,
  usdcDistributed: 450_000,
  verdictsRendered: judges.reduce((a, j) => a + j.reviewsTotal, 0),
};

export function getHackathon(id: string) {
  return hackathons.find(h => h.id === id);
}
export function getProject(id: string) {
  return projects.find(p => p.id === id);
}
export function getHackathonProjects(hid: string) {
  return projects
    .filter(p => p.hackathonId === hid)
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

export const ADMIN_PASSWORD = "jurixai2026";
