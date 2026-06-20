import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { meRouter } from './me';
import { categoriesRouter } from './categories';
import { listingsRouter } from './listings';
import { searchRouter } from './search';
import { favoritesRouter } from './favorites';
import { chatsRouter } from './chats';
import { notificationsRouter } from './notifications';
import { reportsRouter } from './reports';
import { verificationRouter } from './verification';
import { promotionsRouter } from './promotions';
import { subscriptionsRouter } from './subscriptions';
import { paymentsRouter } from './payments';
import { adminRouter } from './admin';
import { sellersRouter } from './sellers';
import { savedSearchesRouter } from './saved-searches';
import { watchRouter } from './watch';

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
v1Router.use('/search', searchRouter);
v1Router.use('/favorites', favoritesRouter);
v1Router.use('/chats', chatsRouter);
v1Router.use('/notifications', notificationsRouter);
v1Router.use('/reports', reportsRouter);
v1Router.use('/verification', verificationRouter);
v1Router.use('/promotions', promotionsRouter);
v1Router.use('/subscriptions', subscriptionsRouter);
v1Router.use('/payments', paymentsRouter);
v1Router.use('/admin', adminRouter);
v1Router.use('/sellers', sellersRouter);
v1Router.use('/me/saved-searches', savedSearchesRouter);
v1Router.use('/listings/:id/watch', watchRouter);
