# Lumo — Product Requirements Document (PRD)

> **Lumo** — _the trusted local marketplace for verified Nigerian sellers._
> Version: 1.0 (Pre-build planning) · Status: Draft for confirmation · Owner: Ismail

---

## 1. Product Overview

Lumo is a mobile-first Nigerian classified ads marketplace where individuals and businesses post listings for products and services, and buyers discover, search, filter, and contact sellers directly. Unlike a full e-commerce platform, Lumo does **not** process the purchase of listed goods — it connects buyers and sellers and monetises _visibility and trust_ (promotions, subscriptions, featured stores, verification, banners).

The core wedge against incumbents (primarily Jiji.ng) is **trust**: verified business sellers, transparent seller history, fast moderation, and aggressive scam reporting. The secondary wedges are **search quality**, **mobile/low-data performance**, and **SEO reach**.

| Attribute         | Value                                                                |
| ----------------- | -------------------------------------------------------------------- |
| Product type      | Classified ads marketplace (lead-generation, not checkout)           |
| Primary market    | Nigeria — states, cities/LGAs, local areas/markets                   |
| Platform priority | Mobile web first, then desktop; native apps deferred                 |
| Positioning       | "A trusted local marketplace for verified Nigerian sellers"          |
| Monetisation      | Promotions, subscriptions, featured stores, verification, banner ads |
| Out of scope (v1) | In-app checkout, escrow, logistics, wallet                           |

---

## 2. Problem Statement

Nigerian online classifieds are dominated by a few large platforms, but users repeatedly report the same friction:

- **Scams and fake listings** erode trust; buyers can't easily tell a real seller from a fraud.
- **Weak verification** — anyone can pose as a business with no accountability.
- **Poor search relevance** and location filtering down to LGA/market level.
- **Heavy, slow pages** on low-end Android phones and metered data.
- **Slow or opaque moderation**, allowing prohibited and duplicate listings to linger.

**Problem in one sentence:** Nigerian buyers waste time and money sorting real sellers from scams on slow, low-trust marketplaces, and legitimate sellers have no credible way to signal trustworthiness.

Lumo solves this with verified seller identity, visible seller history, fast human + automated moderation, one-tap scam reporting, and a fast, low-data experience.

---

## 3. Target Audience

**Geography:** Nigeria, with depth at state → city/LGA → local area/market granularity.

**Demand side (buyers):**

- Urban and peri-urban smartphone users (18–45) hunting for phones, electronics, vehicles, property, and services.
- Price-sensitive, data-conscious, WhatsApp-native, suspicious of scams.

**Supply side (sellers):**

- Individual sellers offloading used/new items.
- Small businesses and traders (electronics shops, phone dealers, mechanics, artisans, agents) wanting consistent leads and a credible storefront.
- Service providers (repair, tailoring, logistics, professional services).

---

## 4. Product Goals

1. **Trust:** Make verified, reputable sellers visibly distinguishable from anonymous/risky ones.
2. **Speed of discovery:** Sub-second search and filtering down to local-area granularity.
3. **Mobile performance:** Usable and fast on entry-level Android over 3G/metered data.
4. **Safe marketplace:** Keep prohibited/scam listings off the platform via moderation + reporting.
5. **Sustainable monetisation:** Revenue from visibility and trust products, not from gating basic listings.
6. **SEO reach:** Rank for "buy X in [city]" and category/location long-tail queries to acquire buyers cheaply.

---

## 5. Non-Goals (v1)

- **No in-app purchase/checkout of listed goods.** Lumo is classifieds, not e-commerce.
- **No escrow, wallet, or buyer-protection payment flows.**
- **No logistics/delivery integration.**
- **No native mobile apps** (responsive PWA-quality web only).
- **No auctions, bidding, or dynamic pricing.**
- **No multi-currency** — Naira (₦) only.
- **No AI-generated listing descriptions / recommendation engine** in v1 (can come later).

---

## 6. User Personas

| Persona                           | Profile                                     | Goals                                               | Pain points Lumo addresses                                  |
| --------------------------------- | ------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| **Chidinma — the cautious buyer** | 27, Lagos, civil servant, mid-range Android | Find a clean used iPhone from someone she can trust | Fear of scams; wants verified sellers, ratings, account age |
| **Musa — the side-seller**        | 34, Kano, sells a few items occasionally    | Post quickly and free, get calls                    | Doesn't want to pay to list; wants simple posting           |
| **Bukola — the dealer/SME**       | 41, Ibadan, runs a phone shop               | Steady leads, a credible storefront, stand out      | Wants verification badge, featured store, promoted ads      |
| **Tunde — the service provider**  | 30, Abuja, AC repair                        | Be discoverable in his LGA for "AC repair Abuja"    | Needs strong local SEO + category placement                 |
| **Admin/Moderator (internal)**    | Ops staff                                   | Keep platform clean, approve fast, ban fraud        | Needs efficient moderation queue + audit trail              |

---

## 7. User Roles & Permissions

| Capability                        | Guest | Buyer | Seller | Admin | Super Admin |
| --------------------------------- | :---: | :---: | :----: | :---: | :---------: |
| Browse & search listings          |  ✅   |  ✅   |   ✅   |  ✅   |     ✅      |
| View listing & seller profile     |  ✅   |  ✅   |   ✅   |  ✅   |     ✅      |
| Register / log in                 |  ✅   |   —   |   —    |   —   |      —      |
| Save/favorite listing             |  ❌   |  ✅   |   ✅   |  ✅   |     ✅      |
| Contact seller / chat             |  ❌   |  ✅   |   ✅   |  ✅   |     ✅      |
| Report a listing                  |  ❌   |  ✅   |   ✅   |  ✅   |     ✅      |
| Post a listing                    |  ❌   | ✅\*  |   ✅   |  ✅   |     ✅      |
| Edit/delete own listing           |  ❌   |  ✅   |   ✅   |  ✅   |     ✅      |
| Promote listing / buy plan        |  ❌   |  ✅   |   ✅   |  ✅   |     ✅      |
| Apply for verification            |  ❌   |  ✅   |   ✅   |   —   |      —      |
| Approve/reject/suspend listings   |  ❌   |  ❌   |   ❌   |  ✅   |     ✅      |
| Manage users (ban/suspend)        |  ❌   |  ❌   |   ❌   |  ✅   |     ✅      |
| Manage categories                 |  ❌   |  ❌   |   ❌   |  ✅   |     ✅      |
| Resolve reports                   |  ❌   |  ❌   |   ❌   |  ✅   |     ✅      |
| View payments/revenue             |  ❌   |  ❌   |   ❌   |  ✅   |     ✅      |
| Manage admins & platform settings |  ❌   |  ❌   |   ❌   |  ❌   |     ✅      |
| View audit logs                   |  ❌   |  ❌   |   ❌   |  ✅   |     ✅      |

> _\*Note: In Lumo, "Buyer" and "Seller" are not separate accounts — they are the same user with a `roles` set. Any registered user can post (becoming a seller for that listing). "Seller" denotes a user who has at least one listing or a SellerProfile. This avoids forced account-type choice at signup. Confirm in §"Decisions to confirm."_

---

## 8. MVP Feature List

1. **Auth** — email/password + JWT with refresh tokens; password reset; optional phone capture.
2. **User profile** — name, avatar, contact preferences, account age.
3. **Seller profile** — public page: account age, verification status, active listings, rating, response indicator.
4. **Categories** — MVP: Phones & Tablets, Electronics, Vehicles, Property, Services (admin-managed, nested where needed).
5. **Listing management** — create, edit (triggers re-approval), delete, mark sold, auto-expire.
6. **Listing images** — multi-image upload (Cloudinary/S3), client-side compression, primary image.
7. **Search & filters** — full-text (Meilisearch/Typesense) + filters: category, state, city/LGA, area/market, price range, condition.
8. **Saved listings / favorites.**
9. **Contact seller** — reveal-on-click phone (login required) + start chat.
10. **Realtime chat** — Socket.IO, per-listing threads, unread counts.
11. **Listing reports** — reasons (scam, prohibited, duplicate, miscategorised, sold), feeds moderation queue.
12. **Admin moderation** — approve/reject/suspend/delete/flag; queue with filters.
13. **Seller verification** — submit ID/business docs + pay fee → admin review → badge.
14. **Promoted listings** — paid boost packages with `promotedUntil`; auto-revert on expiry.
15. **Payment system** — Paystack init + webhook verification for promotions/subscriptions/verification.
16. **Subscription plans** — recurring seller tiers (listing limits, promo credits, badges).
17. **Featured seller stores** — paid storefront placement.
18. **SEO pages** — server-rendered category/location/listing pages, sitemaps, structured data.
19. **Notifications** — in-app + email (Resend/Nodemailer) for chat, approval, expiry, payment.
20. **Analytics dashboard** — seller: views/leads; admin: listings, users, revenue, reports.
21. **Safety & prohibited items policy** — public page + enforcement rules.

---

## 9. Future Feature List (post-MVP)

- Additional categories: Fashion, Furniture, Jobs, Agriculture, Home Appliances, Computer Accessories.
- Native PWA install prompts / native apps.
- AI scam/duplicate detection and auto-moderation scoring.
- Buyer reviews & seller response-rate metrics.
- Saved searches + alerts ("new iPhone listings in Lagos").
- In-chat safe-trade prompts and meet-up guidance.
- Banner ad self-serve marketplace.
- Multi-image AI quality checks / background cleanup.
- WhatsApp deep-link contact + WhatsApp notification (where compliant).

---

## 10. Core Pages

**Public:** `/`, `/search`, `/categories`, `/category/[slug]`, `/listing/[slug]`, `/seller/[id]`, `/post-ad`, `/pricing`, `/safety-tips`, `/contact`, `/terms`, `/privacy-policy`

**Auth:** `/login`, `/register`, `/forgot-password`, `/reset-password`

**User dashboard:** `/dashboard`, `/dashboard/listings`, `/dashboard/listings/new`, `/dashboard/listings/[id]/edit`, `/dashboard/messages`, `/dashboard/favorites`, `/dashboard/payments`, `/dashboard/profile`, `/dashboard/promotions`

**Admin dashboard:** `/admin`, `/admin/listings`, `/admin/users`, `/admin/categories`, `/admin/reports`, `/admin/payments`, `/admin/promotions`, `/admin/subscriptions`, `/admin/settings`, `/admin/audit-logs`

---

## 11. Marketplace Rules

- Anyone can **browse and search** without an account.
- Login is required to **post, save, chat, report, or promote**.
- New and **edited** listings are **pending** until admin approval.
- Sellers may edit listings; material edits re-enter the approval queue.
- One listing = one item/service. Bulk/duplicate spam is removed.
- Listings auto-**expire** after a TTL (e.g., 30 days) and are hidden/marked expired; sellers can renew.
- Promoted listings carry a `promotedUntil`; on expiry they silently revert to normal status.
- Sellers must use Naira pricing and accurate categories/locations.
- Contact details are revealed only to logged-in users to reduce scraping/spam.

---

## 12. Listing Approval Rules

A listing is **approved** only if all hold:

1. Belongs to a permitted category and is not on the prohibited list.
2. Has at least one clear, relevant image (no stock/watermarked/irrelevant images for physical goods).
3. Title and description are coherent, not misleading, no full contact details stuffed in text.
4. Price is present and plausible (no "₦1" bait, no obvious scams).
5. Location resolves to a valid state + city/LGA.
6. No prohibited keywords / no external payment-link solicitation.

Admin actions: **Approve · Reject (with reason) · Request changes · Suspend · Flag · Delete.** Every action is written to the audit log.

---

## 13. Prohibited Items Policy (summary)

Disallowed: weapons & ammunition; illegal drugs and unlicensed pharmaceuticals; counterfeit/replica branded goods; stolen goods; live wildlife/endangered species; human parts/blood; adult/sexual services; recalled/unsafe products; financial scams, "money doubling," and Ponzi schemes; hacking/fraud tools and stolen data/accounts; government documents/IDs for sale; tobacco/alcohol to minors; anything illegal under Nigerian law.

Enforcement: keyword + category guards at submission, human moderation, user reporting, and seller strikes leading to suspension/ban.

---

## 14. Monetisation Model

| Product                       | Description                                            | Who pays         |
| ----------------------------- | ------------------------------------------------------ | ---------------- |
| **Free basic listing**        | Standard listing, capped per period on free tier       | — (acquisition)  |
| **Promoted listing**          | Boosted ranking + "Promoted" badge for N days          | Sellers          |
| **Subscription plan**         | Monthly tier: more listing slots, promo credits, badge | Sellers/SMEs     |
| **Featured seller store**     | Premium storefront + homepage/category placement       | SMEs             |
| **Business verification fee** | One-time/periodic fee for verified badge               | Business sellers |
| **Banner ads**                | Display placements (later self-serve)                  | Advertisers      |

---

## 15. Pricing Ideas (indicative, ₦ — confirm with market test)

> Treat as placeholders; validate against Jiji and willingness-to-pay. All amounts in Naira.

| Item                       | Indicative price                               |
| -------------------------- | ---------------------------------------------- |
| Basic listing              | Free (e.g., up to 5 active on free tier)       |
| Promote — 7 days           | ₦1,500                                         |
| Promote — 14 days          | ₦2,500                                         |
| Promote — 30 days          | ₦4,000                                         |
| Starter subscription / mo  | ₦3,000 (e.g., 20 listings + 2 promo credits)   |
| Business subscription / mo | ₦8,000 (e.g., 100 listings + featured + badge) |
| Featured store / mo        | ₦10,000                                        |
| Business verification      | ₦5,000 (annual)                                |

---

## 16. Success Metrics

**North star:** _qualified seller contacts per week_ (calls revealed + chats started on approved listings).

- **Acquisition:** organic sessions, % from SEO, signups.
- **Supply:** new approved listings/day, active listings, % verified sellers.
- **Engagement:** search→listing CTR, listing→contact rate, chat reply rate, DAU/MAU.
- **Trust:** reports per 1,000 listings, time-to-moderate (median < 2h target), scam takedown rate.
- **Monetisation:** paying sellers, promotions sold, MRR, ARPU, conversion free→paid.
- **Performance:** p75 LCP on mobile < 2.5s, search p95 < 300ms.

---

## 17. Admin Requirements

- Moderation queue with status/category/report filters and bulk actions.
- One-click approve/reject with reason templates; re-approval flagging for edits.
- User management: view, suspend, ban, reset, role assignment (Super Admin only for admin roles).
- Category CRUD with slugs and ordering.
- Reports inbox with grouping by listing and resolution states.
- Payments & revenue view (Paystack reconciliation), refunds flagging.
- Promotions & subscriptions overview with expiry monitoring.
- Platform settings (limits, pricing, feature flags) — Super Admin.
- Immutable **audit log** of all privileged actions.

---

## 18. Trust & Safety Requirements

- Verified badge tiers: **Verified Business** (docs + fee) and basic **Phone/Email verified**.
- Seller profile transparency: account age, # active/sold listings, rating, verification.
- One-tap reporting with structured reasons; auto-throttle on repeat reports.
- Strike system → temporary suspension → ban for repeat offenders.
- Contact reveal gated behind login; rate-limited to deter scraping.
- Safety-tips page + in-context "trade safely" nudges (meet in public, inspect before paying).
- No payment links / off-platform payment solicitation in listings.

---

## 19. SEO Requirements

- Server-rendered category, location, and listing pages with unique titles/meta/H1.
- Clean slugs: `/listing/[city]-[title]-[shortid]`, `/category/[slug]`, location-aware landing pages (e.g., "Phones in Lagos").
- `JSON-LD` structured data: `Product`/`Offer`, `BreadcrumbList`, `Organization`.
- Dynamic XML sitemaps (split by category/location) + `robots.txt`.
- Canonical URLs, pagination handling, no duplicate-content thin pages.
- Fast Core Web Vitals (image optimisation, lazy loading, minimal JS on public pages).
- Open Graph/Twitter cards for shareable listings.
- Internal linking between category ↔ location ↔ related listings.

---

## 20. Mobile-First Requirements

- Designed at 360px baseline; touch targets ≥ 44px.
- Low-data mode: compressed/responsive images, lazy loading, skeleton states.
- Minimal JS on public browse/search; SSR/ISR for content pages.
- Sticky bottom navigation (Home, Search, Post, Chat, Account).
- Offline-tolerant PWA shell; installable.
- Phone-reveal and WhatsApp/Call deep links for one-tap contact.
- Forms optimised for mobile (numeric keypads for price, location pickers, autosave drafts).

---

## 21. Acceptance Criteria (per major feature)

**Authentication**

- Given valid credentials, a user logs in and receives an access token (short-lived) + refresh token (httpOnly cookie).
- Refresh rotates tokens; reuse of a rotated refresh token revokes the session.
- Password reset email expires within 30 minutes and is single-use.

**Post Listing**

- A logged-in user can submit a listing with ≥1 image; it is created with status `PENDING`.
- The seller sees "under review"; the listing is not publicly visible until approved.
- Editing an approved listing's material fields sets status back to `PENDING`.

**Search & Filters**

- Searching a keyword returns relevant approved listings ranked by relevance + promotion boost.
- Filters (category, state, city/LGA, price range, condition) combine correctly; results update without full reload.
- p95 query latency < 300ms on the search service.

**Contact Seller / Chat**

- Guests clicking "Show phone" or "Chat" are prompted to log in.
- Logged-in users can reveal phone (rate-limited) and start a per-listing chat thread.
- Messages deliver in realtime; unread counts update; offline messages persist.

**Reports & Moderation**

- A logged-in user can report a listing with a reason; duplicates from same user are deduped.
- Reported listings surface in the admin queue; admin actions update status + write audit log.
- Suspended/deleted listings are removed from search and public pages immediately.

**Promotions & Payments**

- Selecting a promo package initiates Paystack; on verified webhook, listing gets `promotedUntil`.
- Failed/abandoned payments leave the listing unpromoted; no partial state.
- On `promotedUntil` expiry, a job reverts the listing to normal ranking automatically.

**Verification**

- A seller submits documents + pays the fee; status becomes `PENDING_VERIFICATION`.
- Admin approval grants the Verified Business badge; rejection notifies with reason.

**SEO Pages**

- Category/location/listing pages render server-side with unique meta + JSON-LD.
- Sitemap includes only approved, non-expired listings; updates on publish/expiry.

---

## 22. Recommended MVP Scope

**In:** Auth, profiles, categories (5), listing CRUD + images, search/filters, favorites, contact + chat, reports, admin moderation, verification, promotions, subscriptions, featured stores, Paystack, SEO pages, notifications, basic analytics, safety policy.

**Out (v1):** checkout/escrow/wallet, native apps, AI moderation, reviews-with-purchase, saved-search alerts, self-serve banner marketplace, extra categories.

---

## 23. Features to Avoid in Version 1

- Buyer-side checkout, cart, escrow, or wallet (scope + regulatory risk).
- Real-money disputes/refunds handling beyond payment reconciliation.
- Complex recommendation/personalisation engine.
- Multi-language/multi-currency.
- Heavy native-app investment before web traction.
- Auto-approval of listings (moderation is a trust differentiator — keep human-in-loop early).

---

## 24. Technical Risks

- **Search ops cost/complexity** (Meilisearch/Typesense hosting & index sync drift).
- **Image cost & abuse** (storage, bandwidth, NSFW/irrelevant uploads).
- **Webhook reliability** (missed/duplicate Paystack webhooks → wrong promo state).
- **Realtime scaling** (Socket.IO connection limits; needs Redis adapter).
- **Moderation bottleneck** (manual queue doesn't scale without tooling).
- **Mobile performance regressions** as features grow.

## 25. Business Risks

- **Cold-start liquidity** — no buyers without sellers and vice versa (Nigeria region cold-start).
- **Incumbent dominance** (Jiji brand/SEO moat).
- **Trust paradox** — early platform looks empty/risky.
- **Monetisation timing** — charging too early kills supply growth.
- **Regulatory** — verification/KYC data handling (NDPR/NDPA compliance).
- **Fraud reputation** — a few high-profile scams can poison the brand early.

---

## 26. Suggested Development Phases

| Phase | Focus                                                    | Outcome                          |
| ----- | -------------------------------------------------------- | -------------------------------- |
| **0** | Foundations: repo, auth, RBAC, DB schema, CI, env config | Skeleton with login              |
| **1** | Listings + images + categories + admin moderation        | Sellers can post; admin approves |
| **2** | Search + filters + favorites + SEO pages                 | Discoverability                  |
| **3** | Contact reveal + realtime chat + notifications           | Buyer↔seller connection          |
| **4** | Reports + trust/safety + verification                    | Trust layer live                 |
| **5** | Paystack + promotions + subscriptions + featured stores  | Monetisation                     |
| **6** | Analytics, performance hardening, polish, launch         | Production launch                |

---

## 27. Final Checklist Before Coding

- [ ] Brand confirmed (Lumo?) + domain secured.
- [ ] **Stack decision confirmed** (Postgres/Prisma per spec vs MERN/Mongo — see TRD).
- [ ] Category taxonomy + location dataset (states/LGAs/markets) sourced.
- [ ] Prohibited-items policy legally reviewed.
- [ ] Pricing validated against market.
- [ ] Paystack business account + test keys ready.
- [ ] Cloudinary/S3 + Meilisearch/Typesense + Redis providers chosen.
- [ ] NDPR/NDPA data-handling plan for verification docs.
- [ ] Design system / shadcn theme + mobile baseline agreed.

---

## 28. Summary

**Build first:** auth + RBAC + DB schema, then listing CRUD + images + admin moderation. Without supply and a trust gate, nothing else matters.

**Delay:** monetisation (promotions/subscriptions), realtime chat, verification, and analytics until there is real listing volume and discoverability.

**Decisions still to confirm:** (1) **Database/stack** — Postgres+Prisma (spec) vs MongoDB+Mongoose (your MERN comfort zone); (2) single account with role-set vs separate buyer/seller accounts; (3) listing TTL and free-tier listing cap; (4) verification doc requirements & retention; (5) launch city (recommend a single metro for liquidity, e.g., Lagos or Abuja).

**Safest development order:** Phase 0 → 1 → 2 → 3 → 4 → 5 → 6, gating each phase behind its acceptance criteria and never enabling listing auto-approval before moderation tooling is solid.
