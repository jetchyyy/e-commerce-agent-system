# White-Label E-Commerce With Agent System

Production-minded starter for a single-store white-label e-commerce application using:

- React + Vite + TypeScript
- Tailwind CSS
- Supabase Auth, Database, Storage, and RPC
- React Router
- Zustand
- React Hook Form + Zod
- TanStack Table
- Recharts
- lucide-react

## Quick start

1. Copy `.env.example` to `.env`
2. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Run the SQL in [supabase/schema.sql](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/schema.sql)
4. Bootstrap the first superadmin after creating the auth user:

```sql
select public.bootstrap_superadmin('<auth-user-id>', 'Your Name');
```

5. Start the app:

```bash
npm run dev
```

6. Verify production build:

```bash
npm run build
```

## Important files

- Architecture and implementation guide: [docs/implementation-guide.md](/c:/Users/carld/Desktop/e-commerce-with-agent-system/docs/implementation-guide.md)
- Supabase schema, RLS, checkout/POS RPCs, and payout logic: [supabase/schema.sql](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/schema.sql)
- App entry and routing: [src/App.tsx](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/App.tsx), [src/routes/app-routes.tsx](/c:/Users/carld/Desktop/e-commerce-with-agent-system/src/routes/app-routes.tsx)
- Secure store-owner creation function: [supabase/functions/create-store-admin/index.ts](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/functions/create-store-admin/index.ts)

## Edge Function deployment

To use the superadmin "Create owner/admin" UI and the admin "Create agent" UI, deploy both edge functions:

```bash
supabase functions deploy create-store-admin
supabase functions deploy create-agent-account
```

Set this secret in Supabase before invoking it:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Both functions also expect the default Supabase runtime variables such as `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

## Notes

- No mock products, orders, or seeded inventory are included.
- This project is currently shaped for a single-store deployment: one superadmin-controlled storefront and one owner/admin for store operations.
- The UI now includes functional flows for storefront browsing, product detail, cart, checkout, admin catalog management, orders, POS, inventory, analytics, customer dashboards, and agent commission/payout workflows.
- Checkout, POS, commission creation, and commission payout are designed to be validated in the database instead of trusting frontend calculations.
- Superadmin can create the store, configure branding, and provision the owner/admin before handoff.
