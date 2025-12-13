import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

// Define the environment, defaulting to 'development' if not set
const environment = process.env.NODE_ENV || 'development';
// Define the default log level based on the environment
const logLevel = environment === 'production' ? 'info' : 'debug';

// ----------------------------------------------------------------------
// 1. Define Transports (Console and Google Cloud)
// ----------------------------------------------------------------------

const transports: winston.transports.ConsoleTransportInstance[] | (winston.transports.ConsoleTransportInstance | LoggingWinston)[] = [
  // Console transport: Used in development/staging, or as a fallback for cloud infrastructure
  new winston.transports.Console({
    // Use simple format for human readability in development
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
    ),
    level: 'debug', // Console always shows debug info locally
  }),
];

// In production environments, add the Google Cloud Logging transport
if (environment === 'production') {
    transports.push(
        new LoggingWinston({
            // 'admin_audit_logs' is a good, specific log name
            logName: 'admin_audit_logs',
            // Set resource type for clearer categorization in GCloud UI
            resource: {
                type: 'cloud_run_revision', // Adjust based on your GCloud service type (e.g., k8s_container, gce_instance)
                labels: {
                    service_name: 'auth-service', // Name of your microservice
                }
            },
            // The GCloud transport handles JSON formatting automatically
        })
    );
}

// ----------------------------------------------------------------------
// 2. Create the Logger Instance
// ----------------------------------------------------------------------

export const logger = winston.createLogger({
  level: logLevel, // Dynamically set the default log level (info in prod, debug in dev)
  // Use a generic JSON format for production environments
  format: winston.format.json(),
  transports: transports,
  // Add exception and rejection handlers for robust application monitoring
  exceptionHandlers: [
    new winston.transports.Console({
        format: winston.format.simple()
    }),
    ...(environment === 'production' ? [new LoggingWinston({ logName: 'admin_audit_logs_exceptions' })] : []),
  ],
  rejectionHandlers: [
    new winston.transports.Console({
        format: winston.format.simple()
    }),
  ],
});

// Optional: Inform developer that handlers are active
if (environment !== 'production') {
    logger.debug(`Logger initialized in ${environment} mode at level: ${logLevel}`);
}
