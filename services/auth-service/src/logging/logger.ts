import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

// Define the environment, defaulting to 'development' if not set
const environment = process.env.NODE_ENV || 'development';
// Define the default log level based on the environment
const defaultLogLevel = environment === 'production' ? 'info' : 'debug';

// ----------------------------------------------------------------------
// 1. Define Formats
// ----------------------------------------------------------------------

// Format for local development (human-readable)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  // Use a custom printf format for console readability
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let log = `[${timestamp}] ${level}: ${message}`;
    // Append metadata if it exists (for diversity in logging output)
    if (Object.keys(metadata).length > 0) {
        log += ` ${JSON.stringify(metadata)}`;
    }
    return log;
  })
);

// Format for production (structured JSON for log aggregators/analysis)
const prodFormat = winston.format.json();

// ----------------------------------------------------------------------
// 2. Define Transports (Console and Google Cloud)
// ----------------------------------------------------------------------

// Base transports array (starts with console for development)
const transports: winston.transports.Transport[] = [
  new winston.transports.Console({
    format: devFormat,
    level: defaultLogLevel, // Use the environment variable
    handleExceptions: true, // Console should always handle exceptions
  }),
];

let cloudLoggingTransport: LoggingWinston | undefined;

// Conditionally add the Google Cloud Logging transport ONLY in production
if (environment === 'production') {
    cloudLoggingTransport = new LoggingWinston({
        logName: 'admin_audit_logs',
        // Efficient logging metadata for GCloud filtering
        resource: {
            type: 'cloud_run_revision',
            labels: {
                service_name: 'auth-service',
            }
        },
        // The GCloud transport automatically handles exceptions
        handleExceptions: true,
    });
    transports.push(cloudLoggingTransport);
}


// ----------------------------------------------------------------------
// 3. Create the Logger Instance
// ----------------------------------------------------------------------

export const logger = winston.createLogger({
  level: defaultLogLevel,
  // Use the production format as the default for the main logger instance
  format: prodFormat,
  transports: transports,
  // Ensure rejections are caught globally (using all available transports)
  rejectionHandlers: transports,
});


// Optional: Inform developer that handlers are active
if (environment !== 'production') {
    logger.debug(`Logger initialized in ${environment} mode at level: ${defaultLogLevel}`);
}
