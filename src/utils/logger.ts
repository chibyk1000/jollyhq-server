// logger.ts
import winston, { createLogger, transports, format } from "winston";

const { combine, timestamp, printf, colorize, json } = format;

const consoleFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});
winston.addColors({
  info: "bold green",
  warn: "italic yellow",
  error: "bold red underline",
  debug: "cyan",
});
export const logger = createLogger({
  level: "info",
  format: combine(timestamp(), json()), // default format (for files)
  transports: [
    new transports.Console({
      format: combine(
        colorize({ all: true }), // add colors
        timestamp(),
        consoleFormat
      ),
    }),
    new transports.File({ filename: "logs/server.log" }),
  ],
});
