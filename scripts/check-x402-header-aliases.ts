import assert from "node:assert/strict";
import { resolveX402PaymentHeader } from "../src/lib/x402/payment-header.ts";

const payload = Buffer.from(
  JSON.stringify({
    x402Version: 2,
    resource: {
      url: "https://www.jurixai.xyz/api/judge",
      description: "Header compatibility check",
      mimeType: "application/json",
    },
    accepted: {
      scheme: "exact",
      network: "eip155:196",
      amount: "1000",
      asset: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
      payTo: "0x75f072ea874d3348c593aab9cffec2ee5ff44276",
      maxTimeoutSeconds: 300,
      extra: { name: "USD₮0", version: "1" },
    },
    payload: {
      signature: "0xsignature",
      authorization: { nonce: "0xnonce" },
    },
  }),
).toString("base64");

assert.equal(resolveX402PaymentHeader(new Headers({ "PAYMENT-SIGNATURE": payload })), payload);
assert.equal(resolveX402PaymentHeader(new Headers({ "X-PAYMENT": payload })), payload);
assert.equal(
  resolveX402PaymentHeader(new Headers({ "PAYMENT-SIGNATURE": "canonical", "X-PAYMENT": payload })),
  "canonical",
);
assert.equal(resolveX402PaymentHeader(new Headers({ "X-PAYMENT": "invalid" })), undefined);
assert.equal(
  resolveX402PaymentHeader(new Headers({ Authorization: `Payment ${payload}` })),
  payload,
);
assert.equal(
  resolveX402PaymentHeader(new Headers({ Authorization: `Bearer ${payload}` })),
  payload,
);
assert.equal(resolveX402PaymentHeader(new Headers({ Authorization: payload })), payload);
assert.equal(resolveX402PaymentHeader(new Headers({ Authorization: "Bearer invalid" })), undefined);

console.log("x402 header alias checks passed");
