import { ensureSearchIndex, isSearchConfigured } from '../lib/search';

// Create + configure the Meilisearch `listings` index. Run once / on settings change.
if (!isSearchConfigured) {
  console.error('Search not configured — set SEARCH_HOST and SEARCH_API_KEY in .env');
  process.exit(1);
}

ensureSearchIndex()
  .then(() => console.log('✅ Search index ready (listings)'))
  .catch((e) => {
    console.error('Search setup failed:', e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
