import { isSearchConfigured } from '../lib/search';
import { reindexAllApproved } from '../services/search-sync';
import { prisma } from '../lib/prisma';

// Manual full reconcile of the search index from Postgres.
if (!isSearchConfigured) {
  console.error('Search not configured — set SEARCH_HOST and SEARCH_API_KEY in .env');
  process.exit(1);
}

reindexAllApproved()
  .then((n) => console.log(`✅ Reindexed ${n} listings`))
  .catch((e) => {
    console.error('Reindex failed:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
