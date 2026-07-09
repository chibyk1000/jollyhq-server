import winston, { createLogger, transports, format } from "winston";

const { combine, timestamp, printf, colorize, json } = format;

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const pathInfo = meta.url || meta.path ? ` [${meta.url || meta.path}]` : "";
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level}: ${message}${pathInfo}${extra}`;
});

// detect serverless or cloud env
const isServerless = !!process.env.VERCEL;

winston.addColors({
  info: "bold green",
  warn: "italic yellow",
  error: "bold red underline",
  debug: "cyan",
});

const serializeError = (error: unknown) => {
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

const consoleTransport = new transports.Console({
  format: combine(colorize({ all: true }), timestamp(), consoleFormat),
});

const createLoggerInstance = (name: string, level: "info" | "error") =>
  createLogger({
    level,
    defaultMeta: { service: name },
    format: combine(timestamp(), json()),
    transports: [
      consoleTransport,
      new transports.File({
        filename:
          level === "error" ? "logs/server-error.log" : "logs/server.log",
      }),
    ],
  });

const normalLogger = createLoggerInstance("server", "info");
const errorLogger = createLoggerInstance("server-error", "error");

type LoggerLike = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (
    message: string,
    errorOrMeta?: unknown,
    meta?: Record<string, unknown>,
  ) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
};

export const logger: LoggerLike = {
  info: (message, meta = {}) => normalLogger.info(message, meta),
  warn: (message, meta = {}) => normalLogger.warn(message, meta),
  error: (message, errorOrMeta, meta = {}) => {
    if (
      errorOrMeta &&
      typeof errorOrMeta === "object" &&
      !Array.isArray(errorOrMeta)
    ) {
      errorLogger.error(message, {
        ...(errorOrMeta as Record<string, unknown>),
        ...meta,
      });
      return;
    }

    errorLogger.error(message, {
      error: serializeError(errorOrMeta),
      ...meta,
    });
  },
  debug: (message, meta = {}) => normalLogger.debug(message, meta),
};

export const logInfo = (
  message: string,
  meta: Record<string, unknown> = {},
) => {
  logger.info(message, meta);
};

export const logError = (
  message: string,
  error?: unknown,
  meta: Record<string, unknown> = {},
) => {
  logger.error(message, error, meta);
};
