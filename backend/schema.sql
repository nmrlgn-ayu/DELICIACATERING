-- =====================================================
-- Deli Catering v2 - tabel berawalan deli_ (anti bentrok)
-- Supabase: SQL Editor > New query > tempel semua > Run
-- =====================================================

create table if not exists deli_categories (
  id          text primary key,
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists deli_suppliers (
  id          text primary key,
  name        text not null unique,
  phone       text,
  address     text,
  created_at  timestamptz not null default now()
);

create table if not exists deli_employees (
  id          text primary key,
  name        text not null unique,
  position    text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists deli_expenses (
  id          text primary key,
  date        date not null,
  receipt     text not null unique,
  description text not null,
  category_id text not null references deli_categories(id) on delete restrict on update cascade,
  supplier_id text not null references deli_suppliers(id)  on delete restrict on update cascade,
  employee_id text not null references deli_employees(id)  on delete restrict on update cascade,
  method      text not null check (method in ('Kas','Transfer','QRIS')),
  amount      numeric(15,0) not null check (amount > 0),
  created_at  timestamptz not null default now()
);

create index if not exists idx_deli_expenses_date     on deli_expenses(date desc);
create index if not exists idx_deli_expenses_category on deli_expenses(category_id);
create index if not exists idx_deli_expenses_supplier on deli_expenses(supplier_id);
create index if not exists idx_deli_expenses_employee on deli_expenses(employee_id);

-- Data awal
insert into deli_categories (id, name, description) values
  ('KAT-001','Bahan Baku','Bahan makanan dan minuman'),
  ('KAT-002','Operasional','Gas, air, listrik, dan transportasi'),
  ('KAT-003','Gaji & Upah','Pembayaran tenaga kerja'),
  ('KAT-004','Lain-lain','Pengeluaran di luar kategori utama')
on conflict (id) do nothing;

insert into deli_suppliers (id, name, phone, address) values
  ('PMS-001','Sumber Pangan Sejahtera','081234567801','Jl. Pasar Induk No. 12'),
  ('PMS-002','Toko Kemasan Berkah','081234567802','Jl. Melati No. 8'),
  ('PMS-003','Mitra Gas & Air','081234567803','Jl. Kenanga No. 4')
on conflict (id) do nothing;

insert into deli_employees (id, name, position, phone) values
  ('PGW-001','Nadia Putri','Admin Keuangan','081234567811'),
  ('PGW-002','Rizky Pratama','Staf Operasional','081234567812')
on conflict (id) do nothing;

insert into deli_expenses (id, date, receipt, description, category_id, supplier_id, employee_id, method, amount) values
  ('TRX-001','2026-09-02','KK-001','Pembelian ayam, sayur dan bumbu','KAT-001','PMS-001','PGW-001','Transfer',1250000),
  ('TRX-002','2026-09-05','KK-002','Gas LPG dan air galon','KAT-002','PMS-003','PGW-002','Kas',350000),
  ('TRX-003','2026-09-10','KK-003','Pembayaran tenaga harian','KAT-003','PMS-001','PGW-001','Transfer',900000),
  ('TRX-004','2026-09-14','KK-004','Pembelian kemasan catering','KAT-001','PMS-002','PGW-002','Kas',475000),
  ('TRX-005','2026-09-18','KK-005','Transportasi pengantaran pesanan','KAT-002','PMS-003','PGW-002','QRIS',275000)
on conflict (id) do nothing;

-- RLS (akses anon terbuka, karena aplikasi belum memakai login)
alter table deli_categories enable row level security;
alter table deli_suppliers  enable row level security;
alter table deli_employees  enable row level security;
alter table deli_expenses   enable row level security;

drop policy if exists "deli_categories_all" on deli_categories;
create policy "deli_categories_all" on deli_categories for all to anon, authenticated using (true) with check (true);

drop policy if exists "deli_suppliers_all" on deli_suppliers;
create policy "deli_suppliers_all" on deli_suppliers for all to anon, authenticated using (true) with check (true);

drop policy if exists "deli_employees_all" on deli_employees;
create policy "deli_employees_all" on deli_employees for all to anon, authenticated using (true) with check (true);

drop policy if exists "deli_expenses_all" on deli_expenses;
create policy "deli_expenses_all" on deli_expenses for all to anon, authenticated using (true) with check (true);
