"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./routes"));
const logger_1 = require("./utils/logger");
const PORT = process.env.PORT;
const app = (0, express_1.default)();
// Log each request
// app.use(
//   morgan("combined", {
//     stream: {
//       write: (message) => logger.info(message.trim()),
//     gi},
//   })
// );
app.use(express_1.default.json());
app.use("/api", routes_1.default);
app.listen(PORT, () => {
    logger_1.logger.info(`🚀 Server listening on port ${PORT}`);
});
exports.default = app;
