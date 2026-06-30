export type AuthMethod = "email" | "passkey";

export interface AccountProfile {
  userId: string;
  email: string | null;
  authMethod: AuthMethod;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  payoutEvmAddress: string | null;
  payoutChain: string | null;
  walletAddress: string;
  walletChain: string;
  updatedAt: string | null;
}

export interface SaveAccountProfileInput {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  payoutEvmAddress: string;
  payoutChain: string;
}
