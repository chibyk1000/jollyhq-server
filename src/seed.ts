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
    password: "admin123",
    name: "Admin User",
    role: "superadmin",
    data: {
      username: "admin",
      displayUsername: "admin",
      firstName: "Admin",
      lastName: "User",
      agreedToTerms: true,
      emailVerified: true,
    },
  },
  {
    email: "user1@example.com",
    password: "password123",
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

async function seed() {
  console.log("🌱 Starting seed...");

  for (const userData of users) {
    try {
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`⏭️ ${userData.email} already exists`);
        continue;
      }

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

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Failed: ${userData.email}`, error);
    }
  }

  console.log("🎉 Seed completed");
  process.exit(0);
}

seed();
