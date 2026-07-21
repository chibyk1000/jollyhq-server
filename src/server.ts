import dotenv from "dotenv";
dotenv.config();
import express from "express";
import router from "./routes";
import { logError, logInfo } from "./utils/logger";
import { toNodeHandler } from "better-auth/node";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./sockets";
import { auth } from "./utils/auth";
import cors from "cors";
import { MulterError } from "multer";
import { MAX_UPLOAD_SIZE_LABEL } from "./middlewares/upload";
import { appendFileSync } from "fs";
import { UPLOAD_DIR, UPLOAD_ROUTE } from "./utils/upload";

const PORT = process.env.PORT;
const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
app.use(
  cors({
    origin: [
      "jollyhq://*",
      "http://localhost:5173",
      "https://admin.jollyhq.net",
    ], // Replace with your frontend's origin

    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
);
// Express middleware
app.use((req, res, next) => {
  const expoOrigin = req.headers["expo-origin"]; // custom header from Expo

  if (expoOrigin) {
    req.headers["origin"] = expoOrigin as string;
    logInfo("Origin set from Expo header", {
      origin: req.headers["origin"],
      path: req.path,
    });
  }

  next();
});

// Configure CORS middleware

registerSocketHandlers(io);

// Log each request
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logInfo(message.trim()),
    },
  }),
);

// TEMP DEBUG: trace every request so we can tell which device reaches the server.
app.use((req, _res, next) => {
  const trace = (event: string, extra?: unknown) =>
    appendFileSync(
      "/tmp/jollyhq-upload-trace.log",
      `${new Date().toISOString()} ${event} ${JSON.stringify(extra ?? {})}\n`,
    );

  trace("REQUEST_IN", {
    method: req.method,
    url: req.originalUrl,
    ip: req.socket.remoteAddress,
    ua: req.headers["user-agent"],
    contentType: req.headers["content-type"],
    contentLength: req.headers["content-length"],
    hasAuth: !!req.headers.authorization,
  });

  if (req.method === "POST" && req.originalUrl.includes("event-planners")) {
    req.on("aborted", () => trace("REQUEST_ABORTED"));
    req.on("error", (err) => trace("REQUEST_ERROR", { message: err.message }));
    _res.on("finish", () => trace("RESPONSE_SENT", { status: _res.statusCode }));
    _res.on("close", () =>
      trace("CONNECTION_CLOSED", {
        status: _res.statusCode,
        finished: _res.writableFinished,
      }),
    );
  }
  next();
});

app.all("/api/auth/*splat", toNodeHandler(auth));

// Serve uploaded files from local disk (same behaviour in dev and on the VPS).
app.use(UPLOAD_ROUTE, express.static(UPLOAD_DIR));

app.use(express.json());
app.use("/api", router);

app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logError("Unhandled request error", err, {
      method: req.method,
      url: req.originalUrl,
    });

    // TEMP DEBUG
    appendFileSync(
      "/tmp/jollyhq-upload-trace.log",
      `${new Date().toISOString()} HANDLER_ERROR ${JSON.stringify({
        url: req.originalUrl,
        name: (err as Error)?.name,
        message: (err as Error)?.message,
        code: (err as any)?.code,
      })}\n`,
    );

    if (err instanceof MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `${err.field ?? "File"} is too large. Maximum size is ${MAX_UPLOAD_SIZE_LABEL}.`
          : `Upload failed: ${err.message}`;

      res.status(413).json({ message });
      return;
    }

    res.status(500).json({ message: "Internal server error" });
  },
);

server.listen(PORT, () => {
  logInfo(`🚀 Server listening on port ${PORT}`);
});

server.on("error", (error) => {
  logError("Server failed to start", error);
  process.exit(1);
});

export default app;
