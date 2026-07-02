"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.superadmin = exports.admin = exports.user = exports.ac = void 0;
const better_auth_1 = require("better-auth");
const drizzle_1 = require("better-auth/adapters/drizzle");
const db_1 = require("../db");
const expo_1 = require("@better-auth/expo");
const mail_1 = require("./mail");
const api_1 = require("better-auth/api");
const plugins_1 = require("better-auth/plugins");
const access_1 = require("better-auth/plugins/admin/access");
const twilio_1 = require("./twilio");
const walletServices_1 = __importDefault(require("../services/walletServices"));
const walletController_1 = require("../controllers/walletController");
const walletServices = new walletServices_1.default();
const wallletController = new walletController_1.WalletController();
const statement = {
    ...access_1.defaultStatements,
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
};
exports.ac = (0, plugins_1.createAccessControl)(statement);
exports.user = exports.ac.newRole({
    events: ["create", "read"],
    tickets: ["create", "read"],
    orders: ["create", "read"],
    wallet: ["read"],
    transactions: ["read"],
    chats: ["create", "read"],
    messages: ["create", "read"],
    favorites: ["create", "read", "delete"],
});
exports.admin = exports.ac.newRole({
    ...access_1.adminAc.statements,
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
});
exports.superadmin = exports.ac.newRole({
    ...access_1.adminAc.statements,
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
});
exports.auth = (0, better_auth_1.betterAuth)({
    database: (0, drizzle_1.drizzleAdapter)(db_1.db, {
        provider: "pg", // "mysql" | "sqlite"
    }),
    baseURL: process.env.BETTER_AUTH_URL,
    socialProviders: {
        google: {
            prompt: "select_account",
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
            clientId: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
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
        before: (0, api_1.createAuthMiddleware)(async (ctx) => {
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
        (0, expo_1.expo)({ disableOriginOverride: true }),
        (0, plugins_1.haveIBeenPwned)({}),
        (0, plugins_1.admin)({
            ac: exports.ac,
            roles: {
                admin: exports.admin,
                user: exports.user,
                superadmin: exports.superadmin,
            },
            defaultRole: "user",
        }),
        (0, plugins_1.username)({
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
            displayUsernameNormalization: (displayUsername) => displayUsername.toLowerCase(),
        }),
        (0, plugins_1.lastLoginMethod)({ storeInDatabase: true }),
        (0, plugins_1.emailOTP)({
            sendVerificationOnSignUp: true,
            sendVerificationOTP: async ({ email, otp, type }) => {
                if (type === "email-verification") {
                    await (0, mail_1.sendVerificationEmail)(email, "Verify Email", otp);
                }
                else if (type === "forget-password") {
                    await (0, mail_1.sendVerificationEmail)(email, "Password Reset", otp);
                }
            },
        }),
        (0, plugins_1.phoneNumber)({
            sendOTP: async ({ phoneNumber, code }, ctx) => {
                await (0, twilio_1.sendVerifyPhoneOTP)(phoneNumber, code);
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
