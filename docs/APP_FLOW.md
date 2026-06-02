# Lumo — App Flow (APP_FLOW.md)

> Version: 1.0 (Pre-build planning) · Companion to PRD.md and TRD.md
> Notation: `→` next step · `[guard]` condition · `✦` system/async action

---

## Global Product Rules (apply across all flows)

- Anyone can **browse/search** without login.
- Login required to **post, save, chat, report, promote**.
- New **and edited** listings are **PENDING** until admin approval.
- Admin can **approve, reject, suspend, delete, flag**.
- Promoted listings carry `promotedUntil`; on expiry they ✦ auto-revert to normal.
- Listings auto-**expire** after TTL → hidden/marked expired (renewable).
- Users can **report** scam/fake listings.
- Seller profile shows **account age, verification status, active listings, rating**.
- **No buyer checkout** — payments are only for promotions, subscriptions, featured stores, verification.

---

## 1. Guest User Flow

```
Land on / (SSR) → browse featured + categories
  → search or open /category/[slug]
  → open /listing/[slug] (full detail, images, seller summary)
  → tap "Show phone" / "Chat" / "Save" / "Report"
     [guard: not authed] → redirect to /login?next=<current>
```

Guests see everything but cannot act. Every gated CTA carries a `next` param so the user returns after login.

---

## 2. Buyer Registration Flow

```
/register → enter name, email, password (Zod-validated)
  → submit → ✦ create User(roles:[BUYER]), hash password
  → ✦ send verification email (optional, non-blocking)
  → auto-login (issue access + refresh) → redirect to next or /dashboard
```

Email verification is optional in v1 but sets the `emailVerified` trust flag.

---

## 3. Seller Registration Flow

There is **no separate seller signup**. Any registered user becomes a seller on first post.

```
Logged-in user → /post-ad
  [guard: no SellerProfile] → ✦ create SellerProfile lazily
  → complete listing → seller now has public /seller/[id]
```

(Confirm in PRD whether to keep single-account model.)

---

## 4. Login Flow

```
/login → email + password
  → submit → verify credentials
     [fail] → inline error (generic "invalid credentials")
     [success] → issue access JWT + rotating refresh cookie
  → redirect to ?next or /dashboard
  [rate limit exceeded] → CAPTCHA / lockout message
"Forgot password?" → /forgot-password
```

---

## 5. Browse Listings Flow

```
/ or /category/[slug]
  → SSR list of APPROVED, non-expired listings
  → promoted listings boosted (bounded) + "Promoted" badge
  → infinite scroll / pagination
  → tap card → /listing/[slug]
```

---

## 6. Search / Filter Flow

```
/search?q=...  (search engine: Meilisearch/Typesense)
  → apply filters: category, state, city/LGA, area/market, price range, condition
  → sort: relevance | newest | price asc/desc
  → results update without full reload (debounced)
  [empty] → empty state + suggestions (broaden filters / popular categories)
  [search down] → ✦ fallback to Postgres query (degraded relevance) + notice
```

---

## 7. Product Detail Flow

```
/listing/[slug] (SSR + JSON-LD)
  → image gallery, title, price (₦), condition, location, description
  → seller summary: name, verified badge, account age, rating, active listings
  → CTAs: Show phone · Chat · Save · Share · Report
  → related listings (same category/location)
  ✦ increment viewsCount (throttled per session)
  [expired/suspended/deleted] → 410/404 + similar listings
```

---

## 8. Contact Seller Flow

```
Tap "Show phone"
  [guard: not authed] → /login?next
  [authed] → POST /listings/:id/contact-reveal (rate-limited)
     → reveal phone + "Call" / "WhatsApp" deep links
  ✦ log lead (analytics)  ✦ notify seller "someone viewed your contact" (optional)
```

---

## 9. Chat Flow

```
Tap "Chat"
  [guard: not authed] → /login?next
  [authed] → ✦ get-or-create Chat(listingId, buyerId, sellerId)
  → open thread → type message → emit via Socket.IO
     → ✦ persist Message → broadcast to room → update unread
     [recipient offline] → ✦ email notification
  → /dashboard/messages lists threads with unread counts
  → block/report available in-thread (rate-limited)
```

---

## 10. Post Listing Flow

```
/post-ad (or /dashboard/listings/new)
  [guard: not authed] → /login?next
  → step 1: category + location (state → city/LGA → area)
  → step 2: title, description, price, condition
  → step 3: images (1–8) — see Image Upload Flow
  [subscription/free cap check] → if over limit, prompt upgrade/promote
  → submit → ✦ create Listing(status:PENDING, expiresAt:+TTL)
  → "Under review" screen → appears in /dashboard/listings as Pending
  ✦ enters admin moderation queue
```

---

## 11. Image Upload Flow

```
Select images → ✦ client-side compress/resize (≤1600px, ≤~400KB)
  → request signed upload params from API
  → browser uploads directly to Cloudinary
  → return {url, publicId} → attach to listing draft
  ✦ server validates MIME/magic-bytes/count/dimensions, strips EXIF
  [invalid] → reject with reason, allow retry
  → set primary image + order
```

---

## 12. Listing Moderation Flow (system + admin)

```
PENDING listing → /admin/listings queue
  → moderator reviews vs approval rules
     → Approve → status APPROVED, set expiresAt, ✦ index in search, ✦ notify seller
     → Reject(reason) → status REJECTED, ✦ notify seller with reason
     → Request changes → notify; seller edits → re-PENDING
     → Suspend / Flag → remove from public + search, ✦ notify, maybe strike
     → Delete → soft-delete + remove from search
  ✦ every action → AuditLog
```

---

## 13. Report Listing Flow

```
On /listing/[slug] → tap "Report"
  [guard: not authed] → /login?next
  → choose reason (Scam | Prohibited | Duplicate | Miscategorised | Sold | Other) + details
  → submit → ✦ create Report (dedupe per user+listing)
  → confirmation toast
  ✦ listing surfaces in /admin/reports (grouped by listing)
  [report threshold reached] → ✦ auto-flag for priority review
```

---

## 14. Save Listing Flow

```
Tap "Save" (heart)
  [guard: not authed] → /login?next
  [authed] → POST/DELETE /favorites/:listingId (toggle)
  → reflected in /dashboard/favorites
  [favorited listing later expires/removed] → shown as unavailable in favorites
```

---

## 15. Promote Listing Flow

```
/dashboard/listings → select listing → "Promote"
  → /dashboard/promotions → choose package (7/14/30 days)
  → POST /payments/initiate (purpose:PROMOTION, targetId:listingId)
  → Paystack flow (see §16)
  [success webhook] → ✦ isPromoted=true, promotedUntil=now+days, ✦ reindex with boost
  [failure/abandon] → no change; listing stays normal
  → ✦ on expiry job: revert to normal (see §20)
```

---

## 16. Paystack Payment Flow

```
Initiate (promotion | subscription | verification | featured)
  → API creates Payment(PENDING, unique reference) → Paystack initialize → return auth params
  → client completes payment via Paystack inline/redirect
  ──────── fulfilment is webhook-driven, never client-trusted ────────
  ✦ Paystack → POST /payments/webhook (signed)
     → verify signature → find Payment by reference → idempotency check
     [charge.success] → mark SUCCESS → run purpose fulfilment in DB txn
        → notify + email + AuditLog
     [failure] → mark FAILED/ABANDONED, no fulfilment
  ✦ reconciliation job re-verifies stale PENDING payments (missed webhooks)
  → client lands on success/failure page (informational only)
```

---

## 17. Admin Review Flow

```
/admin → dashboard (queues, metrics)
  → /admin/listings (moderation), /admin/reports (resolve),
    /admin/users (suspend/ban/role), /admin/categories (CRUD),
    /admin/payments (reconcile), /admin/promotions & /admin/subscriptions (monitor),
    /admin/audit-logs (immutable history), /admin/settings (Super Admin)
  ✦ all privileged actions → AuditLog
```

---

## 18. Seller Verification Flow

```
/dashboard/profile → "Get verified"
  → /verification/apply: submit ID/business docs (private bucket) + pay fee
  → POST /payments/initiate (purpose:VERIFICATION) → Paystack (§16)
  [payment success] → status PENDING_VERIFICATION → enters admin review
  → admin reviews docs
     → Approve → VerificationStatus=VERIFIED, badge granted, ✦ notify
     → Reject(reason) → ✦ notify; fee policy (refund/none) per terms
```

---

## 19. Subscription Flow

```
/pricing or /dashboard → choose plan (Starter | Business)
  → POST /payments/initiate (purpose:SUBSCRIPTION, targetId:planId) → Paystack (§16)
  [success webhook] → ✦ create/extend SellerSubscription(expiresAt), apply limits/credits/badge
  → seller gains higher listing cap, promo credits, featured eligibility
  ✦ expiry job → on expiresAt, deactivate; downgrade to free limits; ✦ notify before/after
```

---

## 20. Listing Expiry Flow (system)

```
✦ Repeatable job (e.g., every 10 min / nightly):
  - Listings APPROVED & expiresAt < now → status EXPIRED → remove from search → notify seller (renew CTA)
  - Listings isPromoted & promotedUntil < now → isPromoted=false → reindex (drop boost)
  - SellerProfile featuredUntil < now → isFeatured=false
  - SellerSubscription expiresAt < now → active=false → apply free limits
Seller can renew an expired listing → resets expiresAt (may re-enter PENDING per policy)
```

---

## 21. Error States

- **Validation errors** — inline, field-level, from shared Zod schema; never lose form input.
- **Auth errors** — generic "invalid credentials"; expired session → silent refresh → if fails, redirect to /login?next.
- **403** — "You don't have permission" (RBAC/ownership).
- **404/410** — listing not found / expired → show similar listings.
- **Payment failure** — clear message + retry; no partial fulfilment.
- **Upload failure** — per-image error + retry; partial uploads recoverable.
- **Search/Chat service down** — graceful fallback + non-blocking banner.
- **Rate limited** — friendly "slow down / try again in X" + optional CAPTCHA.
- **Network/offline** — PWA offline shell + retry; queued message send.

---

## 22. Empty States

- **No search results** → suggest broadening filters + popular categories.
- **Empty favorites** → "Browse listings to save" CTA.
- **No listings yet (seller)** → "Post your first ad" CTA.
- **No messages** → "Start a conversation from any listing."
- **Empty category** → related categories + "Be the first to post here."
- **No notifications** → calm empty illustration.

---

## 23. Mobile Navigation Flow

```
Sticky bottom nav (always one tap away):
  [ Home ] [ Search ] [ + Post ] [ Chat (badge) ] [ Account ]

  Home → /
  Search → /search (focus input, filters as bottom sheet)
  + Post → /post-ad  [guard: login]
  Chat → /dashboard/messages  [guard: login] (unread badge)
  Account → /dashboard (or /login if guest)

Top bar: location selector (state/city) + search shortcut.
Back behaviour preserves scroll + filter state. Filters open as a bottom sheet, not a new page.
```

---

## 24. End-to-End Happy Path (reference)

```
Guest browses → finds listing → taps Chat → prompted to register →
registers → returns to listing → chats seller → (separately) seller posts ad →
admin approves → buyer searches, filters by Lagos + Phones → contacts verified seller →
seller promotes listing via Paystack → promotion expires → auto-reverts → listing TTL hits → expires → seller renews.
```

---

## 25. Flow-Level Summary

- **Build the flows in this order:** Guest browse → Register/Login → Post + Image upload → Moderation → Search/Filter → Detail/Contact → Chat → Report → Save → Payments (Promote/Subscribe/Verify/Feature) → Expiry jobs → Admin.
- **Gate everything action-based behind login**; keep browse/search fully open for SEO and acquisition.
- **Keep humans in the moderation loop** until tooling + volume justify automation.
- **All money flows are webhook-fulfilled**, never client-trusted.
