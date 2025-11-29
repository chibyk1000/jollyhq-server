import { supabase } from "./supabase";
import fs from "fs/promises";
export async function uploadToSupabase(file: any, folder: string) {
  const fileBuffer = await fs.readFile(file.filepath);

  const fileName = `${Date.now()}-${file.originalFilename?.replace(
    /\s+/g,
    "-"
  )}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from("jollyhq_files")
    .upload(filePath, fileBuffer, {
      contentType: file.mimetype || undefined,
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("jollyhq_files").getPublicUrl(filePath);

  return publicUrl;
}
