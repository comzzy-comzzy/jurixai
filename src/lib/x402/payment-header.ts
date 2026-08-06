import { parsePaymentPayload } from "@okxweb3/x402-core/schemas";

function normalizeCandidate(value: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/^(Payment|Bearer)\s+/i, "").trim();
  return normalized || undefined;
}

export function isValidPaymentSignature(value: string): boolean {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return parsePaymentPayload(JSON.parse(decoded)).success;
  } catch {
    return false;
  }
}

export function resolveX402PaymentHeader(headers: Headers): string | undefined {
  const canonical = normalizeCandidate(headers.get("payment-signature"));
  if (canonical) return canonical;

  const legacyAlias = normalizeCandidate(headers.get("x-payment"));
  if (legacyAlias && isValidPaymentSignature(legacyAlias)) return legacyAlias;

  const authorizationAlias = normalizeCandidate(headers.get("authorization"));
  if (authorizationAlias && isValidPaymentSignature(authorizationAlias)) {
    return authorizationAlias;
  }

  return undefined;
}
