# White-Label E-Commerce Implementation Guide

## 1. Project architecture overview

This application is structured as a single React + Vite frontend that talks directly to Supabase for auth, database access, realtime, storage, and transactional RPC calls.

- `src/routes` holds the route tree, referral capture, and RBAC route guards.
- `src/layouts` separates the public storefront shell from the private dashboard shell.
- `src/features` contains service boundaries for auth, catalog, orders, and agents.
- `src/stores` uses Zustand for auth session state, cart state, and referral persistence.
- `src/components` contains reusable UI and shared dashboard/storefront primitives.
- `src/pages` contains role-specific screens for public customers, store admins, superadmins, and agents.
- `supabase/schema.sql` contains schema, RLS, storage policies, bootstrap helpers, inventory-safe checkout/POS functions, and payout-safe commission logic.

Design principles:

- No mock business data.
- Supabase credentials are injected through `.env`.
- Role checks happen in both frontend route guards and database policies.
- Checkout, POS, commission state, and payouts are validated in Postgres, not trusted from the client.
- White-label settings are stored in tables and applied dynamically instead of being hardcoded.

## 2. Recommended folder structure

```text
src/
  app/
  components/
    shared/
      brand-badge.tsx
      data-table.tsx
      empty-state.tsx
      page-header.tsx
      setup-banner.tsx
      stat-card.tsx
    ui/
      button.tsx
      card.tsx
      input.tsx
      select.tsx
      textarea.tsx
  features/
    agents/
      agent-service.ts
    auth/
      auth-service.ts
      session-provider.tsx
    catalog/
      admin-catalog-service.ts
      catalog-service.ts
    operations/
      operations-service.ts
    orders/
      order-service.ts
  layouts/
    dashboard-layout.tsx
    marketing-layout.tsx
  lib/
    env.ts
    supabase.ts
    utils.ts
  pages/
    admin/
      admin-dashboard-page.tsx
      agents-page.tsx
      analytics-page.tsx
      categories-page.tsx
      inventory-page.tsx
      order-detail-page.tsx
      orders-page.tsx
      pos-page.tsx
      products-page.tsx
    agent/
      agent-dashboard-page.tsx
      agent-profile-page.tsx
      commissions-page.tsx
      payouts-page.tsx
      referrals-page.tsx
    customer/
      customer-dashboard-page.tsx
      customer-orders-page.tsx
      customer-profile-page.tsx
    public/
      cart-page.tsx
      checkout-page.tsx
      home-page.tsx
      product-page.tsx
      shop-page.tsx
    shared/
      login-page.tsx
      not-found-page.tsx
      register-page.tsx
      setup-page.tsx
    superadmin/
      admin-accounts-page.tsx
      branding-manager-page.tsx
      stores-page.tsx
      superadmin-dashboard-page.tsx
      support-page.tsx
  routes/
    app-routes.tsx
    referral-capture.tsx
    route-guard.tsx
  stores/
    auth-store.ts
    cart-store.ts
    referral-store.ts
  types/
    database.ts
    domain.ts
  App.tsx
  index.css
  main.tsx
```

## 3. Database schema design

Core tables:

- `profiles`: one row per auth user, includes role and optional store scope.
- `stores`: the single-store business record managed by superadmin.
- `store_branding`: white-label settings such as store name, logo, colors, contact details, receipt copy, and currency.
- `categories`: product grouping scoped to a store.
- `products`: source of truth for catalog, prices, sale windows, stock, and visibility.
- `product_images`: optional normalized image records that reference storage objects.
- `carts` and `cart_items`: optional persistent carts if you want server-side cart recovery.
- `orders`: canonical order header used by both online checkout and POS-derived orders.
- `order_items`: immutable itemized purchase lines storing final unit price used at sale time.
- `inventory_movements`: ledger of stock changes from checkout, POS, manual adjustment, return, or correction.
- `pos_transactions`: POS-specific transaction envelope with cashier, cash received, and receipt number.
- `pos_transaction_items`: links POS transactions to ordered items when receipt-specific detail is needed.
- `audit_logs`: append-only operational audit trail.

Agent and commission tables:

- `agents`: store-scoped agent profile and commission configuration.
- `agent_links`: unique referral links or campaign links per agent and optional product.
- `referral_visits`: optional click tracking table.
- `order_referrals`: single trusted attribution row per qualifying order.
- `commissions`: one commissionable event row per order/agent pair.
- `commission_payouts`: payout batch header with idempotency protection.
- `commission_payout_items`: immutable join table linking each paid commission to exactly one payout batch.

Important relationships:

- `profiles.store_id -> stores.id`
- `store_branding.store_id -> stores.id`
- `products.category_id -> categories.id`
- `orders.customer_id -> profiles.id`
- `order_items.order_id -> orders.id`
- `inventory_movements.order_id -> orders.id`
- `pos_transactions.order_id -> orders.id`
- `agents.profile_id -> profiles.id`
- `agent_links.agent_id -> agents.id`
- `order_referrals.order_id -> orders.id`
- `commissions.order_id -> orders.id`
- `commissions.agent_id -> agents.id`
- `commission_payout_items.commission_id -> commissions.id`

## 4. Supabase SQL

Use the full schema in [schema.sql](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/schema.sql).

Key SQL responsibilities:

- create enums, tables, indexes, and timestamps
- create `handle_new_user()` trigger for auth user bootstrap
- create helper functions for role and store resolution
- enable RLS on every sensitive table
- expose public read access only where storefront access is intended
- provide `checkout_order_atomic()` for inventory-safe online checkout
- provide `complete_pos_sale_atomic()` for inventory-safe POS checkout
- provide `sync_commission_for_order()` for commission status lifecycle
- provide `process_commission_payout()` for payout-safe batch processing
- create storage bucket and policies for product images and branding assets
- include a secure one-time `bootstrap_superadmin()` function

## 5. Authentication and RBAC design

Roles:

- `superadmin`
- `admin`
- `customer`
- `agent`

Access model:

- Supabase Auth stores the user identity.
- `profiles` stores the application role and store scope.
- Frontend route guards keep users out of the wrong dashboard.
- Postgres RLS is the real enforcement layer.
- `superadmin` can access all stores.
- `admin` can access only rows for their own `store_id`.
- `customer` can access only public catalog data plus their own orders/profile.
- `agent` can access only their own agent, commission, payout, and referral data.

Recommended auth flow:

1. Customers self-register.
2. Superadmin creates stores and provisions admin/store-owner accounts.
3. Admin creates agent accounts or invites agents.
4. Role mutation is restricted to secure SQL or admin-only operational flows.

Secure store-owner provisioning:

- the superadmin UI should call a protected Supabase Edge Function
- the Edge Function validates the requester is a `superadmin`
- the Edge Function uses the service role to create the auth user
- it upserts the corresponding `profiles` row with `role = 'admin'` and the selected `store_id`
- it records an audit log entry for the provisioning action

## 6. Purchase safety and race condition solution

Overselling protection is enforced in SQL, not in the browser.

Checkout safeguards:

- the frontend sends a unique `idempotency_key`
- the database locks each product row with `FOR UPDATE`
- stock is validated again at commit time
- sale price is recomputed server-side
- inventory deductions and order creation happen in one transaction
- a duplicate submission with the same idempotency key returns the existing order

Conflict cases covered:

- two customers buying the last unit at once
- POS sale happening while online checkout is in flight
- admin editing stock while a checkout is being submitted
- customer double-clicking purchase or refreshing confirmation

## 7. POS architecture

POS is not a separate inventory system.

- cashier builds a local cart in the UI
- admin submits the POS payload through `complete_pos_sale_atomic()`
- the RPC locks product rows and validates stock exactly like online checkout
- it creates both an `orders` row and a `pos_transactions` row
- it writes `inventory_movements`
- it returns receipt and transaction identifiers

This keeps online and walk-in channels consistent.

## 8. White-label architecture

White-label values are stored in `store_branding`.

Suggested dynamic usage:

- load branding on app bootstrap
- write theme colors to CSS variables
- swap store logo and favicon from storage URLs
- use store contact details in storefront footer and checkout
- use receipt header/footer fields in POS and invoice print layouts

Superadmin can own all branding fields while admin can be limited to an approved subset.

## 9. Referral tracking and commission architecture

Referral tracking flow:

1. Customer opens `?ref=agentcode`.
2. Frontend stores the code temporarily in local storage.
3. Checkout sends the referral code to the RPC.
4. The RPC validates that the code is active, belongs to the same store, and has not expired if you enforce expiry.
5. A single `order_referrals` row is created.
6. A single `commissions` row is created or updated for that order and agent.

Commission lifecycle:

- `pending`: order placed but not yet qualified
- `approved`: order reached qualifying state
- `locked`: optional intermediate state before payout
- `paid`: included in a successful payout batch
- `cancelled` or `reversed`: order cancelled, refunded, or invalidated

Accounting behavior:

- lifetime earned = all valid commission rows over time
- paid total = sum of commission rows with `status = 'paid'`
- outstanding total = sum of `approved` or `locked` commission rows with no payout
- outstanding reaching zero after payout is a calculation result, not a delete

Anti-double-payout design:

- admins process payout through `process_commission_payout()`
- eligible commission rows are locked first
- payout header, payout items, and commission updates happen in one transaction
- idempotency key prevents repeated payout submissions
- `commission_payout_items.commission_id` is unique so a commission cannot be reused
- audit logs record who processed the payout and when

## 10. UI pages and modules breakdown

Public/customer:

- `/`: branded homepage and setup banners
- `/shop`: live catalog with search and category filtering
- `/products/:slug`: product detail page
- `/cart`: local cart review with quantity updates
- `/checkout`: idempotent order submission form backed by `checkout_order_atomic()`
- `/login`: all-role sign-in
- `/register`: customer self-registration
- `/account`: customer dashboard
- `/account/orders`: order history and tracking
- `/account/profile`: customer profile

Admin:

- `/admin`: dashboard KPIs and recent order snapshot
- `/admin/products`: catalog management
- `/admin/categories`: category management
- `/admin/orders`: operational order list
- `/admin/orders/:orderId`: order detail and status flow
- `/admin/pos`: cashier interface
- `/admin/analytics`: revenue and performance charts
- `/admin/inventory`: stock and movement review
- `/admin/agents`: agent performance and commission administration
Superadmin:

- `/superadmin`: platform overview
- `/superadmin/stores`: store provisioning and readiness tracking
- `/superadmin/admins`: owner/admin account control
- `/superadmin/branding`: cross-store white-label management
- `/superadmin/support`: support and audit access

Agent:

- `/agent`: referral and commission summary
- `/agent/referrals`: my links
- `/agent/commissions`: per-order commission breakdown
- `/agent/payouts`: payout history
- `/agent/profile`: personal profile

## 11. Step-by-step implementation plan

Phase 1. Foundation

- add dependencies and Tailwind
- add Supabase client boundary and env handling
- add route structure, layouts, Zustand stores, and shared UI primitives

Phase 2. Database and security

- run `supabase/schema.sql`
- configure storage buckets and policies
- bootstrap the first superadmin
- verify customer, admin, superadmin, and agent access rules

Phase 3. Customer storefront

- wire branding query
- wire category and product queries
- implement product detail and cart behavior
- finish checkout submission with `checkout_order_atomic()`

Phase 4. Admin operations

- wire products, categories, orders, inventory, and POS screens
- implement product create/edit forms and uploads
- implement order status update actions
- finish POS cashier flow and receipt layout

Phase 5. Agents and commissions

- implement admin agent create/edit screens
- implement referral link management
- implement agent dashboard and commission list
- implement payout processing screen that calls the SQL RPC

Phase 6. Analytics and polish

- create SQL views or RPCs for KPI rollups
- hydrate charts and dashboard cards
- apply live white-label branding
- add loading states, empty states, and error toasts throughout

## 12. Actual starter code

The current codebase in `src/` already includes:

- role-aware routing
- auth session provider
- Zustand cart and referral tracking
- live admin/superadmin/agent/customer flows for the core modules
- Supabase RPC service boundaries for checkout, POS, and payouts
- form validation examples using React Hook Form + Zod
- table and chart integrations for operations dashboards

Start extending from these key files:

- [App.tsx](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/App.tsx)
- [app-routes.tsx](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/routes/app-routes.tsx)
- [dashboard-layout.tsx](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/layouts/dashboard-layout.tsx)
- [auth-service.ts](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/features/auth/auth-service.ts)
- [order-service.ts](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/features/orders/order-service.ts)
- [agent-service.ts](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/features/agents/agent-service.ts)

## 13. Setup instructions

1. Copy `.env.example` to `.env`.
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In Supabase SQL editor, run [schema.sql](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/schema.sql).
4. Deploy [create-store-admin/index.ts](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/functions/create-store-admin/index.ts) and [create-agent-account/index.ts](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/functions/create-agent-account/index.ts) as Supabase Edge Functions.
5. Set the `SUPABASE_SERVICE_ROLE_KEY` secret for Edge Functions.
6. Create the first auth user that will become superadmin.
7. Execute `select public.bootstrap_superadmin('<auth-user-id>', 'Your Name');`
8. Create the first store and store branding record.
9. Log in as superadmin and provision the store admin from `/superadmin/admins`.
10. Log in as the store admin and create agents from `/admin/agents` if needed.
11. Start the frontend with `npm run dev`.
12. Build-check with `npm run build`.

## 14. Environment variables

Required:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional server-side values if you later add Edge Functions:

- `SUPABASE_SERVICE_ROLE_KEY`
- payment provider secrets
- SMTP or transactional email credentials

This starter does not hardcode any Supabase credentials.
