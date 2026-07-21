import { promises as fs } from "fs";
import path from "path";

/**
 * Local file storage.
 *
 * Files are written to disk under UPLOAD_DIR (default: <project root>/uploads)
 * and served statically by the Express server at `${PUBLIC_BASE_URL}/uploads`.
 *
 * This works the same locally and on the VPS as long as:
 *   - the process is started from the project root (npm run dev / npm start), and
 *   - PUBLIC_BASE_URL points at the server's public origin on the VPS.
 */

// Absolute path to the directory where uploads are stored on disk.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

// Public URL prefix that maps to UPLOAD_DIR (see express.static in server.ts).
export const UPLOAD_ROUTE = "/uploads";

// Public origin of the server. On the VPS set PUBLIC_BASE_URL=https://your-domain
function getBaseUrl(): string {
  const base =
    process.env.PUBLIC_BASE_URL ||
    `http://localhost:${process.env.PORT || 3000}`;
  return base.replace(/\/+$/, "");
}

function sanitize(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Persist an uploaded (multer) file to local disk and return its public URL.
 * Signature is kept compatible with the previous Supabase helper.
 */
export async function uploadFile(file: any, folder: string): Promise<string> {
  if (!file || !file.buffer) {
    throw new Error("No file provided for upload");
  }

  // Normalise the target folder (allow nested folders like "kyc/user-id").
  const safeFolder = folder
    .split("/")
    .map((segment) => sanitize(segment))
    .filter(Boolean)
    .join("/");

  const originalName = sanitize(file.originalname || "file");
  const fileName = `${Date.now()}-${originalName}`;

  const destDir = path.join(UPLOAD_DIR, safeFolder);
  const destPath = path.join(destDir, fileName);

  await fs.mkdir(destDir, { recursive: true });
  await fs.writeFile(destPath, file.buffer);

  // Build the public URL (forward slashes regardless of OS).
  const relativeUrl = [UPLOAD_ROUTE, safeFolder, fileName]
    .filter(Boolean)
    .join("/");

  return `${getBaseUrl()}${relativeUrl}`;
}

// Backwards-compatible alias so existing imports keep working.
export const uploadToSupabase = uploadFile;
