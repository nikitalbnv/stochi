import { env } from "~/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const isDev = env.NODE_ENV === "development";
const configuredLevel = env.LOG_LEVEL ?? (isDev ? "debug" : "info");
const logFormat = env.LOG_FORMAT ?? (isDev ? "pretty" : "json");
const serviceName = env.SERVICE_NAME ?? "stochi-web";
const lokiUrl = env.LOG_LOKI_URL;
const lokiUsername = env.LOG_LOKI_USERNAME;
const lokiToken = env.LOG_LOKI_TOKEN;
const redactedValue = "[redacted]";
const sensitiveKeyPattern = /authorization|cookie|password|secret|token|key/i;

interface LogOptions {
  /** Optional context/module name for the log */
  context?: string;
  /** Additional data to log */
  data?: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  message: string;
  context?: string;
  data?: unknown;
}

function shouldLog(level: LogLevel): boolean {
  return levelPriority[level] >= levelPriority[configuredLevel];
}

function sanitizeData(value: unknown, key = "", depth = 0): unknown {
  if (sensitiveKeyPattern.test(key)) return redactedValue;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: isDev ? value.stack : undefined,
    };
  }
  if (value === null || typeof value !== "object") return value;
  if (depth >= 4) return "[truncated]";
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeData(item, key, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [entryKey, entryValue] of Object.entries(
    value as Record<string, unknown>,
  )) {
    sanitized[entryKey] = sanitizeData(entryValue, entryKey, depth + 1);
  }
  return sanitized;
}

function createEntry(level: LogLevel, message: string, options?: LogOptions) {
  const data =
    options?.data === undefined ? undefined : sanitizeData(options.data);

  return {
    timestamp: new Date().toISOString(),
    level,
    service: serviceName,
    environment: env.NODE_ENV,
    message,
    context: options?.context,
    data,
  } satisfies LogEntry;
}

function formatMessage(
  level: LogLevel,
  message: string,
  options?: LogOptions,
): string {
  const timestamp = new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
  const context = options?.context ? `[${options.context}]` : "";
  return `${timestamp} ${level.toUpperCase().padEnd(5)} ${context} ${message}`.trim();
}

function writeToConsole(entry: LogEntry): void {
  const writer = console[entry.level];
  if (logFormat === "json") {
    writer(JSON.stringify(entry));
    return;
  }

  writer(
    formatMessage(entry.level, entry.message, { context: entry.context }),
    entry.data ?? "",
  );
}

async function pushToLoki(entry: LogEntry): Promise<void> {
  if (!lokiUrl) return;

  const headers = new Headers({ "Content-Type": "application/json" });
  if (lokiUsername && lokiToken) {
    headers.set(
      "Authorization",
      `Basic ${Buffer.from(`${lokiUsername}:${lokiToken}`).toString("base64")}`,
    );
  } else if (lokiToken) {
    headers.set("Authorization", `Bearer ${lokiToken}`);
  }

  const labels: Record<string, string> = {
    service: entry.service,
    level: entry.level,
    environment: entry.environment,
  };
  if (entry.context) labels.context = entry.context;

  await fetch(lokiUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      streams: [
        {
          stream: labels,
          values: [
            [`${BigInt(Date.now()) * 1_000_000n}`, JSON.stringify(entry)],
          ],
        },
      ],
    }),
  });
}

function emit(level: LogLevel, message: string, options?: LogOptions): void {
  if (!shouldLog(level)) return;

  const entry = createEntry(level, message, options);
  writeToConsole(entry);

  if (lokiUrl) {
    void pushToLoki(entry).catch((error: unknown) => {
      if (isDev) {
        console.warn(
          formatMessage("warn", "Failed to push log to Loki", {
            context: "logger",
          }),
          sanitizeData(error),
        );
      }
    });
  }
}

/**
 * Server-side logger for structured stdout and optional Loki push ingestion.
 */
export const logger = {
  /**
   * Debug level - verbose information for debugging
   */
  debug(message: string, options?: LogOptions): void {
    emit("debug", message, options);
  },

  /**
   * Info level - general information
   */
  info(message: string, options?: LogOptions): void {
    emit("info", message, options);
  },

  /**
   * Warn level - warning messages
   */
  warn(message: string, options?: LogOptions): void {
    emit("warn", message, options);
  },

  /**
   * Error level - error messages. Data is redacted before it is emitted.
   */
  error(message: string, options?: LogOptions): void {
    emit("error", message, options);
  },

  /**
   * Group related logs together (dev only)
   */
  group(label: string): void {
    if (!isDev) return;
    console.group(label);
  },

  /**
   * End a log group (dev only)
   */
  groupEnd(): void {
    if (!isDev) return;
    console.groupEnd();
  },

  /**
   * Log a table (dev only)
   */
  table(data: unknown): void {
    if (!isDev) return;
    console.table(data);
  },

  /**
   * Time an operation (dev only)
   */
  time(label: string): void {
    if (!isDev) return;
    console.time(label);
  },

  /**
   * End timing an operation (dev only)
   */
  timeEnd(label: string): void {
    if (!isDev) return;
    console.timeEnd(label);
  },
};
