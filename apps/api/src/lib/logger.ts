import { pino } from 'pino';
import { config } from '../config/env';

export const logger = pino({
  level: config.isProd ? 'info' : 'debug',
  // Pretty logs in dev; structured JSON in prod (TRD §27).
  transport: config.isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
});
