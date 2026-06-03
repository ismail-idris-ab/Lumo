import { reconcilePendingPayments } from '../services/payment.service';
import { prisma } from '../lib/prisma';

// Manual one-off payment reconciliation (ops/debug). Scheduled version runs in the worker.
reconcilePendingPayments()
  .then((r) => console.log('Reconcile result:', JSON.stringify(r)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
