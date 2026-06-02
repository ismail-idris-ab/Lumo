import { runExpirySweep } from '../services/expiry.service';
import { prisma } from '../lib/prisma';

// Manual one-off expiry sweep (ops/debug). The scheduled version runs in the worker.
runExpirySweep()
  .then((r) => console.log('Sweep result:', JSON.stringify(r)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
