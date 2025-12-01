import dotenv from "dotenv";
dotenv.config();
import express from "express";
import router from "./routes";
import { logger } from "./utils/logger";
import morgan from "morgan";

const PORT = process.env.PORT;
const app = express();

// Log each request
// app.use(
//   morgan("combined", {
//     stream: {
//       write: (message) => logger.info(message.trim()),
//     gi},
//   })
// );
app.use(express.json())
app.use("/api", router);

app.listen(PORT, () => {
  logger.info(`🚀 Server listening on port ${PORT}`);
});
export default app;
