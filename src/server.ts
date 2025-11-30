import dotenv from "dotenv";
dotenv.config();
import express from "express";
import router from "./routes";
import { logger } from "./utils/logger";


const PORT = process.env.PORT;
const app = express();

// Log each request
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });
  next();
});

app.use("/api", router);

app.listen(PORT, () => {
  logger.info(`🚀 Server listening on port ${PORT}`);
});
