import { createFileRoute } from "@tanstack/react-router";
import { evaluateSubmissionWithModel, parseGitHubRepo } from "@/lib/jurix/judge-model.server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { createPublicClient, http, decodeFunctionData } from "viem";
import { activeChain, ARC_RPC_URL, USDC_ADDRESS, CHAIN_NAME } from "@/lib/chain";
import { getOperatorAddress } from "@/lib/chain.server";
import {
  processOkxPayment,
  instructionsToResponse,
  type OkxPaymentResult,
} from "@/lib/x402/okx.server";
import type {
  JudgeAgent,
  JudgingCriterion,
  HackathonSummary,
  SubmissionSummary,
} from "@/lib/jurix/types";

// Standard ERC20 transfer ABI for decoding
const transferAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// Define default criteria and details for the pay-per-call service
const AGENT_CRITERIA_MAP = {
  "vex-01": {
    name: "Code Quality & Implementation",
    description:
      "Does the code run correctly? Is it clean, well-structured, secure, and maintainable?",
  },
  "kael-02": {
    name: "Product Design & UX",
    description: "Is the design user-friendly? Does the product solve a real problem effectively?",
  },
  "oryn-03": {
    name: "Innovation & Originality",
    description: "How creative is the project? Is the solution new and ambitious?",
  },
  "zera-04": {
    name: "Completeness & Execution",
    description:
      "Is the codebase polished? Are there good instructions, docs, and clean deployment files?",
  },
};

function extractAllGitHubUrls(obj: unknown): string[] {
  const urls: string[] = [];
  const githubUrlRegex = /https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/gi;

  function traverse(item: unknown) {
    if (!item) return;
    if (typeof item === "string") {
      const matches = item.match(githubUrlRegex);
      if (matches) {
        urls.push(...matches);
      }
    } else if (Array.isArray(item)) {
      item.forEach(traverse);
    } else if (typeof item === "object" && item !== null) {
      for (const key in item) {
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          traverse((item as Record<string, unknown>)[key]);
        }
      }
    }
  }

  traverse(obj);
  return [...new Set(urls)];
}

const handleJudge = async ({ request }: { request: Request }) => {
  try {
    const url = new URL(request.url);
    let body: Record<string, unknown> = {};
    if (request.method === "POST" || request.method === "PUT") {
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch (e) {
        body = {};
      }
    }

    // Check for user prompt or message in common body fields or query params
    const promptKeys = ["prompt", "message", "content", "text", "query", "q", "msg"];
    let userPrompt = "";
    for (const key of promptKeys) {
      if (body[key] && typeof body[key] === "string") {
        userPrompt = body[key];
        break;
      }
      const paramVal = url.searchParams.get(key);
      if (paramVal) {
        userPrompt = paramVal;
        break;
      }
    }

    // Comprehensive parsing of repo URLs and description from body and search params
    const repoKeys = [
      "githubUrl",
      "github_url",
      "repoUrl",
      "repo_url",
      "url",
      "repository",
      "repositoryUrl",
      "repository_url",
      "repo",
      "git",
      "gitUrl",
      "git_url",
      "link",
    ];

    let githubUrl = "";
    for (const key of repoKeys) {
      if (body[key] && typeof body[key] === "string" && (body[key] as string).trim()) {
        githubUrl = (body[key] as string).trim();
        break;
      }
      const paramVal = url.searchParams.get(key);
      if (paramVal && paramVal.trim()) {
        githubUrl = paramVal.trim();
        break;
      }
    }

    const repoUrlsKeys = ["githubUrls", "github_urls", "repoUrls", "repo_urls", "urls"];
    let githubUrls: string[] | undefined = undefined;
    for (const key of repoUrlsKeys) {
      if (body[key]) {
        githubUrls = body[key] as string[];
        break;
      }
      const paramVal = url.searchParams.get(key);
      if (paramVal) {
        githubUrls = paramVal
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean);
        break;
      }
    }

    const descKeys = [
      "taskDescription",
      "task_description",
      "task",
      "description",
      "prompt",
      "message",
      "content",
      "text",
      "query",
      "q",
      "msg",
      "brief",
      "hackathonBrief",
      "hackathon_brief",
    ];
    let description = "";
    for (const key of descKeys) {
      if (body[key] && typeof body[key] === "string" && (body[key] as string).trim()) {
        description = (body[key] as string).trim();
        break;
      }
      const paramVal = url.searchParams.get(key);
      if (paramVal && paramVal.trim()) {
        description = paramVal.trim();
        break;
      }
    }

    // Fail-safe scanner to pull any GitHub URLs from request body and search parameters
    const scannedUrls = [
      ...extractAllGitHubUrls(body),
      ...extractAllGitHubUrls(Object.fromEntries(url.searchParams.entries())),
    ];

    if (!githubUrl && scannedUrls.length > 0) {
      githubUrl = scannedUrls[0];
    }
    if (!githubUrls && scannedUrls.length > 0) {
      githubUrls = scannedUrls;
    }

    // If userPrompt is empty but description is found, use it
    if (!userPrompt && description) {
      userPrompt = description;
    }

    // If a user prompt was found, parse it for GitHub URLs and set description
    if (userPrompt) {
      const githubUrlRegex = /https?:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+/gi;
      const matches = userPrompt.match(githubUrlRegex);
      if (matches && matches.length > 0) {
        if (!githubUrl) {
          githubUrl = matches[0];
        }
        if (!githubUrls) {
          githubUrls = matches;
        }
      }
      if (!description) {
        description = userPrompt;
      }
    }

    // Default the description if still not provided
    if (!description || typeof description !== "string" || !description.trim()) {
      description = "General codebase quality and architectural audit.";
    }

    // We do NOT fall back to JuriXAI automatically.
    // If no repository URL is provided, we will return 400 Bad Request below.

    // Parse sandbox mode: defaults to false unless explicitly set to true
    let sandbox = false;
    if (body["sandbox"] !== undefined) {
      sandbox = Boolean(body["sandbox"]);
    } else if (url.searchParams.has("sandbox")) {
      sandbox = url.searchParams.get("sandbox") === "true";
    }

    let requestedAgentSlugs = body["agents"] as string[] | undefined;
    if (!requestedAgentSlugs && url.searchParams.has("agents")) {
      const agentsParam = url.searchParams.get("agents");
      requestedAgentSlugs = agentsParam ? agentsParam.split(",") : undefined;
    }

    let txHash = (body["txHash"] as string | undefined) || url.searchParams.get("txHash");

    // Extract txHash from standard x402 headers if not in body/query params
    if (!txHash) {
      const headersToCheck = [
        "PAYMENT-SIGNATURE",
        "payment-signature",
        "X-PAYMENT",
        "x-payment",
        "Authorization",
        "authorization",
      ];
      for (const headerName of headersToCheck) {
        const val = request.headers.get(headerName);
        if (!val) continue;

        const cleanVal = val.replace(/^(Payment|Bearer)\s+/i, "").trim();
        if (cleanVal.startsWith("0x") && cleanVal.length === 66) {
          txHash = cleanVal;
          break;
        }

        // Try decoding as base64 JSON
        try {
          const decodedStr = Buffer.from(cleanVal, "base64").toString("utf-8");
          if (decodedStr.includes("{")) {
            const parsed = JSON.parse(decodedStr);
            if (parsed.txHash) {
              txHash = parsed.txHash;
              break;
            }
            if (parsed.transaction) {
              txHash = parsed.transaction;
              break;
            }
            if (parsed.payload?.txHash) {
              txHash = parsed.payload.txHash;
              break;
            }
            if (parsed.payload?.transaction) {
              txHash = parsed.payload.transaction;
              break;
            }
            if (parsed.authorization) {
              if (parsed.authorization.startsWith("0x") && parsed.authorization.length === 66) {
                txHash = parsed.authorization;
                break;
              }
            }
          }
        } catch (e) {
          // Ignore and continue
        }

        // Try parsing raw JSON
        if (cleanVal.includes("{")) {
          try {
            const parsed = JSON.parse(cleanVal) as Record<string, unknown>;
            if (parsed["txHash"]) {
              txHash = parsed["txHash"] as string;
              break;
            }
            if (parsed["transaction"]) {
              txHash = parsed["transaction"] as string;
              break;
            }
          } catch (e) {
            // Ignore parse errors on nested objects
          }
        }
      }
    }

    let paymentData: {
      kind: string;
      from_address: string | null;
      to_address: string;
      amount_usdc: number;
      circle_tx_id: string;
      status: string;
    } | null = null;
    let isReplay = false;

    // Define pricing standard for individual agents (USDT, decimals=6)
    const AGENTS_PRICING: Record<string, bigint> = {
      "vex-01": 40000n, // 0.04 USDT (Engineering)
      "kael-02": 30000n, // 0.03 USDT (Product/UX)
      "oryn-03": 20000n, // 0.02 USDT (Innovation)
      "zera-04": 20000n, // 0.02 USDT (Completeness/Docs)
    };

    // Default to all active agents if not provided or empty
    const defaultSlugs = ["vex-01", "kael-02", "oryn-03", "zera-04"];
    const targetAgentSlugs =
      Array.isArray(requestedAgentSlugs) && requestedAgentSlugs.length > 0
        ? requestedAgentSlugs.filter((slug) => defaultSlugs.includes(slug))
        : defaultSlugs;

    if (targetAgentSlugs.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "Invalid agents requested. Valid slugs are: vex-01, kael-02, oryn-03, zera-04",
        },
        { status: 400 },
      );
    }

    const urlsToAudit = (githubUrl ? [githubUrl] : Array.isArray(githubUrls) ? githubUrls : [])
      .map((u) => (typeof u === "string" ? u.trim() : ""))
      .filter(Boolean);

    if (urlsToAudit.length === 0) {
      return Response.json(
        {
          ok: false,
          error:
            "No valid GitHub repository URL provided. Please supply a githubUrl, repoUrl, or task description containing a GitHub link in the body or query parameters.",
        },
        { status: 400 },
      );
    }

    const repoCount = urlsToAudit.length;

    const feePerRepo = targetAgentSlugs.reduce(
      (sum, slug) => sum + (AGENTS_PRICING[slug] || 0n),
      0n,
    );
    const expectedMin = feePerRepo * BigInt(repoCount);
    const supabase = getSupabaseServerClient();

    // 1a. Standard x402 flow via the OKX Payment SDK (facilitator verify/settle).
    // Runs whenever the caller did not supply a legacy on-chain txHash.
    // - No PAYMENT-SIGNATURE header  -> standard 402 challenge (PAYMENT-REQUIRED header)
    // - Valid PAYMENT-SIGNATURE      -> verified; settlement executes after the audit
    // - OKX credentials/facilitator unavailable -> fall through to legacy challenge
    let okxPayment: OkxPaymentResult | null = null;
    if (!sandbox && !txHash) {
      okxPayment = await processOkxPayment(request, body, {
        agentSlugs: targetAgentSlugs,
        repoCount,
      });
      if (okxPayment.type === "payment-error") {
        return instructionsToResponse(okxPayment.response);
      }
    }
    const okxVerified = okxPayment?.type === "payment-verified" ? okxPayment : null;

    // 1b. Legacy flow: verify a direct USDT0 transfer on X Layer Mainnet by txHash.
    // Also serves the manual 402 challenge when the OKX facilitator is unavailable.
    if (!sandbox && !okxVerified) {
      if (!txHash) {
        const endpointUrl = "https://www.jurixai.xyz/api/judge";
        const operatorAddress = getOperatorAddress();
        const amount = expectedMin.toString();

        const challenge = {
          x402Version: 2,
          resource: {
            url: endpointUrl,
            description: `JuriXAI Auditor: Modular multi-agent repository quality audit service (Agents: ${targetAgentSlugs.join(", ")}).`,
            mimeType: "application/json",
          },
          accepts: [
            {
              scheme: "exact",
              network: "eip155:196", // X Layer Mainnet
              asset: "0x779ded0c9e1022225f8e0630b35a9b54be713736", // USDT0 on X Layer Mainnet
              amount: amount,
              payTo: operatorAddress,
              maxTimeoutSeconds: 300,
              extra: { name: "USD₮0", version: "1" },
            },
          ],
        };

        const challengeBase64 = Buffer.from(JSON.stringify(challenge)).toString("base64");

        const responseBody = {
          ok: false,
          error: "Payment transaction hash is required for mainnet mode.",
          ...challenge,
        };

        return new Response(JSON.stringify(responseBody), {
          status: 402,
          headers: {
            "Content-Type": "application/json",
            "PAYMENT-REQUIRED": challengeBase64,
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        });
      }

      // Check if txHash has already been registered (indicates a replay attempt to retrieve results)
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id")
        .eq("circle_tx_id", txHash)
        .maybeSingle();

      if (existingPayment) {
        isReplay = true;
      }

      if (!isReplay) {
        // Check transaction on chain
        const isXLayer = CHAIN_NAME === "XLAYER-MAINNET" || CHAIN_NAME === "xlayerMainnet";
        const verifyRpc = ARC_RPC_URL;
        const verifyUsdc = USDC_ADDRESS;
        const verifyChainName = isXLayer
          ? "X Layer"
          : CHAIN_NAME === "MATIC-AMOY" || CHAIN_NAME === "polygonAmoy"
            ? "Polygon"
            : "Arc";
        const verifyTokenSymbol = isXLayer ? "USDT" : "USDC";

        const client = createPublicClient({ transport: http(verifyRpc) });
        let tx;
        let receipt;
        try {
          tx = await client.getTransaction({ hash: txHash as `0x${string}` });
          receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error: `Failed to fetch transaction details on ${verifyChainName}. Verify the hash is correct and confirmed.`,
            },
            { status: 400 },
          );
        }

        if (receipt.status !== "success") {
          return Response.json(
            { ok: false, error: "Payment transaction has reverted or failed on-chain." },
            { status: 400 },
          );
        }

        // Verify transaction is sending tokens to operator
        const allowedContracts = [verifyUsdc.toLowerCase()];
        if (isXLayer) {
          // Also support standard/previous USDT contract address on X Layer
          const prevXLayerUsdt = "0x1e4a5963ab75d8c9021ce480b42188849d41d7d9";
          if (!allowedContracts.includes(prevXLayerUsdt)) {
            allowedContracts.push(prevXLayerUsdt);
          }
        }

        if (!tx.to || !allowedContracts.includes(tx.to.toLowerCase())) {
          return Response.json(
            {
              ok: false,
              error: `Transaction was not directed to the ${verifyChainName} ${verifyTokenSymbol} contract.`,
            },
            { status: 400 },
          );
        }

        try {
          const decoded = decodeFunctionData({
            abi: transferAbi,
            data: tx.input,
          });
          const recipient = decoded.args[0];
          const amount = decoded.args[1];

          const operatorAddress = getOperatorAddress();
          if (recipient.toLowerCase() !== operatorAddress.toLowerCase()) {
            return Response.json(
              { ok: false, error: "Recipient is not the JuriXAI operator address." },
              { status: 400 },
            );
          }

          if (amount < expectedMin) {
            return Response.json(
              {
                ok: false,
                error: `Transaction amount is insufficient. Minimum required is ${Number(expectedMin) / 1000000} ${verifyTokenSymbol} for ${repoCount} repositories.`,
              },
              { status: 400 },
            );
          }

          // Save payment details to insert later after evaluations succeed
          paymentData = {
            kind: "entry",
            from_address: tx.from,
            to_address: recipient,
            amount_usdc: Number(amount) / 1000000,
            circle_tx_id: txHash,
            status: "confirmed",
          };
        } catch (err) {
          return Response.json(
            {
              ok: false,
              error:
                "Invalid transaction structure or decoding failed. Make sure it is a standard USDT transfer.",
            },
            { status: 400 },
          );
        }
      }
    }

    // Validate repository count and project description AFTER payment is confirmed, but BEFORE starting evaluations.
    if (urlsToAudit.length === 0) {
      return Response.json(
        { ok: false, error: "No valid repository URL provided." },
        { status: 400 },
      );
    }

    if (!description || typeof description !== "string" || !description.trim()) {
      return Response.json(
        {
          ok: false,
          error:
            "Project description is required. Please describe the purpose of the codebase and key features to help agents gain accurate context.",
        },
        { status: 400 },
      );
    }

    // Validate repository URLs and check accessibility AFTER payment is confirmed,
    // but BEFORE starting the evaluations.
    for (const urlToAudit of urlsToAudit) {
      const repoRef = parseGitHubRepo(urlToAudit);
      if (!repoRef) {
        return Response.json(
          {
            ok: false,
            error: `Invalid GitHub repository URL: ${urlToAudit}. Must be a valid public GitHub repository URL.`,
          },
          { status: 400 },
        );
      }

      try {
        const checkUrl = `https://api.github.com/repos/${repoRef.owner}/${repoRef.repo}`;
        const response = await fetch(checkUrl, {
          headers: {
            accept: "application/vnd.github+json",
            "user-agent": "jurixai-judge-bot",
            ...(process.env.GITHUB_TOKEN?.trim()
              ? { authorization: `Bearer ${process.env.GITHUB_TOKEN.trim()}` }
              : {}),
          },
        });
        if (!response.ok) {
          if (response.status === 404) {
            return Response.json(
              { ok: false, error: `GitHub repository is private or does not exist: ${urlToAudit}` },
              { status: 404 },
            );
          } else {
            return Response.json(
              {
                ok: false,
                error: `GitHub repository is inaccessible (Status ${response.status}): ${urlToAudit}`,
              },
              { status: response.status },
            );
          }
        }
      } catch (err) {
        return Response.json(
          {
            ok: false,
            error: `Failed to verify repository accessibility: ${err instanceof Error ? err.message : String(err)}`,
          },
          { status: 502 },
        );
      }
    }

    // 2. Fetch active judge agents from database
    const { data: dbAgents, error: agentsError } = await supabase
      .from("judge_agents")
      .select("*")
      .order("weight_percent", { ascending: false });

    if (agentsError) {
      throw new Error(agentsError.message);
    }

    const agents = (dbAgents ?? []).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      short_code: row.short_code,
      role: row.role,
      focus_area: row.focus_area,
      status: row.status,
      color_hex: row.color_hex,
      weight_percent: row.weight_percent,
      system_prompt: row.system_prompt,
      scoring_notes: row.scoring_notes,
      wallet_address: row.wallet_address,
      created_at: row.created_at,
    })) as JudgeAgent[];

    // 3. Prepare mock summaries for evaluation
    const hackathon: HackathonSummary = {
      id: "api-judging",
      name: hackathonName || "API Judging Service",
      description: hackathonBrief || "AI Judge-as-a-Service pay-per-call API invocation",
      submission_instructions: null,
      required_deliverables: ["github"],
      organizer_name: "JurixAI ASP",
      organizer_email: "support@jurix.ai",
      prize_pool_usdc: 0,
      entry_fee_usdc: 0,
      start_date: new Date().toISOString(),
      deadline: new Date().toISOString(),
      status: "closed",
      treasury_wallet_id: null,
      treasury_address: null,
      winner_split: [100],
      created_at: new Date().toISOString(),
      submission_count: 1,
    };

    const batchResults = [];

    // Evaluate repositories sequentially to manage LLM rate limits cleanly
    for (let i = 0; i < urlsToAudit.length; i++) {
      const currentUrl = urlsToAudit[i];

      const submission: SubmissionSummary = {
        id: `api-submission-${i}`,
        hackathon_id: "api-judging",
        user_id: null,
        project_name: `API Project Evaluation #${i + 1}`,
        team_name: "External Caller",
        description: description || "No description provided.",
        github_url: currentUrl,
        demo_url: null,
        video_url: null,
        payout_address: "0x0000000000000000000000000000000000000000",
        entry_paid: true,
        status: "complete",
        community_votes: 0,
        created_at: new Date().toISOString(),
        weighted_score: 0,
      };

      const filteredAgents = agents.filter((agent) => targetAgentSlugs.includes(agent.slug));
      const evalPromises = filteredAgents.map(async (agent) => {
        const criteriaData = AGENT_CRITERIA_MAP[agent.slug as keyof typeof AGENT_CRITERIA_MAP] || {
          name: `${agent.name} Evaluation`,
          description: agent.focus_area,
        };

        const criterion: JudgingCriterion = {
          id: agent.id,
          hackathon_id: "api-judging",
          agent_id: agent.id,
          name: criteriaData.name,
          description: criteriaData.description,
          weight_percent: agent.weight_percent,
          sort_order: 0,
          created_at: new Date().toISOString(),
        };

        // In sandbox mode, lock non-Vex agents to enforce payment upgrade
        if (sandbox && agent.slug !== "vex-01") {
          const individualCost = Number(AGENTS_PRICING[agent.slug] || 20000n) / 1000000;
          return {
            agent: agent.name,
            role: agent.role,
            score: 0,
            confidence: 0,
            rationale: `[🔒 Paid Upgrade Required] Detailed ${agent.role.toLowerCase()} audit is locked in Sandbox Mode. Send ${individualCost} USDT to unlock the individual agent evaluation, or 0.11 USDT to unlock the full 4-agent suite.`,
            evidence: [],
            flags: ["LOCKED_SANDBOX"],
          };
        }

        try {
          const evaluation = await evaluateSubmissionWithModel(
            agent,
            criterion,
            hackathon,
            submission,
            { isDirectAudit: true },
          );
          return {
            agent: agent.name,
            role: agent.role,
            score: evaluation.score,
            confidence: evaluation.confidence,
            rationale: evaluation.rationale,
            evidence: evaluation.evidence,
            flags: evaluation.flags,
          };
        } catch (err) {
          console.error(`[api/judge] Agent ${agent.name} evaluation failed:`, err);
          throw err;
        }
      });

      const evaluations = await Promise.all(evalPromises);

      // Calculate average score
      let totalWeight = 0;
      let weightedSum = 0;
      evaluations.forEach((ev) => {
        if (sandbox && ev.score === 0) return; // Ignore locked agents in average score
        const agent = agents.find((a) => a.name === ev.agent);
        const weight = agent ? agent.weight_percent : 25;
        weightedSum += ev.score * weight;
        totalWeight += weight;
      });

      const averageScore = Number((weightedSum / (totalWeight || 1)).toFixed(2));

      batchResults.push({
        githubUrl: currentUrl,
        evaluations,
        averageScore,
      });
    }

    if (batchResults.length === 0) {
      return Response.json(
        { ok: false, error: "Audit pipeline yielded no results." },
        { status: 500 },
      );
    }

    // Settle the standard x402 payment via the OKX facilitator now that the
    // audit succeeded. On settlement failure the resource is NOT delivered.
    let settlementHeaders: Record<string, string> = {};
    if (okxVerified) {
      const settleResult = await okxVerified.settle();
      if (!settleResult.success) {
        return instructionsToResponse(settleResult.response);
      }
      settlementHeaders = settleResult.headers;
      if (settleResult.transaction) {
        txHash = settleResult.transaction;
      }
      await supabase.from("payments").insert({
        kind: "entry",
        from_address: null,
        to_address: getOperatorAddress(),
        amount_usdc: Number(expectedMin) / 1000000,
        circle_tx_id: settleResult.transaction || `x402-${Date.now()}`,
        status: "confirmed",
      });
    }

    // Log payment in DB now that the evaluations succeeded
    if (!sandbox && paymentData && !isReplay) {
      await supabase.from("payments").insert(paymentData);
    }

    const isSingle = urlsToAudit.length === 1;

    return Response.json(
      {
        ok: true,
        githubUrl: isSingle ? urlsToAudit[0] : undefined,
        txHash: txHash || (sandbox ? "sandbox_mode" : "x402_settled"),
        evaluations: isSingle ? batchResults[0]?.evaluations : undefined,
        averageScore: isSingle ? batchResults[0]?.averageScore : undefined,
        results: batchResults, // ALWAYS return the full results array
        repoCount,
      },
      { headers: settlementHeaders },
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Judging evaluation failed." },
      { status: 500 },
    );
  }
};

export const Route = createFileRoute("/api/judge")({
  server: {
    handlers: {
      GET: handleJudge,
      POST: handleJudge,
    },
  },
});
