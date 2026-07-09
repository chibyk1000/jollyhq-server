import dotenv from "dotenv";
dotenv.config();
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./dist/db/schema/**/*js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
}); 
