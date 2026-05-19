import { db } from "./db";
import { user } from "./db/schema/profiles";
import { account } from "./db/schema/account";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

const users = [
  {
    email: "user1@example.com",
    username: "user1",
    displayUsername: "user1",
    password: "password123",
    firstName: "John",
    lastName: "Doe",
    role: "user",
  },
  {
    email: "user2@example.com",
    username: "user2",
    displayUsername: "user2",
    password: "password123",
    firstName: "Jane",
    lastName: "Smith",
    role: "user",
  },
  {
    email: "admin@example.com",
    username: "admin",
    displayUsername: "admin",
    password: "admin123",
    firstName: "Admin",
    lastName: "User",
    role: "admin",
  },
  {
    email: "superadmin@example.com",
    username: "superadmin",
    displayUsername: "superadmin",
    password: "superadmin123",
    firstName: "Super",
    lastName: "Admin",
    role: "superadmin",
  },
];

async function seed() {
  console.log("🌱 Starting seed...");

  for (const userData of users) {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`⏭️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const userId = uuidv4();

      // Insert user and account in transaction
      await db.transaction(async (tx) => {
        // Insert user
        await tx.insert(user).values({
          id: userId,
          email: userData.email,
          username: userData.username,
          displayUsername: userData.displayUsername,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          agreedToTerms: true,
          emailVerified: true,
        });

        // Insert account with password
        await tx.insert(account).values({
          id: uuidv4(),
          accountId: userId,
          providerId: "credential",
          userId: userId,
          password: hashedPassword,
        });
      });

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error);
    }
  }

  console.log("🎉 Seed completed!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
