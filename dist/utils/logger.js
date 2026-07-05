"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logInfo = exports.logger = void 0;
const winston_1 = __importStar(require("winston"));
const { combine, timestamp, printf, colorize, json } = winston_1.format;
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${message}${extra}`;
});
// detect serverless or cloud env
const isServerless = !!process.env.VERCEL;
winston_1.default.addColors({
    info: "bold green",
    warn: "italic yellow",
    error: "bold red underline",
    debug: "cyan",
});
const serializeError = (error) => {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }
    if (typeof error === "string") {
        return { message: error };
    }
    return error;
};
exports.logger = (0, winston_1.createLogger)({
    level: "info",
    format: combine(timestamp(), json()),
    transports: [
        new winston_1.transports.Console({
            format: combine(colorize({ all: true }), timestamp(), consoleFormat),
        }),
        // only enable file logging locally
        ...(isServerless
            ? []
            : [new winston_1.transports.File({ filename: "logs/server.log" })]),
    ],
});
const logInfo = (message, meta = {}) => {
    exports.logger.info(message, meta);
};
exports.logInfo = logInfo;
const logError = (message, error, meta = {}) => {
    exports.logger.error(message, {
        error: serializeError(error),
        ...meta,
    });
};
exports.logError = logError;
