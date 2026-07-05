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

    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
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

app.all("/api/auth/*splat", toNodeHandler(auth));
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
