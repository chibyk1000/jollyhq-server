"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
const node_1 = require("better-auth/node");
const morgan_1 = __importDefault(require("morgan"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const sockets_1 = require("./sockets");
const auth_1 = require("./utils/auth");
const cors_1 = __importDefault(require("cors"));
const PORT = process.env.PORT;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
    },
});
app.use((0, cors_1.default)({
    origin: [
        "jollyhq://*",
        "http://localhost:5173",
        "https://admin.jollyhq.net",
    ], // Replace with your frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));
// Express middleware
app.use((req, res, next) => {
    const expoOrigin = req.headers["expo-origin"]; // custom header from Expo
    if (expoOrigin) {
        req.headers["origin"] = expoOrigin;
        (0, logger_1.logInfo)("Origin set from Expo header", {
            origin: req.headers["origin"],
            path: req.path,
        });
    }
    next();
});
// Configure CORS middleware
(0, sockets_1.registerSocketHandlers)(exports.io);
// Log each request
app.use((0, morgan_1.default)("combined", {
    stream: {
        write: (message) => (0, logger_1.logInfo)(message.trim()),
    },
}));
app.all("/api/auth/*splat", (0, node_1.toNodeHandler)(auth_1.auth));
app.use(express_1.default.json());
app.use("/api", routes_1.default);
app.use((err, req, res, next) => {
    (0, logger_1.logError)("Unhandled request error", err, {
        method: req.method,
        url: req.originalUrl,
    });
    res.status(500).json({ message: "Internal server error" });
});
server.listen(PORT, () => {
    (0, logger_1.logInfo)(`🚀 Server listening on port ${PORT}`);
});
server.on("error", (error) => {
    (0, logger_1.logError)("Server failed to start", error);
    process.exit(1);
});
exports.default = app;
