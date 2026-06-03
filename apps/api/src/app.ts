import express, { type Express } from 'express';
import helmet from 'helmet';
import cors, { type CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { config } from './config/env';
import { logger } from './lib/logger';
import { v1Router } from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';

export function createApp(): Express {
  const app = express();

  // Trust the proxy (Render/Vercel/etc.) so secure cookies + IPs work.
  app.set('trust proxy', 1);

  app.use(helmet());

  // CORS allow-list (TRD §19). Allow no-origin (curl/server-to-server) + listed origins.
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true, // refresh cookie
  };
  app.use(cors(corsOptions));

  // Request logging with correlation IDs (TRD §27).
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const existing = req.headers['x-request-id'];
        const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );

  app.use(
    express.json({
      limit: '1mb',
      // Stash the raw bytes so the payment webhook can verify the HMAC signature.
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf;
      },
    }),
  );
  app.use(cookieParser());

  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
