import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { meRouter } from './me';
import { categoriesRouter } from './categories';
import { listingsRouter } from './listings';
import { adminRouter } from './admin';

// Versioned API router — mounted at /api/v1 in app.ts.
export const v1Router: Router = Router();

// GET /api/v1 — API index (so the base path isn't a bare 404).
v1Router.get('/', (_req, res) => {
  res.json({ name: 'Lumo API', version: 'v1', status: 'ok' });
});

v1Router.use('/health', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/me', meRouter);
v1Router.use('/categories', categoriesRouter);
v1Router.use('/listings', listingsRouter);
v1Router.use('/admin', adminRouter);
