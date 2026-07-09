import { supabase } from "./supabase";

export async function uploadToSupabase(file: any, folder: string) {
  const ext = file.originalname.split(".").pop();
  const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from("jollyhq_files")
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("jollyhq_files")
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}
