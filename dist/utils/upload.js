"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToSupabase = uploadToSupabase;
const supabase_1 = require("./supabase");
async function uploadToSupabase(file, folder) {
    const ext = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    const filePath = `${folder}/${fileName}`;
    const { error } = await supabase_1.supabase.storage
        .from("jollyhq_files")
        .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
    });
    if (error)
        throw error;
    const { data } = supabase_1.supabase.storage
        .from("jollyhq_files")
        .getPublicUrl(filePath);
    return data.publicUrl;
}
