import dotenv from "dotenv";
dotenv.config();
import { db } from "./db";
import { user } from "./db/schema/profiles";
import { account } from "./db/schema/account";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import { admin, auth, user as adminuser, superadmin } from "./utils/auth";

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

const logInfo = (...args: unknown[]) => console.log("[SEED]", ...args);
const logError = (...args: unknown[]) => console.error("[SEED ERROR]", ...args);

async function seed() {
  logInfo("🌱 Starting seed...");

  for (const userData of users) {
    logInfo(`Processing user: ${userData.email}`);

    try {
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        logInfo(`⏭️ ${userData.email} already exists`);
        continue;
      }

      logInfo(`Creating ${userData.role} user: ${userData.email}`);

      await auth.api.createUser({
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role as
            | "user"
            | "admin"
            | "superadmin"
            | ("user" | "admin" | "superadmin")[]
            | undefined,
          data: userData.data,
        },
      });

      logInfo(`✅ Created ${userData.role}: ${userData.email}`);
    } catch (error) {
      logError(`❌ Failed to seed user: ${userData.email}`, error);
    }
  }

  logInfo("🎉 Seed completed");
  process.exit(0);
}

seed();
