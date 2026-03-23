import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { expo } from "@better-auth/expo";

import { sendVerificationEmail } from "./mail";
import { createAuthMiddleware } from "better-auth/api";
import {
  emailOTP,
  phoneNumber,
  haveIBeenPwned,
  lastLoginMethod,
  username,
} from "better-auth/plugins";
import { sendVerifyPhoneOTP } from "./twilio";
import { wallets } from "../db/schema";
import WalletService from "../services/walletServices";
import { WalletController } from "../controllers/walletController";
const walletServices = new WalletService();
const wallletController = new WalletController();
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // "mysql" | "sqlite"
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    autoSignIn: false,
  },

  user: {
    fields: {
      name: "firstName",
    },

    additionalFields: {
      lastName: {
        type: "string",
        required: true,
      },
      phoneNumber: {
        type: "string",
        required: false,
      },
      phoneNumberVerified: {
        type: "boolean",
        required: false,
      },
      // Legal
      agreedToTerms: {
        type: "boolean",
        required: false,
      },
    },
  },
  account: {
    modelName: "account",
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        const { firstName, ...rest } = ctx.body;
        return {
          context: {
            ...ctx,
            body: {
              ...rest,
              name: firstName,
            },
          },
        };
      }
    }),
    // after: createAuthMiddleware(async (ctx) => {
    //   // console.log(ctx.headers);
    //   try {
    //     if (ctx.path === "/sign-up/email") {
    //       const returned = ctx.context.returned as any;
    //       await db.transaction(async (tx) => {
    //         const newWallet = await walletServices.createVirtualAccount(
    //           `${ctx.body.name} ${ctx.body.lastName}`,
    //           `JOLLYHQ-${Date.now()}`,
    //         );

    //         await tx.insert(wallets).values({
    //           userId: returned.user.id,
    //           accountId: newWallet.accountHolderId,
    //         });
    //       });
    //     }
    //   } catch (error) {
    //     console.log("reet", error);
    //   }
    // }),
  },
  trustedOrigins: [
    "jollyhq://",
    ...(process.env.NODE_ENV === "development"
      ? [
          "exp://", // Trust all Expo URLs (prefix matching)
          "exp://**", // Trust all Expo URLs (wildcard matching)
          "exp://192.168.*.*:*/**", // Trust 192.168.x.x IP range with any port and path
          "jollyhq://",
        ]
      : []),
  ],

  advanced: {
    database: {
      generateId: (opt) => {
        if (opt.model === "user" || opt.model === "users") {
          return false;
        }

        return crypto.randomUUID();
      },
    },
  },

  plugins: [
    expo({ disableOriginOverride: true }),
    haveIBeenPwned({}),
    username({
      usernameValidator: (username) => {
        if (username === "admin") {
          return false;
        }
        return true;
      },
      displayUsernameValidator: (displayUsername) => {
        // Allow only alphanumeric characters, underscores, and hyphens
        return /^[a-zA-Z0-9_-]+$/.test(displayUsername);
      },
      displayUsernameNormalization: (displayUsername) =>
        displayUsername.toLowerCase(),
    }),
    lastLoginMethod({ storeInDatabase: true }),

    emailOTP({
      sendVerificationOnSignUp: true,
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type === "email-verification") {
          await sendVerificationEmail(email, "Verify Email", otp);
        } else if (type === "forget-password") {
          await sendVerificationEmail(email, "Password Reset", otp);
        }
      },
    }),

    phoneNumber({
      sendOTP: async ({ phoneNumber, code }, ctx) => {
        await sendVerifyPhoneOTP(phoneNumber, code);
        // Implement sending OTP code via SMS
      },
    }),
  ],
  onAPIError: {
    onError: (err, ctx) => {
      console.log("error", err);
    },
  },
});
