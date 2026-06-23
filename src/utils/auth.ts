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
  admin as adminPlugin,
  createAccessControl,
} from "better-auth/plugins";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";
import { sendVerifyPhoneOTP } from "./twilio";
import { wallets } from "../db/schema";
import WalletService from "../services/walletServices";
import { WalletController } from "../controllers/walletController";
const walletServices = new WalletService();
const wallletController = new WalletController();

const statement = {
  ...defaultStatements,
  events: ["create", "read", "update", "delete", "share"],
  tickets: ["create", "read", "update", "delete"],
  orders: ["create", "read", "update", "delete"],
  vendors: ["create", "read", "update", "delete"],
  eventPlanners: ["create", "read", "update", "delete"],
  wallet: ["read", "update"],
  transactions: ["read"],
  chats: ["create", "read", "update", "delete"],
  messages: ["create", "read", "update", "delete"],
  favorites: ["create", "read", "delete"],
  vendorServices: ["create", "read", "update", "delete"],
  vendorBooking: ["create", "read", "update", "delete"],
  withdrawalRequests: ["create", "read", "update", "delete"],
} as const;
export const ac = createAccessControl(statement);


export const user = ac.newRole({
  events: ["create", "read"],
  tickets: ["create", "read"],
  orders: ["create", "read"],
  wallet: ["read"],
  transactions: ["read"],
  chats: ["create", "read"],
  messages: ["create", "read"],
  favorites: ["create", "read", "delete"],
});

export const admin = ac.newRole({
  ...adminAc.statements,
  events: ["create", "read", "update", "share"],
  tickets: ["create", "read", "update"],
  orders: ["create", "read", "update"],
  vendors: ["create", "read", "update"],
  eventPlanners: ["create", "read", "update"],
  wallet: ["read", "update"],
  transactions: ["read"],
  chats: ["create", "read", "update"],
  messages: ["create", "read", "update"],
  favorites: ["create", "read", "delete"],
  vendorServices: ["create", "read", "update"],
  vendorBooking: ["create", "read", "update"],
  withdrawalRequests: ["create", "read", "update"],
} as const);

export const superadmin = ac.newRole({
  ...adminAc.statements,
  events: ["create", "read", "update", "delete", "share"],
  tickets: ["create", "read", "update", "delete"],
  orders: ["create", "read", "update", "delete"],
  vendors: ["create", "read", "update", "delete"],
  eventPlanners: ["create", "read", "update", "delete"],
  wallet: ["read", "update"],
  transactions: ["read"],
  chats: ["create", "read", "update", "delete"],
  messages: ["create", "read", "update", "delete"],
  favorites: ["create", "read", "delete"],
  vendorServices: ["create", "read", "update", "delete"],
  vendorBooking: ["create", "read", "update", "delete"],
  withdrawalRequests: ["create", "read", "update", "delete"],
} as const);
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // "mysql" | "sqlite"
  }),
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      mapProfileToUser: (profile) => {
        console.log("google profile", profile);
        return {
          name: profile.family_name ?? "nil",
          lastName: profile.given_name ?? "nil",
          username: `${profile.email.split("@")[0]}-${profile.sub.slice(-6)}`,
          google_id: profile.sub,
          agreed_to_terms: true, // or whatever default makes sense
        };
      },
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
      mapProfileToUser: (profile) => {
     
        return {
          name: profile.name.split(" ")[0] ?? "nil",
          lastName: profile.name.split(" ")[1] ?? "nil",
          username: `${profile.name.split(" ")[0]}-${profile.id.slice(-6)}`,
          facebook_id: profile.id,
          agreed_to_terms: true, // or whatever default makes sense
        };
      }
    },
  },
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
    "http://localhost:5173",
    ...(process.env.NODE_ENV === "development"
      ? [
          "exp://", // Trust all Expo URLs (prefix matching)
          "exp://**", // Trust all Expo URLs (wildcard matching)
          "exp://192.168.*.*:*/**", // Trust 192.168.x.x IP range with any port and path
          "jollyhq://",
          "http://localhost:5173",
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
    adminPlugin({
      ac,
      roles: {
        admin,
        user,
        superadmin,
      },
      defaultRole: "user",
    }),
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
