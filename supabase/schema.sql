create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('superadmin', 'admin', 'customer', 'agent');
  end if;

  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'confirmed',
      'processing',
      'ready_for_pickup',
      'out_for_delivery',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'paid', 'cancelled', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'sale_source') then
    create type public.sale_source as enum ('online', 'pos');
  end if;

  if not exists (select 1 from pg_type where typname = 'commission_type') then
    create type public.commission_type as enum ('fixed', 'percentage');
  end if;

  if not exists (select 1 from pg_type where typname = 'commission_status') then
    create type public.commission_status as enum (
      'pending',
      'approved',
      'locked',
      'paid',
      'cancelled',
      'reversed'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_reason') then
    create type public.inventory_reason as enum (
      'online_sale',
      'pos_sale',
      'manual_adjustment',
      'refund',
      'restock',
      'correction'
    );
  end if;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  role public.app_role not null default 'customer',
  full_name text,
  email citext,
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.store_branding (
  store_id uuid primary key references public.stores(id) on delete cascade,
  store_name text not null,
  logo_url text,
  favicon_url text,
  hero_title text,
  hero_subtitle text,
  primary_color text not null default '#0f172a',
  accent_color text not null default '#f59e0b',
  support_email citext,
  support_phone text,
  address text,
  footer_text text,
  receipt_header text,
  receipt_footer text,
  invoice_notes text,
  currency_code text not null default 'USD',
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug citext not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug citext not null,
  description text,
  short_description text,
  sku text not null,
  price numeric(12,2) not null check (price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  is_on_sale boolean not null default false,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  is_available boolean not null default true,
  track_inventory boolean not null default true,
  image_urls text[] not null default '{}',
  is_featured boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, slug),
  unique (store_id, sku)
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, customer_id)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (cart_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  order_number text not null unique,
  source public.sale_source not null,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  subtotal_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency_code text not null default 'USD',
  notes text,
  idempotency_key text not null,
  placed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (store_id, source, idempotency_key)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  sku text not null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  quantity_delta integer not null,
  reason public.inventory_reason not null,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pos_transactions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  cashier_id uuid not null references public.profiles(id) on delete restrict,
  customer_id uuid references public.profiles(id) on delete set null,
  receipt_number text not null unique,
  cash_received numeric(12,2) not null check (cash_received >= 0),
  change_due numeric(12,2) not null default 0 check (change_due >= 0),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pos_transaction_items (
  id uuid primary key default gen_random_uuid(),
  pos_transaction_id uuid not null references public.pos_transactions(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (pos_transaction_id, order_item_id)
);

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code citext not null unique,
  commission_type public.commission_type not null,
  commission_value numeric(12,2) not null check (commission_value >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.agent_links (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  code citext not null unique,
  target_type text,
  target_product_id uuid references public.products(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.referral_visits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  agent_link_id uuid references public.agent_links(id) on delete set null,
  referral_code_used citext not null,
  landing_path text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_referrals (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  referral_code_used citext not null,
  attribution_source text not null default 'query_param',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  order_referral_id uuid references public.order_referrals(id) on delete set null,
  commission_type public.commission_type not null,
  commission_rate_or_value numeric(12,2) not null check (commission_rate_or_value >= 0),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  status public.commission_status not null default 'pending',
  payout_id uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  payout_reference text not null unique,
  total_amount numeric(12,2) not null check (total_amount >= 0),
  payout_method text not null,
  payout_notes text,
  processed_by uuid not null references public.profiles(id) on delete restrict,
  processed_at timestamptz not null default timezone('utc', now()),
  idempotency_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (store_id, agent_id, idempotency_key)
);

create table if not exists public.commission_payout_items (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.commission_payouts(id) on delete cascade,
  commission_id uuid not null unique references public.commissions(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'commissions_payout_fk'
  ) then
    alter table public.commissions
      add constraint commissions_payout_fk
      foreign key (payout_id) references public.commission_payouts(id) on delete set null;
  end if;
end $$;

create index if not exists idx_profiles_store_role on public.profiles(store_id, role);
create index if not exists idx_categories_store on public.categories(store_id);
create index if not exists idx_products_store_available on public.products(store_id, is_available) where archived_at is null;
create index if not exists idx_products_store_category on public.products(store_id, category_id);
create index if not exists idx_orders_store_status on public.orders(store_id, status);
create index if not exists idx_orders_customer on public.orders(customer_id, placed_at desc);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_inventory_movements_product on public.inventory_movements(product_id, created_at desc);
create index if not exists idx_agents_store on public.agents(store_id, is_active);
create index if not exists idx_order_referrals_agent on public.order_referrals(agent_id, created_at desc);
create index if not exists idx_commissions_agent_status on public.commissions(agent_id, status, payout_id);
create index if not exists idx_commission_payouts_agent on public.commission_payouts(agent_id, processed_at desc);
create index if not exists idx_audit_logs_store on public.audit_logs(store_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'superadmin', false);
$$;

create or replace function public.is_admin_of_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_superadmin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.store_id = p_store_id
    ),
    false
  );
$$;

create or replace function public.generate_public_code(p_prefix text)
returns text
language plpgsql
as $$
begin
  return upper(p_prefix) || '-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || substr(encode(gen_random_bytes(4), 'hex'), 1, 8);
end;
$$;

create or replace function public.effective_product_price(
  p_price numeric,
  p_sale_price numeric,
  p_is_on_sale boolean,
  p_sale_starts_at timestamptz,
  p_sale_ends_at timestamptz
)
returns numeric
language sql
stable
as $$
  select case
    when p_is_on_sale = true
      and p_sale_price is not null
      and (p_sale_starts_at is null or p_sale_starts_at <= timezone('utc', now()))
      and (p_sale_ends_at is null or p_sale_ends_at >= timezone('utc', now()))
    then p_sale_price
    else p_price
  end;
$$;

create or replace function public.bootstrap_superadmin(
  p_user_id uuid,
  p_full_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if exists (select 1 from public.profiles where role = 'superadmin') then
    raise exception 'Superadmin bootstrap already completed.';
  end if;

  update public.profiles
  set role = 'superadmin',
      full_name = coalesce(p_full_name, full_name),
      is_active = true,
      updated_at = timezone('utc', now())
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Bootstrap user not found in profiles. Create the auth user first.';
  end if;

  insert into public.audit_logs (actor_profile_id, entity_type, entity_id, action, details)
  values (v_profile.id, 'profile', v_profile.id, 'bootstrap_superadmin', jsonb_build_object('email', v_profile.email));

  return v_profile;
end;
$$;

create or replace function public.sync_commission_for_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select * into v_order
  from public.orders
  where id = p_order_id;

  if v_order.id is null then
    return;
  end if;

  if v_order.status = 'completed' then
    update public.commissions
    set status = case when status = 'paid' then status else 'approved' end,
        approved_at = coalesce(approved_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
    where order_id = p_order_id
      and status in ('pending', 'locked');
  elsif v_order.status = 'cancelled' then
    update public.commissions
    set status = case when status = 'paid' then 'reversed' else 'cancelled' end,
        updated_at = timezone('utc', now())
    where order_id = p_order_id
      and status in ('pending', 'approved', 'locked', 'paid');
  end if;
end;
$$;

create or replace function public.orders_commission_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_commission_for_order(new.id);
  return new;
end;
$$;

drop trigger if exists trg_sync_commission_for_order on public.orders;
create trigger trg_sync_commission_for_order
after insert or update of status on public.orders
for each row execute procedure public.orders_commission_trigger();

create or replace function public.checkout_order_atomic(
  p_store_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_referral_code text default null,
  p_notes text default null
)
returns table (
  order_id uuid,
  order_number text,
  total_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item record;
  v_product public.products;
  v_unit_price numeric(12,2);
  v_agent public.agents;
  v_referral_id uuid;
  v_commission_amount numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Authentication required for checkout.';
  end if;

  if coalesce(jsonb_array_length(p_items), 0) = 0 then
    raise exception 'Checkout requires at least one item.';
  end if;

  select * into v_existing
  from public.orders
  where store_id = p_store_id
    and source = 'online'
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    return query
    select v_existing.id, v_existing.order_number, v_existing.total_amount;
    return;
  end if;

  insert into public.orders (
    store_id,
    customer_id,
    order_number,
    source,
    status,
    payment_status,
    notes,
    idempotency_key
  )
  values (
    p_store_id,
    p_customer_id,
    public.generate_public_code('ORD'),
    'online',
    'pending',
    'pending',
    p_notes,
    p_idempotency_key
  )
  returning id, order_number into v_order_id, v_order_number;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  loop
    select *
    into v_product
    from public.products
    where id = v_item.product_id
      and store_id = p_store_id
      and archived_at is null
    for update;

    if v_product.id is null then
      raise exception 'Product % not found.', v_item.product_id;
    end if;

    if v_product.is_available = false then
      raise exception 'Product % is unavailable.', v_product.name;
    end if;

    if v_product.track_inventory and v_product.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for product %.', v_product.name;
    end if;

    v_unit_price := public.effective_product_price(
      v_product.price,
      v_product.sale_price,
      v_product.is_on_sale,
      v_product.sale_starts_at,
      v_product.sale_ends_at
    );

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
    v_total := v_total + (v_unit_price * v_item.quantity);
    v_discount := v_discount + ((v_product.price - v_unit_price) * v_item.quantity);

    insert into public.order_items (
      order_id,
      product_id,
      sku,
      product_name,
      quantity,
      unit_price,
      discount_amount,
      line_total
    )
    values (
      v_order_id,
      v_product.id,
      v_product.sku,
      v_product.name,
      v_item.quantity,
      v_unit_price,
      greatest(v_product.price - v_unit_price, 0) * v_item.quantity,
      v_unit_price * v_item.quantity
    );

    if v_product.track_inventory then
      update public.products
      set stock_quantity = stock_quantity - v_item.quantity,
          updated_at = timezone('utc', now())
      where id = v_product.id;
    end if;

    insert into public.inventory_movements (
      store_id,
      product_id,
      order_id,
      quantity_delta,
      reason,
      created_by,
      notes
    )
    values (
      p_store_id,
      v_product.id,
      v_order_id,
      (v_item.quantity * -1),
      'online_sale',
      p_customer_id,
      'Atomic online checkout'
    );
  end loop;

  update public.orders
  set subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      total_amount = v_total,
      updated_at = timezone('utc', now())
  where id = v_order_id;

  if p_referral_code is not null then
    select a.*
    into v_agent
    from public.agents a
    where a.store_id = p_store_id
      and a.referral_code = p_referral_code
      and a.is_active = true
    for update;

    if v_agent.id is not null then
      insert into public.order_referrals (
        store_id,
        order_id,
        agent_id,
        referral_code_used
      )
      values (
        p_store_id,
        v_order_id,
        v_agent.id,
        p_referral_code
      )
      returning id into v_referral_id;

      v_commission_amount := case
        when v_agent.commission_type = 'percentage' then round((v_total * v_agent.commission_value / 100.0)::numeric, 2)
        else round(v_agent.commission_value::numeric, 2)
      end;

      insert into public.commissions (
        store_id,
        agent_id,
        order_id,
        order_referral_id,
        commission_type,
        commission_rate_or_value,
        commission_amount,
        status
      )
      values (
        p_store_id,
        v_agent.id,
        v_order_id,
        v_referral_id,
        v_agent.commission_type,
        v_agent.commission_value,
        greatest(v_commission_amount, 0),
        'pending'
      );
    end if;
  end if;

  insert into public.audit_logs (store_id, actor_profile_id, entity_type, entity_id, action, details)
  values (
    p_store_id,
    p_customer_id,
    'order',
    v_order_id,
    'checkout_order_atomic',
    jsonb_build_object('source', 'online', 'idempotency_key', p_idempotency_key)
  );

  return query
  select v_order_id, v_order_number, v_total;
end;
$$;

create or replace function public.complete_pos_sale_atomic(
  p_store_id uuid,
  p_cashier_id uuid,
  p_items jsonb,
  p_cash_received numeric,
  p_idempotency_key text,
  p_customer_id uuid default null,
  p_notes text default null
)
returns table (
  pos_transaction_id uuid,
  order_id uuid,
  receipt_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.orders;
  v_order_id uuid;
  v_receipt_number text;
  v_pos_id uuid;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
  v_item record;
  v_product public.products;
  v_unit_price numeric(12,2);
begin
  if not public.is_admin_of_store(p_store_id) then
    raise exception 'Only admin or superadmin can process POS sales for this store.';
  end if;

  select * into v_existing
  from public.orders
  where store_id = p_store_id
    and source = 'pos'
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    return query
    select pt.id, v_existing.id, pt.receipt_number
    from public.pos_transactions pt
    where pt.order_id = v_existing.id;
    return;
  end if;

  insert into public.orders (
    store_id,
    customer_id,
    order_number,
    source,
    status,
    payment_status,
    notes,
    idempotency_key
  )
  values (
    p_store_id,
    p_customer_id,
    public.generate_public_code('POS'),
    'pos',
    'completed',
    'paid',
    p_notes,
    p_idempotency_key
  )
  returning id into v_order_id;

  for v_item in
    select *
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity integer)
  loop
    select *
    into v_product
    from public.products
    where id = v_item.product_id
      and store_id = p_store_id
      and archived_at is null
    for update;

    if v_product.id is null then
      raise exception 'Product % not found.', v_item.product_id;
    end if;

    if v_product.track_inventory and v_product.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for product %.', v_product.name;
    end if;

    v_unit_price := public.effective_product_price(
      v_product.price,
      v_product.sale_price,
      v_product.is_on_sale,
      v_product.sale_starts_at,
      v_product.sale_ends_at
    );

    v_subtotal := v_subtotal + (v_product.price * v_item.quantity);
    v_total := v_total + (v_unit_price * v_item.quantity);
    v_discount := v_discount + ((v_product.price - v_unit_price) * v_item.quantity);

    insert into public.order_items (
      order_id,
      product_id,
      sku,
      product_name,
      quantity,
      unit_price,
      discount_amount,
      line_total
    )
    values (
      v_order_id,
      v_product.id,
      v_product.sku,
      v_product.name,
      v_item.quantity,
      v_unit_price,
      greatest(v_product.price - v_unit_price, 0) * v_item.quantity,
      v_unit_price * v_item.quantity
    );

    if v_product.track_inventory then
      update public.products
      set stock_quantity = stock_quantity - v_item.quantity,
          updated_at = timezone('utc', now())
      where id = v_product.id;
    end if;

    insert into public.inventory_movements (
      store_id,
      product_id,
      order_id,
      quantity_delta,
      reason,
      created_by,
      notes
    )
    values (
      p_store_id,
      v_product.id,
      v_order_id,
      (v_item.quantity * -1),
      'pos_sale',
      p_cashier_id,
      'Atomic POS sale'
    );
  end loop;

  update public.orders
  set subtotal_amount = v_subtotal,
      discount_amount = v_discount,
      total_amount = v_total,
      updated_at = timezone('utc', now())
  where id = v_order_id;

  if p_cash_received < v_total then
    raise exception 'Cash received must be at least the order total.';
  end if;

  v_receipt_number := public.generate_public_code('RCT');

  insert into public.pos_transactions (
    store_id,
    order_id,
    cashier_id,
    customer_id,
    receipt_number,
    cash_received,
    change_due,
    notes
  )
  values (
    p_store_id,
    v_order_id,
    p_cashier_id,
    p_customer_id,
    v_receipt_number,
    p_cash_received,
    p_cash_received - v_total,
    p_notes
  )
  returning id into v_pos_id;

  insert into public.pos_transaction_items (pos_transaction_id, order_item_id)
  select v_pos_id, oi.id
  from public.order_items oi
  where oi.order_id = v_order_id;

  insert into public.audit_logs (store_id, actor_profile_id, entity_type, entity_id, action, details)
  values (
    p_store_id,
    p_cashier_id,
    'pos_transaction',
    v_pos_id,
    'complete_pos_sale_atomic',
    jsonb_build_object('idempotency_key', p_idempotency_key, 'order_id', v_order_id)
  );

  return query
  select v_pos_id, v_order_id, v_receipt_number;
end;
$$;

create or replace function public.process_commission_payout(
  p_store_id uuid,
  p_agent_id uuid,
  p_processed_by uuid,
  p_idempotency_key text,
  p_payout_method text,
  p_payout_notes text default null
)
returns table (
  payout_id uuid,
  payout_reference text,
  total_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.commission_payouts;
  v_payout_id uuid;
  v_reference text;
  v_total numeric(12,2);
begin
  if not public.is_admin_of_store(p_store_id) then
    raise exception 'Only admin or superadmin can process payouts for this store.';
  end if;

  select * into v_existing
  from public.commission_payouts
  where store_id = p_store_id
    and agent_id = p_agent_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    return query
    select v_existing.id, v_existing.payout_reference, v_existing.total_amount;
    return;
  end if;

  with locked as (
    select c.id, c.commission_amount
    from public.commissions c
    where c.store_id = p_store_id
      and c.agent_id = p_agent_id
      and c.status in ('approved', 'locked')
      and c.payout_id is null
    for update
  )
  select coalesce(sum(commission_amount), 0) into v_total
  from locked;

  if v_total <= 0 then
    raise exception 'No eligible commissions available for payout.';
  end if;

  v_reference := public.generate_public_code('PAY');

  insert into public.commission_payouts (
    store_id,
    agent_id,
    payout_reference,
    total_amount,
    payout_method,
    payout_notes,
    processed_by,
    idempotency_key
  )
  values (
    p_store_id,
    p_agent_id,
    v_reference,
    v_total,
    p_payout_method,
    p_payout_notes,
    p_processed_by,
    p_idempotency_key
  )
  returning id into v_payout_id;

  insert into public.commission_payout_items (payout_id, commission_id, amount)
  select v_payout_id, c.id, c.commission_amount
  from public.commissions c
  where c.store_id = p_store_id
    and c.agent_id = p_agent_id
    and c.status in ('approved', 'locked')
    and c.payout_id is null;

  update public.commissions
  set payout_id = v_payout_id,
      status = 'paid',
      paid_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  where id in (
    select commission_id
    from public.commission_payout_items
    where payout_id = v_payout_id
  );

  insert into public.audit_logs (store_id, actor_profile_id, entity_type, entity_id, action, details)
  values (
    p_store_id,
    p_processed_by,
    'commission_payout',
    v_payout_id,
    'process_commission_payout',
    jsonb_build_object('agent_id', p_agent_id, 'total_amount', v_total, 'idempotency_key', p_idempotency_key)
  );

  return query
  select v_payout_id, v_reference, v_total;
end;
$$;

drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at before update on public.stores
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_store_branding_updated_at on public.store_branding;
create trigger trg_store_branding_updated_at before update on public.store_branding
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_carts_updated_at on public.carts;
create trigger trg_carts_updated_at before update on public.carts
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at before update on public.cart_items
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_agents_updated_at on public.agents;
create trigger trg_agents_updated_at before update on public.agents
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_commissions_updated_at on public.commissions;
create trigger trg_commissions_updated_at before update on public.commissions
for each row execute procedure public.set_updated_at();

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.store_branding enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.pos_transactions enable row level security;
alter table public.pos_transaction_items enable row level security;
alter table public.agents enable row level security;
alter table public.agent_links enable row level security;
alter table public.referral_visits enable row level security;
alter table public.order_referrals enable row level security;
alter table public.commissions enable row level security;
alter table public.commission_payouts enable row level security;
alter table public.commission_payout_items enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "public can view active branding" on public.store_branding;
create policy "public can view active branding"
on public.store_branding
for select
using (exists (select 1 from public.stores s where s.id = store_id and s.is_active = true));

drop policy if exists "public can view active categories" on public.categories;
create policy "public can view active categories"
on public.categories
for select
using (is_active = true and exists (select 1 from public.stores s where s.id = store_id and s.is_active = true));

drop policy if exists "public can view active products" on public.products;
create policy "public can view active products"
on public.products
for select
using (
  archived_at is null
  and is_available = true
  and exists (select 1 from public.stores s where s.id = store_id and s.is_active = true)
);

drop policy if exists "public can view product images" on public.product_images;
create policy "public can view product images"
on public.product_images
for select
using (exists (select 1 from public.products p where p.id = product_id and p.is_available = true and p.archived_at is null));

drop policy if exists "users can view own profile" on public.profiles;
create policy "users can view own profile"
on public.profiles
for select
using (id = auth.uid() or public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
using (id = auth.uid() or public.is_superadmin())
with check (id = auth.uid() or public.is_superadmin());

drop policy if exists "superadmin manages stores" on public.stores;
create policy "superadmin manages stores"
on public.stores
for all
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "admin and superadmin read branding" on public.store_branding;
create policy "admin and superadmin read branding"
on public.store_branding
for select
using (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin and superadmin write branding" on public.store_branding;
create policy "admin and superadmin write branding"
on public.store_branding
for all
using (public.is_superadmin() or public.is_admin_of_store(store_id))
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin and superadmin manage categories" on public.categories;
create policy "admin and superadmin manage categories"
on public.categories
for all
using (public.is_superadmin() or public.is_admin_of_store(store_id))
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin and superadmin manage products" on public.products;
create policy "admin and superadmin manage products"
on public.products
for all
using (public.is_superadmin() or public.is_admin_of_store(store_id))
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin and superadmin manage product images" on public.product_images;
create policy "admin and superadmin manage product images"
on public.product_images
for all
using (public.is_superadmin() or public.is_admin_of_store(store_id))
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "customer manages own cart" on public.carts;
create policy "customer manages own cart"
on public.carts
for all
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

drop policy if exists "customer manages own cart items" on public.cart_items;
create policy "customer manages own cart items"
on public.cart_items
for all
using (
  exists (
    select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.carts c where c.id = cart_id and c.customer_id = auth.uid()
  )
);

drop policy if exists "customers and admins view orders" on public.orders;
create policy "customers and admins view orders"
on public.orders
for select
using (customer_id = auth.uid() or public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "customer inserts own online order headers" on public.orders;
create policy "customer inserts own online order headers"
on public.orders
for insert
with check (source = 'online' and customer_id = auth.uid());

drop policy if exists "admin updates store orders" on public.orders;
create policy "admin updates store orders"
on public.orders
for update
using (public.is_superadmin() or public.is_admin_of_store(store_id))
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "orders read order items" on public.order_items;
create policy "orders read order items"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_id
      and (o.customer_id = auth.uid() or public.is_superadmin() or public.is_admin_of_store(o.store_id))
  )
);

drop policy if exists "admin reads inventory movements" on public.inventory_movements;
create policy "admin reads inventory movements"
on public.inventory_movements
for select
using (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin inserts inventory movements" on public.inventory_movements;
create policy "admin inserts inventory movements"
on public.inventory_movements
for insert
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin reads pos transactions" on public.pos_transactions;
create policy "admin reads pos transactions"
on public.pos_transactions
for select
using (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin manages agents" on public.agents;
create policy "admin manages agents"
on public.agents
for all
using (public.is_superadmin() or public.is_admin_of_store(store_id) or profile_id = auth.uid())
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "agent views own links" on public.agent_links;
create policy "agent views own links"
on public.agent_links
for select
using (
  public.is_superadmin()
  or public.is_admin_of_store(store_id)
  or exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.profile_id = auth.uid()
  )
);

drop policy if exists "admin manages agent links" on public.agent_links;
create policy "admin manages agent links"
on public.agent_links
for all
using (public.is_superadmin() or public.is_admin_of_store(store_id))
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin and agent read referral visits" on public.referral_visits;
create policy "admin and agent read referral visits"
on public.referral_visits
for select
using (
  public.is_superadmin()
  or public.is_admin_of_store(store_id)
  or exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.profile_id = auth.uid()
  )
);

drop policy if exists "admin and agent read order referrals" on public.order_referrals;
create policy "admin and agent read order referrals"
on public.order_referrals
for select
using (
  public.is_superadmin()
  or public.is_admin_of_store(store_id)
  or exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.profile_id = auth.uid()
  )
);

drop policy if exists "admin and agent read commissions" on public.commissions;
create policy "admin and agent read commissions"
on public.commissions
for select
using (
  public.is_superadmin()
  or public.is_admin_of_store(store_id)
  or exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.profile_id = auth.uid()
  )
);

drop policy if exists "admin manages commissions" on public.commissions;
create policy "admin manages commissions"
on public.commissions
for update
using (public.is_superadmin() or public.is_admin_of_store(store_id))
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin and agent read commission payouts" on public.commission_payouts;
create policy "admin and agent read commission payouts"
on public.commission_payouts
for select
using (
  public.is_superadmin()
  or public.is_admin_of_store(store_id)
  or exists (
    select 1
    from public.agents a
    where a.id = agent_id
      and a.profile_id = auth.uid()
  )
);

drop policy if exists "admin inserts commission payouts" on public.commission_payouts;
create policy "admin inserts commission payouts"
on public.commission_payouts
for insert
with check (public.is_superadmin() or public.is_admin_of_store(store_id));

drop policy if exists "admin and agent read payout items" on public.commission_payout_items;
create policy "admin and agent read payout items"
on public.commission_payout_items
for select
using (
  exists (
    select 1
    from public.commission_payouts cp
    join public.agents a on a.id = cp.agent_id
    where cp.id = payout_id
      and (public.is_superadmin() or public.is_admin_of_store(cp.store_id) or a.profile_id = auth.uid())
  )
);

drop policy if exists "admin reads audit logs" on public.audit_logs;
create policy "admin reads audit logs"
on public.audit_logs
for select
using (public.is_superadmin() or public.is_admin_of_store(store_id));

insert into storage.buckets (id, name, public)
values ('product-assets', 'product-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('branding-assets', 'branding-assets', true)
on conflict (id) do nothing;

drop policy if exists "public read product assets" on storage.objects;
create policy "public read product assets"
on storage.objects
for select
using (bucket_id = 'product-assets');

drop policy if exists "admin manage product assets" on storage.objects;
create policy "admin manage product assets"
on storage.objects
for all
using (
  bucket_id = 'product-assets'
  and (public.is_superadmin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
)
with check (
  bucket_id = 'product-assets'
  and (public.is_superadmin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
);

drop policy if exists "public read branding assets" on storage.objects;
create policy "public read branding assets"
on storage.objects
for select
using (bucket_id = 'branding-assets');

drop policy if exists "admin manage branding assets" on storage.objects;
create policy "admin manage branding assets"
on storage.objects
for all
using (
  bucket_id = 'branding-assets'
  and (public.is_superadmin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
)
with check (
  bucket_id = 'branding-assets'
  and (public.is_superadmin() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
);
