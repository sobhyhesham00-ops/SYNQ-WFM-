-- Tayar — raw PostgreSQL schema (if you prefer SQL over Prisma).
-- Money is stored as integer piastres (1 EGP = 100). Never FLOAT for cash.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

CREATE TABLE restaurants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE manager_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'manager', -- manager | cashier
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_manager_users_restaurant ON manager_users(restaurant_id);

CREATE TYPE driver_status AS ENUM ('Idle', 'Delivering', 'Offline');

CREATE TABLE drivers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status        driver_status NOT NULL DEFAULT 'Offline',
  current_lat   DOUBLE PRECISION,          -- hot column: latest position
  current_lng   DOUBLE PRECISION,
  last_seen_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_drivers_restaurant_status ON drivers(restaurant_id, status);

CREATE TYPE order_status AS ENUM
  ('Pending', 'Assigned', 'PickedUp', 'Delivered', 'Cancelled');

CREATE TABLE orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id         UUID NOT NULL REFERENCES restaurants(id),
  driver_id             UUID REFERENCES drivers(id),
  customer_address      TEXT NOT NULL,
  customer_phone        TEXT,
  total_cash_to_collect INTEGER NOT NULL,   -- piastres
  status                order_status NOT NULL DEFAULT 'Pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at           TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  settled               BOOLEAN NOT NULL DEFAULT false, -- cash handed to cashier?
  settled_at            TIMESTAMPTZ
);
CREATE INDEX idx_orders_restaurant_status ON orders(restaurant_id, status);
-- Powers the cash-drawer query: driver's delivered-but-unsettled orders.
CREATE INDEX idx_orders_driver_settle ON orders(driver_id, status, settled);

CREATE TABLE location_logs (
  id         BIGSERIAL PRIMARY KEY,
  driver_id  UUID NOT NULL REFERENCES drivers(id),
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  timestamp  TIMESTAMPTZ NOT NULL          -- device fix time
);
CREATE INDEX idx_location_logs_driver_time ON location_logs(driver_id, timestamp);

-- Post-MVP: partition location_logs by month, e.g. with pg_partman or
-- TimescaleDB, since it is the only unbounded table.
