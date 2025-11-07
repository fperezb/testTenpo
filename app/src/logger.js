import pino from 'pino';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = pino({
  level: logLevel,
  base: {
    service: 'customer-query-service'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
