"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const nombaApi = axios_1.default.create({
    baseURL: process.env.NOMBA_BASE_URL,
    headers: {
        Authorization: `Bearer ${process.env.NOMBA_SECRET_KEY}`,
        "Content-Type": "application/json",
        accountId: process.env.NOMBA_ACCOUNT_ID,
    },
});
exports.default = nombaApi;
