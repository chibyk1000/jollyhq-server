// src/constants/walletOwnerTypes.ts
export const WALLET_OWNER_TYPES = {
  USER: "user",
  VENDOR: "vendor",
  EVENT_PLANNER: "event_planner",
} as const;

export type WalletOwnerType =
  (typeof WALLET_OWNER_TYPES)[keyof typeof WALLET_OWNER_TYPES];
