import 'dotenv/config';
import { x402Client, x402HTTPClient } from '@okxweb3/x402-core/client';
import { ExactEvmScheme } from '@okxweb3/x402-evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, http, formatUnits } from 'viem';

const endpoint = 'https://www.jurixai.xyz/api/judge';
const repo = 'https://github.com/comzzy-comzzy/splitra';
const description = 'Splitra is a decentralized expense-splitting application. Audit whether the repository implements clear payment flows, secure wallet and transaction handling, usable group expense management, original Web3 functionality, and complete documentation and execution.';
const agent = '4964';
const privateKey = process.env.JURIX_OPERATOR_PRIVATE_KEY || process.env.PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
if (!privateKey) throw new Error('No private key env found');
const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);
const chain = { id: 196, name: 'X Layer', nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 }, rpcUrls: { default: { http: [process.env.XLAYER_RPC_URL || 'https://rpc.xlayer.tech'] } } };
const publicClient = createPublicClient({ chain, transport: http() });
const signer = {
  address: account.address,
  signTypedData: (message) => account.signTypedData(message),
  readContract: (args) => publicClient.readContract(args),
};

const balanceAbi = [{ type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }];
const token = '0x779ded0c9e1022225f8e0630b35a9b54be713736';
const balance = await publicClient.readContract({ address: token, abi: balanceAbi, functionName: 'balanceOf', args: [account.address] });
console.log(JSON.stringify({ signer: account.address, usdtBalance: formatUnits(balance, 6) }));

const requestBody = JSON.stringify({ agent, repo, description });
const first = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: requestBody });
console.log(JSON.stringify({ firstStatus: first.status }));
if (first.status !== 402) {
  console.log(await first.text());
  process.exit(0);
}
const httpClient = new x402HTTPClient(new x402Client().register('eip155:196', new ExactEvmScheme(signer)));
const paymentRequired = httpClient.getPaymentRequiredResponse((name) => first.headers.get(name));
const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
console.log(JSON.stringify({ accepted: paymentPayload.accepted, payloadKeys: Object.keys(paymentPayload.payload || {}) }));
if (process.env.SEND_PAYMENT !== '1') process.exit(0);
const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);
const paid = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: requestBody });
console.log(JSON.stringify({ paidStatus: paid.status, paymentResponse: paid.headers.get('PAYMENT-RESPONSE') }));
const paidText = await paid.text();
console.log(paidText);
if (!paid.ok) process.exit(1);

const result = JSON.parse(paidText);
const evaluations = Array.isArray(result.evaluations) ? result.evaluations : [];
const allFourReal =
  evaluations.length === 4 &&
  evaluations.every((evaluation) =>
    typeof evaluation.score === 'number' &&
    evaluation.locked !== true &&
    !evaluation.flags?.includes('LOCKED_SANDBOX') &&
    !evaluation.flags?.includes('fallback_scoring') &&
    !evaluation.evidence?.some((item) => String(item).startsWith('model_error:')),
  );
const judgeWeights = { Vex: 35, Kael: 25, Oryn: 20, Zera: 20 };
const totalWeight = evaluations.reduce((sum, evaluation) => sum + (judgeWeights[evaluation.agent] || 0), 0);
const computedAverage = Number(
  (
    evaluations.reduce(
      (sum, evaluation) => sum + evaluation.score * (judgeWeights[evaluation.agent] || 0),
      0,
    ) / totalWeight
  ).toFixed(2),
);
const roleEvidencePatterns = {
  Vex: /contract|code|package\.json|test|lint|security|script|structure|maintain/i,
  Kael: /product|ux|flow|user|cli|wallet|payment|setup|journey/i,
  Oryn: /innovation|novel|original|architecture|policy|routing|automation|splitter/i,
  Zera: /delivery|complete|readme|documentation|deploy|config|environment|ci|setup/i,
};
const repositoryEvidencePattern =
  /splitra|splitravault|contracts?\/|scripts?\/|package\.json|readme|agents\/openai\.yaml/i;
const descriptionReflected = evaluations.every((evaluation) => {
  const auditText = `${evaluation.rationale} ${(evaluation.evidence || []).join(' ')}`;
  const rolePattern = roleEvidencePatterns[evaluation.agent];
  return repositoryEvidencePattern.test(auditText) && Boolean(rolePattern?.test(auditText));
});
const summary = {
  settledTransaction: result.txHash,
  evaluations: evaluations.length,
  allFourReal,
  returnedAverageScore: result.averageScore,
  computedAverage,
  averageMatches: result.averageScore === computedAverage,
  averageScoreBasis: result.averageScoreBasis,
  descriptionReflected,
};
console.log(JSON.stringify({ validation: summary }, null, 2));
if (!allFourReal || !summary.averageMatches || !summary.descriptionReflected) process.exit(1);
