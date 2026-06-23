"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = verifyToken;
const auth_1 = require("../utils/auth");
const node_1 = require("better-auth/node");
async function verifyToken(req, res, next) {
    const session = await auth_1.auth.api.getSession({
        headers: (0, node_1.fromNodeHeaders)(req.headers),
    });
    req.user = session?.user;
    next();
}
