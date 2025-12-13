// services/auth-service/src/logging/logger.ts
import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

// -----------------------------
// 1. Environment & Log Level
// -----------------------------
const environment = process.env.NODE_ENV || 'development';
const logLevel = environment === 'production' ? 'info' : 'debug';

// -----------------------------
// 2. Define Formats
// -----------------------------
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    return log;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// -----------------------------
// 3. Define Transports
// -----------------------------
const transports: (winston.transport | LoggingWinston)[] = [
  new winston.transports.Console({
    level: logLevel,
    format: devFormat,
    handleExceptions: true
  })
];

if (environment === 'production') {
  const cloudLoggingTransport = new LoggingWinston({
    logName: 'admin_audit_logs',
    resource: {
      type: 'cloud_run_revision',
      labels: { service_name: 'auth-service' }
    },
    handleExceptions: true
  });
  transports.push(cloudLoggingTransport);
}

// -----------------------------
// 4. Create Logger Instance
// -----------------------------
export const logger = winston.createLogger({
  level: logLevel,
  format: prodFormat,
  transports,
  exceptionHandlers: transports,
  rejectionHandlers: transports
});

// Optional: Inform developer that logger is active
if (environment !== 'production') {
  logger.debug(`Logger initialized in ${environment} mode at level: ${logLevel}`);
}

