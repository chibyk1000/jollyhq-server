"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = require("./db");
const profiles_1 = require("./db/schema/profiles");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("./utils/auth");
const users = [
    {
        email: "admin@jollyhq.net",
        password: "JollyHQ@Admin2026!X9",
        name: "Admin User",
        role: "superadmin",
        data: {
            username: "adminuser",
            displayUsername: "adminuser",
            firstName: "Admin",
            lastName: "User",
            agreedToTerms: true,
            emailVerified: true,
        },
    },
    {
        email: "user1@example.com",
        password: "JollyHQ@User12026!X9",
        name: "John Doe",
        role: "admin",
        data: {
            username: "user1",
            displayUsername: "user1",
            firstName: "John",
            lastName: "Doe",
            agreedToTerms: true,
            emailVerified: true,
        },
    },
];
const logInfo = (...args) => console.log("[SEED]", ...args);
const logError = (...args) => console.error("[SEED ERROR]", ...args);
async function seed() {
    logInfo("🌱 Starting seed...");
    for (const userData of users) {
        logInfo(`Processing user: ${userData.email}`);
        try {
            const existingUser = await db_1.db
                .select()
                .from(profiles_1.user)
                .where((0, drizzle_orm_1.eq)(profiles_1.user.email, userData.email))
                .limit(1);
            if (existingUser.length > 0) {
                logInfo(`⏭️ ${userData.email} already exists`);
                continue;
            }
            logInfo(`Creating ${userData.role} user: ${userData.email}`);
            await auth_1.auth.api.createUser({
                body: {
                    email: userData.email,
                    password: userData.password,
                    name: userData.name,
                    role: userData.role,
                    data: userData.data,
                },
            });
            logInfo(`✅ Created ${userData.role}: ${userData.email}`);
        }
        catch (error) {
            logError(`❌ Failed to seed user: ${userData.email}`, error);
        }
    }
    logInfo("🎉 Seed completed");
    process.exit(0);
}
seed();
