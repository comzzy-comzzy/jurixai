import { createHash } from "node:crypto";

export type X402ReplayResponse = Record<string, unknown>;

export type X402ReplayRecord = {
  version: 1;
  type: "jurixai-x402-audit";
  requestFingerprint: string;
  transaction: string | null;
  response: X402ReplayResponse;
  settlementHeaders: Record<string, string>;
};

type X402ReplayRequest = {
  repositories: string[];
  agentSlugs: string[];
  description: string;
  hackathonBrief: string | null;
  hackathonName: string | null;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function createX402PaymentKey(paymentSignature: string): string {
  return `x402:${sha256(paymentSignature)}`;
}

export function createX402RequestFingerprint(request: X402ReplayRequest): string {
  return sha256(JSON.stringify(request));
}

export function serializeX402ReplayRecord(record: X402ReplayRecord): string {
  return JSON.stringify(record);
}

export function parseX402ReplayRecord(value: unknown): X402ReplayRecord | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const parsed = JSON.parse(value) as Partial<X402ReplayRecord>;
    if (
      parsed.version !== 1 ||
      parsed.type !== "jurixai-x402-audit" ||
      typeof parsed.requestFingerprint !== "string" ||
      !parsed.response ||
      typeof parsed.response !== "object" ||
      !parsed.settlementHeaders ||
      typeof parsed.settlementHeaders !== "object"
    ) {
      return null;
    }

    return parsed as X402ReplayRecord;
  } catch {
    return null;
  }
}
