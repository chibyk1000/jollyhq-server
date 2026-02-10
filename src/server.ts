import dotenv from "dotenv";
dotenv.config();
import express from "express";
import router from "./routes";
import { logger } from "./utils/logger";
 import { toNodeHandler } from "better-auth/node";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./sockets";
import { auth } from "./utils/auth";
import cors from "cors"
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
    origin: ["jollyhq://*"], // Replace with your frontend's origin

    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
);
// Express middleware
app.use(async (req, res, next) => {

  
  const expoOrigin = req.headers['expo-origin']; // custom header from Expo
  if (expoOrigin) {
    // Set it as the standard Origin header
    req.headers['origin'] = expoOrigin as string;
    console.log('Origin set from Expo header:', req.headers['origin']);
  } else {
    // console.log('No Expo origin, using existing origin:', req);
  }

  next();
});

// Configure CORS middleware

registerSocketHandlers(io);

 
// Log each requestn 
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json())
app.use("/api", router);

server.listen(PORT, () => {
  logger.info(`🚀 Server listening on port ${PORT}`);
});
export default app;
