/**
 * OKX Payment SDK (x402) integration for the JuriXAI Auditor pay-per-call API.
 *
 * Uses the official @okxweb3/x402-core resource server with the OKX facilitator
 * (verify + settle) and the EVM "exact" scheme (EIP-3009 transferWithAuthorization)
 * on X Layer Mainnet (eip155:196, USDT0).
 *
 * The OKX.ai marketplace validates the standard 402 challenge in the
 * PAYMENT-REQUIRED response header and pays via the PAYMENT-SIGNATURE request
 * header — both are handled by x402HTTPResourceServer.processHTTPRequest().
 */
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { x402ResourceServer } from "@okxweb3/x402-core/server";
import { x402HTTPResourceServer } from "@okxweb3/x402-core/http";
import type {
  HTTPAdapter,
  HTTPRequestContext,
  HTTPResponseInstructions,
} from "@okxweb3/x402-core/http";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { getOperatorAddress } from "@/lib/chain.server";

export const XLAYER_NETWORK = "eip155:196" as const;
export const USDT0_ASSET = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
export const USDT0_EXTRA = { name: "USDT", symbol: "USDT", decimals: 6, version: "1" };

/** Per-agent pricing in USDT0 minimum units (6 decimals). */
export const AGENTS_PRICING: Record<string, bigint> = {
  "vex-01": 250000n, // 0.25 USDT (Engineering)
  "kael-02": 250000n, // 0.25 USDT (Product/UX)
  "oryn-03": 250000n, // 0.25 USDT (Innovation)
  "zera-04": 250000n, // 0.25 USDT (Completeness/Docs)
};
export const DEFAULT_AGENT_SLUGS = ["vex-01", "kael-02", "oryn-03", "zera-04"];

export interface JudgeRequestParams {
  agentSlugs: string[];
  repoCount: number;
}

export function buildPaymentRequiredResponse(params: {
  resourceUrl: string;
  description: string;
  amount: bigint;
  payTo: string;
  errorMessage?: string;
}): HTTPResponseInstructions {
  const paymentRequired = {
    x402Version: 2,
    resource: {
      url: params.resourceUrl,
      description: params.description,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: XLAYER_NETWORK,
        asset: USDT0_ASSET,
        amount: params.amount.toString(),
        payTo: params.payTo,
        maxTimeoutSeconds: 300,
        symbol: "USDT",
        decimals: 6,
        extra: { ...USDT0_EXTRA },
      },
    ],
    error: params.errorMessage,
  };

  return {
    status: 402,
    headers: {
      "Content-Type": "application/json",
      "PAYMENT-REQUIRED": Buffer.from(JSON.stringify(paymentRequired)).toString("base64"),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
    body: {
      error: params.errorMessage ?? "Payment required",
    },
  };
}

/** Total price in USDT0 minimum units for the requested agents × repositories. */
export function computeExpectedAmount({ agentSlugs, repoCount }: JudgeRequestParams): bigint {
  const feePerRepo = agentSlugs.reduce((sum, slug) => sum + (AGENTS_PRICING[slug] || 0n), 0n);
  return feePerRepo * BigInt(Math.max(repoCount, 1));
}

/** Minimal HTTPAdapter over a Fetch API Request with a pre-parsed body. */
function createRequestAdapter(request: Request, parsedBody: unknown): HTTPAdapter {
  const url = new URL(request.url);
  return {
    getHeader: (name) => request.headers.get(name) ?? undefined,
    getMethod: () => request.method.toUpperCase(),
    getPath: () => url.pathname,
    getUrl: () => request.url,
    getAcceptHeader: () => request.headers.get("accept") ?? "",
    getUserAgent: () => request.headers.get("user-agent") ?? "",
    getQueryParams: () => Object.fromEntries(url.searchParams.entries()),
    getQueryParam: (name) => url.searchParams.get(name) ?? undefined,
    getBody: () => parsedBody,
  };
}

let httpServerPromise: Promise<x402HTTPResourceServer | null> | null = null;

function buildRouteConfig(params: JudgeRequestParams) {
  const amount = computeExpectedAmount(params).toString();
  const accepts = {
    scheme: "exact",
    network: XLAYER_NETWORK,
    payTo: getOperatorAddress(),
    price: { amount, asset: USDT0_ASSET, symbol: "USDT", decimals: 6, extra: { ...USDT0_EXTRA } },
    maxTimeoutSeconds: 300,
    symbol: "USDT",
    decimals: 6,
  };
  const description = `JuriXAI Auditor: Modular multi-agent repository quality audit service (Agents: ${params.agentSlugs.join(", ")}).`;
  return {
    accepts,
    description,
    mimeType: "application/json",
    unpaidResponseBody: () => ({
      contentType: "application/json",
      body: {
        ok: false,
        error:
          "Payment required. Retry with a standard x402 PAYMENT-SIGNATURE header (OKX Payment SDK), or pass a txHash of a direct USDT0 transfer, or set sandbox=true for a free preview.",
        x402Version: 2,
      },
    }),
  };
}

/**
 * Lazily create (once) the x402 resource server connected to the OKX facilitator.
 * Returns null when OKX credentials are missing or the facilitator is unreachable,
 * letting the caller fall back to the legacy manual challenge.
 */
async function getBaseServer(): Promise<x402ResourceServer | null> {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;
  if (!apiKey || !secretKey || !passphrase) return null;

  const facilitatorClient = new OKXFacilitatorClient({ apiKey, secretKey, passphrase });
  const server = new x402ResourceServer(facilitatorClient).register(
    XLAYER_NETWORK,
    new ExactEvmScheme(),
  );

  // Wrap server.initialize() with a 3-second timeout to prevent requests from hanging if the OKX facilitator is slow/unreachable
  let timeoutId: NodeJS.Timeout | undefined;
  const initPromise = server.initialize();
  const timeoutPromise = new Promise<void>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Timeout initializing OKX x402 server (3s limit reached)")),
      3000,
    );
  });

  try {
    await Promise.race([initPromise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
  return server;
}

async function getCachedBaseServer(): Promise<x402ResourceServer | null> {
  if (!httpServerPromise) {
    // Cache failures for the lifetime of this (serverless) instance so a
    // misconfigured facilitator key doesn't add a doomed round-trip per request.
    httpServerPromise = getBaseServer().catch((err) => {
      console.error("[x402] OKX facilitator initialization failed:", err);
      return null;
    }) as Promise<x402HTTPResourceServer | null>;
  }
  return httpServerPromise as unknown as Promise<x402ResourceServer | null>;
}

export type OkxPaymentResult =
  | { type: "unavailable" }
  | { type: "payment-error"; response: HTTPResponseInstructions }
  | {
      type: "payment-verified";
      /** Call after the resource has been produced to settle on-chain via OKX. */
      settle: () => Promise<
        | { success: true; headers: Record<string, string>; transaction?: string }
        | { success: false; response: HTTPResponseInstructions }
      >;
    };

/**
 * Run the standard x402 flow for a judge request.
 *
 * - No PAYMENT-SIGNATURE header → returns the standard 402 challenge
 *   (PAYMENT-REQUIRED header) built by the OKX Payment SDK.
 * - Valid PAYMENT-SIGNATURE → verified with the OKX facilitator; returns a
 *   settle() callback to execute settlement after the audit succeeds.
 * - Missing credentials / facilitator down → { type: "unavailable" } so the
 *   caller can fall back to the legacy challenge.
 */
export async function processOkxPayment(
  request: Request,
  parsedBody: unknown,
  params: JudgeRequestParams,
): Promise<OkxPaymentResult> {
  const baseServer = await getCachedBaseServer();
  if (!baseServer) return { type: "unavailable" };

  const routeConfig = buildRouteConfig(params);
  const httpServer = new x402HTTPResourceServer(baseServer, {
    "GET /api/judge": routeConfig,
    "POST /api/judge": routeConfig,
  });

  const adapter = createRequestAdapter(request, parsedBody);
  const context: HTTPRequestContext = {
    adapter,
    path: adapter.getPath(),
    method: adapter.getMethod(),
    paymentHeader: adapter.getHeader("payment-signature"),
  };

  const result = await httpServer.processHTTPRequest(context);

  if (result.type === "payment-error") {
    return { type: "payment-error", response: result.response };
  }

  if (result.type === "payment-verified") {
    const { paymentPayload, paymentRequirements, declaredExtensions } = result;
    return {
      type: "payment-verified",
      settle: async () => {
        const settleResult = await httpServer.processSettlement(
          paymentPayload,
          paymentRequirements,
          declaredExtensions,
          { request: context },
        );
        if (settleResult.success) {
          return {
            success: true,
            headers: settleResult.headers,
            transaction: (settleResult as { transaction?: string }).transaction,
          };
        }
        return { success: false, response: settleResult.response };
      },
    };
  }

  // "no-payment-required" should not happen for our protected routes, but if the
  // route matcher misses, treat as unavailable so the legacy flow still guards.
  return { type: "unavailable" };
}

/** Convert SDK HTTPResponseInstructions into a Fetch API Response. */
export function instructionsToResponse(instructions: HTTPResponseInstructions): Response {
  const headers = new Headers(instructions.headers);

  if (instructions.isHtml) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "text/html; charset=utf-8");
    return new Response(String(instructions.body ?? ""), {
      status: instructions.status,
      headers,
    });
  }
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const body =
    typeof instructions.body === "string"
      ? instructions.body
      : JSON.stringify(instructions.body ?? {});
  return new Response(body, { status: instructions.status, headers });
}
