export interface FrontendLogEntry {
  ts: string;
  level: "info" | "error";
  event: string;
  status: "start" | "success" | "failure" | "cancelled" | "change" | "ready";
  context?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string | null;
    details?: string | null;
  };
}

declare global {
  interface Window {
    __OFFLINE_BI_FRONTEND_LOGS__?: FrontendLogEntry[];
  }
}

const MAX_LOG_ENTRIES = 200;
const logBuffer: FrontendLogEntry[] = [];

export function logFrontendEvent(
  event: string,
  status: FrontendLogEntry["status"],
  context?: Record<string, unknown>,
) {
  const entry: FrontendLogEntry = {
    ts: new Date().toISOString(),
    level: "info",
    event,
    status,
    context,
  };

  recordLogEntry(entry);
}

export function logFrontendFailure(
  event: string,
  message: string,
  context?: Record<string, unknown>,
  error?: FrontendLogEntry["error"],
) {
  const entry: FrontendLogEntry = {
    ts: new Date().toISOString(),
    level: "error",
    event,
    status: "failure",
    context,
    error: error ?? { message },
  };

  recordLogEntry(entry);
}

export function getFrontendLogs() {
  return [...logBuffer];
}

function recordLogEntry(entry: FrontendLogEntry) {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer.shift();
  }

  if (typeof window !== "undefined") {
    window.__OFFLINE_BI_FRONTEND_LOGS__ = [...logBuffer];
  }

  const serialized = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(serialized);
  } else {
    console.info(serialized);
  }
}
