import winston, { createLogger, transports, format } from "winston";

const { combine, timestamp, printf, colorize, json } = format;

const consoleFormat = printf(({ level, message, timestamp }) => {
  return `[${timestamp}] ${level}: ${message}`;
});

// detect serverless or cloud env
const isServerless = !!process.env.VERCEL;

winston.addColors({
  info: "bold green",
  warn: "italic yellow",
  error: "bold red underline",
  debug: "cyan",
});

export const logger = createLogger({
  level: "info",
  format: combine(timestamp(), json()),
  transports: [
    new transports.Console({
      format: combine(colorize({ all: true }), timestamp(), consoleFormat),
    }),
    // only enable file logging locally
    ...(isServerless
      ? []
      : [new transports.File({ filename: "logs/server.log" })]),
  ],
});
