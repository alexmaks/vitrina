-- ============================================================
-- Витрина-в-кармане: начальная миграция
-- Выполнить в Supabase Dashboard → SQL Editor
-- ============================================================

-- Таблица мастеров
create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  telegram_username text,
  telegram_first_name text,
  slug text unique,
  name text,
  tagline text,
  avatar_url text,
  accent_color text default '#854F0B',
  sale_percent int,
  sale_until timestamptz,
  sale_text text default 'Распродажа на всё',
  contact_telegram text not null,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_merchants_slug on merchants(slug);
create index if not exists idx_merchants_telegram on merchants(telegram_id);

-- Таблица товаров
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade not null,
  name text not null,
  price int not null,
  description text,
  image_url text,
  discount_percent int,
  is_available boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_merchant on products(merchant_id);

-- Автообновление updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger merchants_updated_at
  before update on merchants
  for each row execute function update_updated_at();

create trigger products_updated_at
  before update on products
  for each row execute function update_updated_at();

-- Row Level Security
alter table merchants enable row level security;
alter table products enable row level security;

-- Публичное чтение опубликованных витрин (для страниц /[slug])
create policy "public read published merchants"
  on merchants for select
  using (is_published = true);

create policy "public read products of published merchants"
  on products for select
  using (
    exists (
      select 1 from merchants m
      where m.id = products.merchant_id
        and m.is_published = true
    )
  );

-- Запись только через service_role (серверные API-роуты)
-- service_role автоматически обходит RLS — дополнительных политик не нужно
