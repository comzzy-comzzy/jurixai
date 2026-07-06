import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  BookOpen,
  Terminal,
  Cpu,
  Wallet,
  Coins,
  Play,
  Calculator,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Settings,
  Check,
  Copy,
  ExternalLink,
  Shield,
  ArrowRight,
  ChevronRight,
  Code,
  FileText,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation & Whitepaper — JuriXAI" },
      {
        name: "description",
        content:
          "Complete documentation on JuriXAI's autonomous AI judging engine, onchain USDC micro-payments, and hackathon hosting workflows.",
      },
      { property: "og:title", content: "Documentation & Whitepaper — JuriXAI" },
      {
        property: "og:description",
        content:
          "Learn how JuriXAI coordinates specialized AI agents and automates onchain USDC rewards.",
      },
    ],
  }),
  component: DocsPage,
});

// Sidebar Navigation config
const SECTIONS = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "ai-judges", label: "AI Judging Engine", icon: Cpu },
  { id: "agent-simulator", label: "Interactive Agent Simulator", icon: Sparkles },
  { id: "circle-usdc", label: "Onchain Economics & USDC", icon: Coins },
  { id: "fee-calculator", label: "Workload Fee Calculator", icon: Calculator },
  { id: "hosting-guide", label: "Host Guide", icon: Settings },
  { id: "builder-guide", label: "Builder Guide", icon: Code },
  { id: "faq", label: "FAQ & Appeal Pipeline", icon: HelpCircle },
] as const;

// 4 AI Judges loaded from seed migrations
const AGENTS = [
  {
    slug: "vex-01",
    name: "Vex",
    shortCode: "VX",
    role: "Code Judge",
    focusArea: "Code quality, correctness, maintainability, and security basics.",
    color: "#00D8C8",
    weight: 35,
    systemPrompt: `Review the repository for code quality, correctness, test coverage, and maintainability. Penalize shallow prototypes and unverified claims.`,
    scoringNotes: `Require concrete evidence from repo structure, implementation details, and testability.`,
    flags: ["missing_repo", "weak_repo_structure", "low_evidence"],
  },
  {
    slug: "kael-02",
    name: "Kael",
    shortCode: "KL",
    role: "Product Judge",
    focusArea: "Problem clarity, UX, user value, and product completeness.",
    color: "#3B82F6",
    weight: 25,
    systemPrompt: `Judge the usefulness of the project, UX quality, and whether the team solved a real problem end to end.`,
    scoringNotes: `Favor real user journeys and complete demos over pitch-heavy concepts.`,
    flags: ["missing_demo", "off_brief", "missing_deliverable"],
  },
  {
    slug: "oryn-03",
    name: "Oryn",
    shortCode: "OR",
    role: "Innovation Judge",
    focusArea: "Originality, ambition, and differentiated thinking.",
    color: "#7C3AED",
    weight: 20,
    systemPrompt: `Assess novelty and whether the implementation shows a non-obvious, defensible approach.`,
    scoringNotes: `Do not reward buzzwords. Reward differentiated execution and architectural boldness.`,
    flags: ["brief_mismatch", "low_evidence"],
  },
  {
    slug: "zera-04",
    name: "Zera",
    shortCode: "ZR",
    role: "Delivery Judge",
    focusArea: "Documentation, reproducibility, polish, and shipping quality.",
    color: "#EF4444",
    weight: 20,
    systemPrompt: `Check if the project is actually shipped: repo quality, README completeness, video clarity, and reproducibility.`,
    scoringNotes: `Broken demos, dead links, and missing instructions should materially reduce the score.`,
    flags: ["weak_docs", "weak_readme", "entry_unpaid"],
  },
];

function DocsPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Copy handler for code snippets
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  interface SimResult {
    score: number;
    confidence: number;
    rationale: string;
    evidence: string[];
    flags: string[];
    feeUsdc: number;
    timeMs: number;
  }

  // State for AI Judge Simulator
  const [simAgent, setSimAgent] = useState<string>("vex-01");
  const [simHasRepo, setSimHasRepo] = useState<boolean>(true);
  const [simHasDemo, setSimHasDemo] = useState<boolean>(true);
  const [simReadmeQuality, setSimReadmeQuality] = useState<"high" | "medium" | "low">("high");
  const [simDescLength, setSimDescLength] = useState<number>(650);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simResult, setSimResult] = useState<SimResult | null>(null);

  // State for Workload Fee Calculator
  const [calcSubmissions, setCalcSubmissions] = useState<number>(10);
  const [calcCriteria, setCalcCriteria] = useState<number>(4);
  const [calcAvgLength, setCalcAvgLength] = useState<number>(800);

  // Simulator Engine logic (deterministic but realistic)
  const handleSimulate = () => {
    setIsSimulating(true);
    setSimResult(null);

    setTimeout(() => {
      const selectedAgent = AGENTS.find((a) => a.slug === simAgent)!;
      let baseScore = 8.5;
      const evidence: string[] = [];
      const flags: string[] = [];

      // Vex logic
      if (selectedAgent.slug === "vex-01") {
        if (!simHasRepo) {
          baseScore -= 6.0;
          evidence.push("No GitHub repository link was detected");
          flags.push("missing_repo");
        } else {
          evidence.push("Detected active GitHub repository link");
          if (simReadmeQuality === "high") {
            baseScore += 1.0;
            evidence.push("Clean file structure with test directory present");
          } else if (simReadmeQuality === "low") {
            baseScore -= 1.5;
            evidence.push("Messy root directory, no visible test structure");
            flags.push("weak_repo_structure");
          }
        }
      }

      // Kael logic
      if (selectedAgent.slug === "kael-02") {
        if (!simHasDemo) {
          baseScore -= 4.0;
          evidence.push("No deployed demo link provided");
          flags.push("missing_demo");
        } else {
          evidence.push("Interactive deployment URL verified");
          baseScore += 0.5;
        }
        if (simDescLength < 300) {
          baseScore -= 1.0;
          evidence.push("Short project description limits product flow analysis");
          flags.push("low_evidence");
        } else {
          evidence.push("Detailed description outlines user persona");
        }
      }

      // Oryn logic
      if (selectedAgent.slug === "oryn-03") {
        if (simReadmeQuality === "high") {
          baseScore += 1.0;
          evidence.push("Innovative architecture explained in README");
        } else if (simReadmeQuality === "low") {
          baseScore -= 1.0;
          flags.push("low_evidence");
        }
        evidence.push("Assessed uniqueness against similar hackathon entries");
      }

      // Zera logic
      if (selectedAgent.slug === "zera-04") {
        if (simReadmeQuality === "high") {
          baseScore += 1.2;
          evidence.push("README contains detailed setup and build commands");
        } else if (simReadmeQuality === "medium") {
          baseScore += 0.2;
          evidence.push("Standard setup instructions provided");
        } else {
          baseScore -= 3.0;
          evidence.push("README has under 50 words or is a default template");
          flags.push("weak_readme");
        }
        if (!simHasDemo) {
          baseScore -= 1.5;
          evidence.push("Missing live demo deploy checks");
          flags.push("weak_docs");
        }
      }

      // Clamp score
      const finalScore = Number(Math.max(1.0, Math.min(10.0, baseScore)).toFixed(2));
      const confidence = Number((0.75 + Math.random() * 0.2).toFixed(2));

      // Build rationales
      let rationale = "";
      if (finalScore >= 8.5) {
        rationale = `Exceptional execution in ${selectedAgent.focusArea.split(",")[0].toLowerCase()}. The project demonstrates mature shipping habits and fulfills all rubric standards.`;
      } else if (finalScore >= 6.0) {
        rationale = `Solid foundation but requires refinement in ${selectedAgent.focusArea.split(",")[0].toLowerCase()}. Checked files are functional but lack thorough polish.`;
      } else {
        rationale = `Significant deficits identified regarding the criterion. Key deliverables are either missing or insufficient for full technical validation.`;
      }

      // Shorten rationale to match the 320 character limit in prompts
      rationale = rationale.substring(0, 310);

      // Workload fee
      const baseFee = 0.0002;
      const dynamicFee = baseFee + (simDescLength + rationale.length) * 0.000001;
      const feeUsdc = Number(dynamicFee.toFixed(6));

      setSimResult({
        score: finalScore,
        confidence,
        rationale,
        evidence: evidence.slice(0, 3),
        flags: flags.length > 0 ? flags : ["none"],
        feeUsdc,
        timeMs: 400 + Math.floor(Math.random() * 400),
      });
      setIsSimulating(false);
    }, 1200);
  };

  // Workload Fee Calculator calculations
  const calculatorResults = useMemo(() => {
    const totalCalls = calcSubmissions * calcCriteria;

    // Average rationale is 150 chars
    const baseFee = 0.0002;
    const dynamicFeePerCall = baseFee + (calcAvgLength + 150) * 0.000001;
    const totalCostUsdc = Number((totalCalls * dynamicFeePerCall).toFixed(4));

    const vexCost = Number((totalCostUsdc * 0.35).toFixed(4));
    const kaelCost = Number((totalCostUsdc * 0.25).toFixed(4));
    const orynCost = Number((totalCostUsdc * 0.2).toFixed(4));
    const zeraCost = Number((totalCostUsdc * 0.2).toFixed(4));

    return {
      totalCalls,
      totalCostUsdc,
      vexCost,
      kaelCost,
      orynCost,
      zeraCost,
    };
  }, [calcSubmissions, calcCriteria, calcAvgLength]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-16">
      {/* Header Banner */}
      <section className="mb-12 border-b border-border pb-10">
        <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 mb-4 text-xs font-semibold text-muted-foreground w-fit animate-slide-in">
          <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
          Protocol Specs v2.4 (Active)
        </div>
        <h1 className="text-4xl md:text-5xl font-bold italic tracking-tight mb-4 animate-slide-in">
          JuriXAI <span className="text-muted-foreground">Whitepaper & Docs</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl leading-relaxed">
          Welcome to the formal specifications of the JuriXAI protocol. This guide provides
          builders, hosts, and judges with a transparent view into our autonomous evaluation engine,
          agent system prompts, and Circle USDC economic pipelines.
        </p>
      </section>

      {/* Main Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 sticky top-24 space-y-2 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2">
          {/* Desktop Sidebar List */}
          <div className="hidden lg:flex flex-col gap-1.5">
            <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sections
            </h3>
            {SECTIONS.map((section) => {
              const IconComponent = section.icon;
              const isActive = activeTab === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveTab(section.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 text-left ${
                    isActive
                      ? "bg-accent/10 border-l-2 border-accent text-accent font-bold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent"
                  }`}
                >
                  <IconComponent className="size-4 shrink-0" />
                  {section.label}
                </button>
              );
            })}
          </div>

          {/* Mobile Navigation Dropdown */}
          <div className="lg:hidden w-full mb-6">
            <label htmlFor="docs-nav-select" className="sr-only">
              Select Documentation Section
            </label>
            <select
              id="docs-nav-select"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm font-semibold text-foreground focus:outline-none focus:border-accent"
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* Content Panel */}
        <main className="lg:col-span-9 space-y-12">
          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <BookOpen className="text-accent size-6" /> Overview & Vision
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Traditional hackathons are plagued by subjective judging, coordination delays, and
                slow, manual payout mechanisms. Judges often skim repositories, favor
                high-production video pitches, and suffer from fatigue.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="size-8 rounded-lg bg-red-500/10 text-red-500 grid place-items-center">
                    <AlertTriangle className="size-4" />
                  </div>
                  <h4 className="font-semibold text-foreground">The Old Way</h4>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Subjective, biased human judging</li>
                    <li>Hours of manual grading and spreadsheet work</li>
                    <li>Days or weeks of waiting for prize payments</li>
                    <li>Opaque feedback (often just a final list of names)</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                  <div className="size-8 rounded-lg bg-accent/10 text-accent grid place-items-center">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <h4 className="font-semibold text-foreground">The JuriXAI Way</h4>
                  <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                    <li>Four deterministic, specialized AI agent rubrics</li>
                    <li>Submissions scored automatically within minutes</li>
                    <li>Onchain USDC distribution to winners directly</li>
                    <li>Fully traceable rationale and evidence flags</li>
                  </ul>
                </div>
              </div>

              <h3 className="text-lg font-bold italic text-foreground mt-8">The Core Lifecycle</h3>

              <div className="relative border-l-2 border-border pl-6 ml-3 space-y-8 my-6">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0 size-4 rounded-full border-2 border-accent bg-background" />
                  <h4 className="font-semibold text-sm text-foreground">
                    1. Hackathon Initialization
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hosts create an event, deposit a USDC prize pool via Circle, and configure
                    judging criteria matched to the agents' specializations.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 size-4 rounded-full border-2 border-accent bg-background" />
                  <h4 className="font-semibold text-sm text-foreground">2. Builder Submission</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hackathon participants submit their project title, description, code repository
                    (GitHub), deployment demo, and destination USDC wallet address.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 size-4 rounded-full border-2 border-accent bg-background" />
                  <h4 className="font-semibold text-sm text-foreground">
                    3. Autonomous Agent Audit
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    When the deadline passes, JuriXAI spins up judging runs. The system crawls
                    repositories, parses README directions, and invokes the 4 AI agent judges.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 size-4 rounded-full border-2 border-accent bg-background" />
                  <h4 className="font-semibold text-sm text-foreground">
                    4. Micro-transactions & Verification
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Agents are paid dynamic workload fees in USDC for computational effort. The
                    results (scores, evidence list, flags) are committed to the database.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-0 size-4 rounded-full border-2 border-accent bg-background" />
                  <h4 className="font-semibold text-sm text-foreground">
                    5. USDC Prize Disbursement
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    The leaderboard calculates the weighted average. The smart contracts trigger
                    on-chain transfers to the top-scoring teams automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: AI Judges */}
          {activeTab === "ai-judges" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <Cpu className="text-accent size-6" /> The AI Judging Engine
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                JuriXAI distributes evaluation responsibility across 4 specialized agent roles. This
                prevents a single model from getting overwhelmed by conflicting requirements (e.g.
                balancing raw architectural complexity vs. clean UI layouts).
              </p>

              <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground flex gap-3 items-start my-4 animate-slide-in">
                <Info className="size-4 shrink-0 text-accent mt-0.5" />
                <div>
                  <strong className="text-foreground block mb-0.5">
                    Customizable Criteria vs. Global Baseline
                  </strong>
                  The percentages shown below (35%, 25%, 20%, 20%) represent the system-wide
                  baseline weight profiles for the individual agents. However, JuriXAI allows
                  hackathon hosts to fully customize criteria weights (such as a 30%/30%/20%/20%
                  split) when creating an event. The leaderboard standing and composite score are
                  dynamically calculated based on the specific criteria weights defined by the host,
                  not the global agent defaults.
                </div>
              </div>

              {/* Grid of 4 Judges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
                {AGENTS.map((agent) => (
                  <div
                    key={agent.slug}
                    className="rounded-xl border border-border bg-card p-6 relative overflow-hidden group hover:border-foreground/30 transition-all duration-300"
                  >
                    {/* Glowing Accent Strip */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: agent.color }}
                    />

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="size-7 rounded-lg text-white font-bold text-xs flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: agent.color }}
                        >
                          {agent.shortCode}
                        </span>
                        <div>
                          <h4 className="font-bold text-foreground leading-none">{agent.name}</h4>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {agent.role}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded border border-border bg-muted font-mono">
                        Weight: {agent.weight}%
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Focus Area
                        </span>
                        <p className="text-xs text-foreground font-medium">{agent.focusArea}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          System Directives
                        </span>
                        <p className="text-xs text-muted-foreground italic">
                          "{agent.systemPrompt}"
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Evaluation Guide
                        </span>
                        <p className="text-xs text-muted-foreground">"{agent.scoringNotes}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Crawling Logic Details */}
              <div className="rounded-xl border border-border bg-muted/40 p-6 space-y-4">
                <h3 className="text-base font-bold italic text-foreground flex items-center gap-2">
                  <Terminal className="size-4 text-accent" /> Repo Inspection Context
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Before the agents score, the JuriXAI backend inspects each GitHub URL to form a
                  structured context. It reads:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-muted-foreground font-mono">
                  <div className="p-2 border border-border bg-background rounded">
                    <span className="text-accent font-bold">1. File Tree Structure</span>
                    <p className="mt-1">
                      Traverses folder hierarchy, looking for packages, configuration, and testing
                      files.
                    </p>
                  </div>
                  <div className="p-2 border border-border bg-background rounded">
                    <span className="text-accent font-bold">2. README Markdown</span>
                    <p className="mt-1">
                      Scrapes setup guides, build commands, and overall project summary
                      documentation.
                    </p>
                  </div>
                  <div className="p-2 border border-border bg-background rounded">
                    <span className="text-accent font-bold">3. Dependencies</span>
                    <p className="mt-1">
                      Checks `package.json`, `cargo.toml` or equivalent to verify technical
                      complexity.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Interactive Agent Simulator */}
          {activeTab === "agent-simulator" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <Sparkles className="text-accent size-6" /> Interactive Agent Simulator
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Test how the agents evaluate submissions in real-time. Toggle parameters to simulate
                different project states, and see the resulting evaluation scorecard and the exact
                USDC payment allocated to the agent.
              </p>

              {/* Simulator Card */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border border-border rounded-xl bg-card overflow-hidden">
                {/* Inputs Sidebar */}
                <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Simulator Controls
                  </h3>

                  {/* Select Agent */}
                  <div className="space-y-2">
                    <label
                      htmlFor="simulator-agent-select"
                      className="text-xs font-bold text-foreground block"
                    >
                      Select Judge Agent
                    </label>
                    <select
                      id="simulator-agent-select"
                      value={simAgent}
                      onChange={(e) => setSimAgent(e.target.value)}
                      className="w-full rounded-lg bg-background border border-border px-3 py-2 text-sm text-foreground focus:outline-none focus:border-accent"
                    >
                      {AGENTS.map((a) => (
                        <option key={a.slug} value={a.slug}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Switch Controls */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label htmlFor="sim-has-repo" className="text-xs font-bold text-foreground">
                        GitHub Repo Linked
                      </label>
                      <input
                        id="sim-has-repo"
                        type="checkbox"
                        checked={simHasRepo}
                        onChange={(e) => setSimHasRepo(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent size-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <label htmlFor="sim-has-demo" className="text-xs font-bold text-foreground">
                        Live Demo Link Provided
                      </label>
                      <input
                        id="sim-has-demo"
                        type="checkbox"
                        checked={simHasDemo}
                        onChange={(e) => setSimHasDemo(e.target.checked)}
                        className="rounded border-border text-accent focus:ring-accent size-4"
                      />
                    </div>
                  </div>

                  {/* Select Quality */}
                  <div className="space-y-2">
                    <label
                      htmlFor="sim-readme-quality"
                      className="text-xs font-bold text-foreground block"
                    >
                      README & Structure Quality
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["low", "medium", "high"] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setSimReadmeQuality(q)}
                          className={`rounded px-2.5 py-1 text-xs font-semibold capitalize border transition-all ${
                            simReadmeQuality === q
                              ? "bg-accent/10 border-accent text-accent"
                              : "border-border hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description Length Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="sim-desc-length" className="font-bold text-foreground">
                        Description Length
                      </label>
                      <span className="text-muted-foreground font-mono">{simDescLength} chars</span>
                    </div>
                    <input
                      id="sim-desc-length"
                      type="range"
                      min={100}
                      max={2000}
                      step={50}
                      value={simDescLength}
                      onChange={(e) => setSimDescLength(Number(e.target.value))}
                      className="w-full accent-accent bg-muted h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleSimulate}
                    disabled={isSimulating}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent text-accent-foreground py-3 text-sm font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isSimulating ? (
                      <>
                        <span className="size-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="size-4 fill-current" />
                        Run Simulation
                      </>
                    )}
                  </button>
                </div>

                {/* Outputs Panel */}
                <div className="lg:col-span-7 p-6 flex flex-col justify-center min-h-[350px] bg-background">
                  {simResult ? (
                    <div className="space-y-5 animate-slide-in w-full">
                      {/* Score Header */}
                      <div className="flex items-start justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="size-8 rounded-lg text-white font-bold text-sm flex items-center justify-center"
                            style={{
                              backgroundColor: AGENTS.find((a) => a.slug === simAgent)!.color,
                            }}
                          >
                            {AGENTS.find((a) => a.slug === simAgent)!.shortCode}
                          </span>
                          <div>
                            <h4 className="font-bold text-foreground">Verdict Output</h4>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              Processed in {simResult.timeMs}ms
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-2xl font-black font-mono tracking-tight text-foreground">
                            {simResult.score.toFixed(2)}{" "}
                            <span className="text-xs text-muted-foreground font-normal">/ 10</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Confidence: {Math.round(simResult.confidence * 100)}%
                          </div>
                        </div>
                      </div>

                      {/* Rationale */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Rationale
                        </span>
                        <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-foreground font-medium leading-relaxed">
                          "{simResult.rationale}"
                        </div>
                      </div>

                      {/* Evidence */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                          Evidence Check
                        </span>
                        <div className="space-y-1.5">
                          {simResult.evidence.map((ev: string, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <span className="size-1.5 rounded-full bg-accent" />
                              <span>{ev}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Flags */}
                      <div className="flex gap-4 border-t border-border pt-4">
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Flags Raised
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {simResult.flags.map((flag: string) => {
                              const isNone = flag === "none";
                              return (
                                <span
                                  key={flag}
                                  className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
                                    isNone
                                      ? "bg-accent/5 text-accent border-accent/20"
                                      : "bg-red-500/5 text-red-500 border-red-500/20"
                                  }`}
                                >
                                  {flag}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        {/* USDC Fee paid */}
                        <div className="text-right space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                            Workload Fee Paid
                          </span>
                          <span className="font-mono text-sm font-bold text-accent">
                            {simResult.feeUsdc.toFixed(6)} USDC
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground p-8">
                      <Cpu className="size-12 mx-auto text-muted-foreground/30 mb-3 animate-pulse" />
                      <h4 className="text-sm font-bold text-foreground mb-1">
                        Waiting for Simulation
                      </h4>
                      <p className="text-xs max-w-xs mx-auto">
                        Adjust the controls on the left and click "Run Simulation" to generate a
                        mock AI grading run.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Circle USDC Economics */}
          {activeTab === "circle-usdc" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <Coins className="text-accent size-6" /> Onchain Economics & Circle USDC
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                JuriXAI operates as a fully circular Web3 economic system. All transaction assets,
                rewards, and operational costs are transacted in **USDC** (stablecoin), providing
                predictability for hackathon organizers and absolute liquidity for builders.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
                <div className="rounded-xl border border-border p-5 space-y-2 bg-card">
                  <Wallet className="size-5 text-accent" />
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Host Escrow Deposit
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Hosts fund the prize pool and a reserve buffer for judging fees. Locked in
                    escrow until evaluation completion.
                  </p>
                </div>

                <div className="rounded-xl border border-border p-5 space-y-2 bg-card">
                  <Cpu className="size-5 text-accent" />
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Agent Workload Fees
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    USDC micro-payments are sent directly to the agent's EVM wallet to offset model
                    compute costs upon grading.
                  </p>
                </div>

                <div className="rounded-xl border border-border p-5 space-y-2 bg-card">
                  <Coins className="size-5 text-accent" />
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Automated Winner Payout
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    USDC transfers trigger instantly via Circle Developer API to winners' specified
                    payout wallets.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="text-base font-bold italic text-foreground">
                  Autonomous Workload Fee Algorithm
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  To incentivize host efficiency and prevent spam submissions, each judge agent
                  receives a precise workload fee for every submission they score. The calculation
                  balances base connection costs with model context/output complexity:
                </p>

                {/* Math Block */}
                <div className="bg-muted p-4 rounded-lg font-mono text-xs text-center border border-border text-foreground">
                  Fee (USDC) = 0.0002 + (Length of Project Description + Length of Rationale Text) ×
                  0.000001
                </div>

                <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
                  <li>
                    <strong className="text-foreground">Base Connection Fee (0.0002 USDC):</strong>{" "}
                    Reimburses basic routing logic, Supabase database transactions, and Web3
                    transaction gas.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Workload Weight (0.000001 USDC per char):
                    </strong>{" "}
                    Scaled directly to the character counts of the builder's description and the
                    model's generated reasoning.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 5: Workload Fee Calculator */}
          {activeTab === "fee-calculator" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <Calculator className="text-accent size-6" /> USDC Workload Fee Calculator
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Organizing a hackathon? Use our dynamic calculator to estimate the total judging
                fees that need to be funded prior to launching automated audits.
              </p>

              {/* Calculator UI */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-border rounded-xl p-6 bg-card">
                {/* Sliders */}
                <div className="space-y-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Parameters
                  </h3>

                  {/* Slider 1: Submissions */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="calc-submissions" className="font-semibold text-foreground">
                        Expected Submissions
                      </label>
                      <span className="font-mono text-accent font-bold">{calcSubmissions}</span>
                    </div>
                    <input
                      id="calc-submissions"
                      type="range"
                      min={1}
                      max={100}
                      value={calcSubmissions}
                      onChange={(e) => setCalcSubmissions(Number(e.target.value))}
                      className="w-full accent-accent bg-muted h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Slider 2: Criteria */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="calc-criteria" className="font-semibold text-foreground">
                        Judging Criteria (Agents)
                      </label>
                      <span className="font-mono text-accent font-bold">{calcCriteria}</span>
                    </div>
                    <input
                      id="calc-criteria"
                      type="range"
                      min={1}
                      max={8}
                      value={calcCriteria}
                      onChange={(e) => setCalcCriteria(Number(e.target.value))}
                      className="w-full accent-accent bg-muted h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Slider 3: Description Length */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <label htmlFor="calc-avg-length" className="font-semibold text-foreground">
                        Avg. Description Length
                      </label>
                      <span className="font-mono text-accent font-bold">{calcAvgLength} chars</span>
                    </div>
                    <input
                      id="calc-avg-length"
                      type="range"
                      min={100}
                      max={3000}
                      step={50}
                      value={calcAvgLength}
                      onChange={(e) => setCalcAvgLength(Number(e.target.value))}
                      className="w-full accent-accent bg-muted h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Outputs Display */}
                <div className="bg-muted/30 border border-border rounded-xl p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Budget Estimations
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Total LLM Calls
                        </span>
                        <span className="font-mono text-lg font-bold text-foreground">
                          {calculatorResults.totalCalls}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Reserve Pool Recommended
                        </span>
                        <span className="font-mono text-lg font-bold text-accent">
                          {(calculatorResults.totalCostUsdc * 1.15).toFixed(4)} USDC
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-border pt-3 space-y-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                        Fee Split per Agent Group
                      </span>
                      <div className="space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Vex (35% Weight):</span>
                          <span className="text-foreground font-bold">
                            {calculatorResults.vexCost} USDC
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Kael (25% Weight):</span>
                          <span className="text-foreground font-bold">
                            {calculatorResults.kaelCost} USDC
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Oryn (20% Weight):</span>
                          <span className="text-foreground font-bold">
                            {calculatorResults.orynCost} USDC
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Zera (20% Weight):</span>
                          <span className="text-foreground font-bold">
                            {calculatorResults.zeraCost} USDC
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 mt-4 flex items-center justify-between bg-accent/5 p-3 rounded-lg border border-accent/25">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-accent tracking-wide block">
                        Total Cost Base
                      </span>
                      <p className="text-xs text-muted-foreground">Includes transfer gas</p>
                    </div>
                    <span className="text-xl font-black font-mono text-accent">
                      {calculatorResults.totalCostUsdc} USDC
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Host Guide */}
          {activeTab === "hosting-guide" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <Settings className="text-accent size-6" /> Hackathon Host Manual
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Hosting a hackathon on JuriXAI takes less than 3 minutes. Follow these directives to
                establish your event and ensure your judging runs trigger smoothly:
              </p>

              <div className="space-y-6 text-sm text-muted-foreground">
                <div className="flex gap-4">
                  <div className="size-8 rounded-lg bg-accent/10 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Verify Host Profile</h4>
                    <p className="leading-relaxed">
                      Before posting, ensure your wallet is active via the dashboard. Host profiles
                      are authenticated onchain to verify ownership.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="size-8 rounded-lg bg-accent/10 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Configure Rubric and Weights</h4>
                    <p className="leading-relaxed">
                      You can add custom criteria matching your hackathon's topic (e.g. Smart
                      Contract Correctness, Frontend Polish). Map each criterion to the
                      corresponding Agent (Vex, Kael, Oryn, or Zera) so they evaluate it correctly.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="size-8 rounded-lg bg-accent/10 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Set Deadlines & Escrow Pool</h4>
                    <p className="leading-relaxed">
                      Specify the closing deadline. The system relies on a cron worker to check when
                      deadlines pass. Fund the prize pool using USDC. JuriXAI will lock the budget
                      in escrow.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="size-8 rounded-lg bg-accent/10 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground mb-1">Trigger Judging Runs</h4>
                    <p className="leading-relaxed">
                      When the deadline passes, the system automatically triggers the evaluation run
                      via a cron schedule, or platform administrators can manually trigger it via
                      the admin dashboard. The run iterates through submissions in batches
                      (concurrency of 5 to avoid timeouts) and completes onchain payments to the
                      agents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Builder Guide */}
          {activeTab === "builder-guide" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <Code className="text-accent size-6" /> Builder Submission Guidelines
                </h2>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                As a developer, your submission is read directly by LLM pipelines. Submitting sloppy
                directories, broken links, or buzzword-only descriptions will cause agents to flag
                your code and deduct points.
              </p>

              <div className="space-y-4">
                <h3 className="text-base font-bold italic text-foreground">
                  Common Flags & Penalties
                </h3>
                <p className="text-xs text-muted-foreground">
                  The agents are configured to raise specific machine-readable flags when inspection
                  criteria are failed:
                </p>

                <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-card text-xs">
                  <div className="grid grid-cols-12 p-3 bg-muted/30 font-bold text-foreground">
                    <div className="col-span-3">Flag Slug</div>
                    <div className="col-span-3">Raised By</div>
                    <div className="col-span-6">Trigger Event & Score Effect</div>
                  </div>

                  <div className="grid grid-cols-12 p-3 items-center">
                    <div className="col-span-3">
                      <span className="font-mono text-red-500 font-bold bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                        missing_repo
                      </span>
                    </div>
                    <div className="col-span-3 font-semibold text-foreground">Vex (Code)</div>
                    <div className="col-span-6 text-muted-foreground">
                      No valid GitHub URL. Automatic reduction to minimum score of 1.00.
                    </div>
                  </div>

                  <div className="grid grid-cols-12 p-3 items-center">
                    <div className="col-span-3">
                      <span className="font-mono text-red-500 font-bold bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                        weak_readme
                      </span>
                    </div>
                    <div className="col-span-3 font-semibold text-foreground">Zera (Delivery)</div>
                    <div className="col-span-6 text-muted-foreground">
                      README has under 50 words or is the default boilerplate. Score reduced by 1.5
                      - 3.0.
                    </div>
                  </div>

                  <div className="grid grid-cols-12 p-3 items-center">
                    <div className="col-span-3">
                      <span className="font-mono text-red-500 font-bold bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                        missing_demo
                      </span>
                    </div>
                    <div className="col-span-3 font-semibold text-foreground">Kael (Product)</div>
                    <div className="col-span-6 text-muted-foreground">
                      No deployment demo link is provided when hosting rules require it. Score
                      reduced by 2.0 - 4.0.
                    </div>
                  </div>

                  <div className="grid grid-cols-12 p-3 items-center">
                    <div className="col-span-3">
                      <span className="font-mono text-red-500 font-bold bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                        off_brief
                      </span>
                    </div>
                    <div className="col-span-3 font-semibold text-foreground">
                      Oryn (Innovation)
                    </div>
                    <div className="col-span-6 text-muted-foreground">
                      The project doesn't follow the organizer's hackathon brief guidelines. Score
                      reduced by 20%.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-6 space-y-3">
                <h3 className="text-base font-bold italic text-foreground">
                  Tips for Maximizing Scores
                </h3>
                <ul className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    <strong className="text-foreground">Commit test suites:</strong> Code Judge
                    (Vex) crawls files looking for testing directories. Adding testing configs
                    indicates mature development.
                  </li>
                  <li>
                    <strong className="text-foreground">
                      Explain architectural tradeoffs in README:
                    </strong>{" "}
                    Innovation Judge (Oryn) rewards non-obvious engineering. Outline your database
                    schemas or contracts.
                  </li>
                  <li>
                    <strong className="text-foreground">Format links clearly:</strong> Ensure
                    repositories are public and live deployments don't crash on loads.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 8: FAQ & Appeals */}
          {activeTab === "faq" && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-border pb-4">
                <h2 className="text-2xl font-bold tracking-tight italic flex items-center gap-3">
                  <HelpCircle className="text-accent size-6" /> FAQ & Appeals
                </h2>
              </div>

              <div className="space-y-4">
                {/* Q1 */}
                <div className="border border-border rounded-xl p-5 bg-card space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    How is LLM bias or hallucination handled?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By prompting models to return a strict list of 5 lines (Score, Confidence,
                    Rationale, Evidence, Flags), we prevent typical conversational drift. Rationales
                    must prove evidence from the parsed GitHub context or submission details.
                  </p>
                </div>

                {/* Q2 */}
                <div className="border border-border rounded-xl p-5 bg-card space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    Can a participant submit to private repositories?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Currently, JuriXAI crawls public GitHub repositories. If your repository is
                    private, the agent will raise a `missing_repo` flag. We plan to integrate GitHub
                    OAuth app connections in the next minor release (v2.5) to support authorized
                    audits of private repositories.
                  </p>
                </div>

                {/* Q3 */}
                <div className="border border-border rounded-xl p-5 bg-card space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    How do I appeal a verdict?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Each hackathon's host user acts as the ultimate judicial governor. If an agent
                    raises a false-positive flag (e.g., failing to identify a specific framework
                    setup), builders can contact the host organizer. Hosts have administrative keys
                    (via `/admin` dashboard) to override scores or trigger manual re-runs.
                  </p>
                </div>

                {/* Q4 */}
                <div className="border border-border rounded-xl p-5 bg-card space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    How do Circle wallet integrations work?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    JuriXAI utilizes the <strong>JuriXEscrow v2</strong> smart contract deployed on Arc Testnet at <code className="bg-accent/15 px-1.5 py-0.5 rounded text-accent font-mono text-[10px]">0x89db74b925f694ebec1118cff9b08a1afe528785</code>. 
                    When a hackathon is hosted, the organizer's deposit is sent directly to this escrow contract. The contract immediately forwards the platform fees to the fee collector and locks the remaining prize pool. 
                    If the organizer deletes the hackathon before the deadline, the system triggers the contract's on-chain <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">cancelAndRefund</code> function, returning 100% of the prize pool USDC back to the hoster's profile account. Once results are judged, payouts are disbursed to the winners' smart accounts atomically in a single contract call.
                  </p>
                </div>

                {/* Q5 */}
                <div className="border border-border rounded-xl p-5 bg-card space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    How are hackathon deadlines monitored autonomously?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    JuriXAI exposes a dedicated API endpoint at <code className="bg-accent/15 px-1.5 py-0.5 rounded text-accent font-mono text-[10px]">/api/judge-deadlines</code>. 
                    A Vercel Cron Job is scheduled to ping this endpoint every 10 minutes. When triggered, it scans for open hackathons whose deadlines have passed, runs the AI evaluation in concurrent batches, commits scores, and opens the hackathon for payout disbursement.
                  </p>
                </div>

                {/* Q6 */}
                <div className="border border-border rounded-xl p-5 bg-card space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    How does JuriXAI prevent exploits or scoring manipulation?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    JuriXAI implements several layers of security: (1) <strong>On-chain Escrow</strong> locks the prize pool under smart contract rules that restrict disbursement to verified operators and cap total payouts; (2) <strong>Consensus AI Grading</strong> evaluates projects using a multi-agent panel with strict system prompt caps, making it highly resilient to individual prompt-injection exploits; (3) <strong>Deterministic Offsets</strong> apply hardcoded score penalties for missing or placeholder deliverables, so bad actors cannot bypass requirements; (4) <strong>Human Governance</strong> lets organizers inspect detailed reasoning logs and override scores if an anomaly is detected.
                  </p>
                </div>

                {/* Q7 */}
                <div className="border border-border rounded-xl p-5 bg-card space-y-2">
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-accent" />
                    How are the AI judges paid, and why do they charge a workload fee?
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Every AI agent has its own public EVM wallet address on Arc Testnet. Scoring a hackathon project requires significant LLM computation (crawling the repository, parsing code, evaluating, and writing a formatted rationale). To pay for this computation, JuriXAI automatically transfers a dynamic <strong>Workload Fee</strong> (paid in USDC) from the hackathon's escrow/treasury to each agent's wallet address for every project scored. This fee consists of a base connection fee (0.0002 USDC) plus a character-length charge for evaluation payload. You can check the transaction receipts of these agent payments directly via the green explorer links under each score.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
