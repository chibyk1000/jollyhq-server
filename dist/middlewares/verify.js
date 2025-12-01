"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySupabaseToken = verifySupabaseToken;
const supabase_1 = require("../utils/supabase");
async function verifySupabaseToken(req, res, next) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token)
        return res.status(401).json({ message: "No token" });
    const { data, error } = await supabase_1.supabase.auth.getUser(token);
    if (error)
        return res.status(403).json({ message: "Invalid token" });
    req.user = data.user;
    next();
}
