import assert from "node:assert/strict";
import {
  createX402PaymentKey,
  createX402RequestFingerprint,
  parseX402ReplayRecord,
  serializeX402ReplayRecord,
} from "../src/lib/x402/replay-cache.ts";

const request = {
  repositories: ["https://github.com/openai/codex"],
  agentSlugs: ["vex-01", "kael-02"],
  description: "Audit the repository",
  hackathonBrief: null,
  hackathonName: null,
};

assert.equal(createX402PaymentKey("signature"), createX402PaymentKey("signature"));
assert.notEqual(createX402PaymentKey("signature"), createX402PaymentKey("other-signature"));
assert.equal(createX402RequestFingerprint(request), createX402RequestFingerprint(request));
assert.notEqual(
  createX402RequestFingerprint(request),
  createX402RequestFingerprint({ ...request, description: "Different request" }),
);

const serialized = serializeX402ReplayRecord({
  version: 1,
  type: "jurixai-x402-audit",
  requestFingerprint: createX402RequestFingerprint(request),
  transaction: "0xtransaction",
  response: { ok: true },
  settlementHeaders: { "PAYMENT-RESPONSE": "settled" },
});

assert.deepEqual(parseX402ReplayRecord(serialized)?.response, { ok: true });
assert.equal(parseX402ReplayRecord("invalid"), null);

console.log("x402 replay cache checks passed");
