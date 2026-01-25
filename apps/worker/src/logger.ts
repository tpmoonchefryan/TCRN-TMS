// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

/**
 * Simple logger for worker processes
 * Provides structured logging without NestJS dependency
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
}

function formatLog(entry: LogEntry): string {
  const { timestamp, level, context, message, data } = entry;
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  
  if (data !== undefined) {
    return `${prefix} ${message} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${message}`;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      data,
    };

    const formatted = formatLog(entry);

    switch (level) {
      case 'error':
        console.error(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      default:
        // Use console.info instead of console.log for production compliance
        console.info(formatted);
    }
  }

  debug(message: string, data?: unknown): void {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Pre-configured loggers for each job type
export const reportLogger = createLogger('ReportJob');
export const importLogger = createLogger('ImportJob');
export const permissionLogger = createLogger('PermissionJob');
export const membershipRenewalLogger = createLogger('MembershipRenewalJob');
export const logLogger = createLogger('LogJob');
export const piiCleanupLogger = createLogger('PiiCleanupJob');
export const piiHealthCheckLogger = createLogger('PiiHealthCheckJob');
export const workerLogger = createLogger('Worker');
