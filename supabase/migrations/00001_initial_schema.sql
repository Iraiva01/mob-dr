-- =============================================================================
-- Migration: Initial Schema
-- =============================================================================
-- Creates the core database schema for the Mob Dr phone repair app.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- or via the Supabase CLI: supabase db push
--
-- Tables: users, repair_requests, repair_photos, completed_repairs
-- Enums:  user_role, repair_status
-- RLS:    Policies for customer and shop_owner access control
--
-- Key design decisions:
--   1. The `users` table is a public profile table that mirrors auth.users.
--      A trigger auto-creates a profile row when someone signs up.
--   2. Password is NOT stored here — Supabase Auth handles that entirely.
--   3. RLS ensures customers can only see/modify their own data, while the
--      shop owner has broader access to manage all requests.
-- =============================================================================


-- ============================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================

-- User roles: determines which navigator stack the app shows after login.
CREATE TYPE user_role AS ENUM ('customer', 'shop_owner');

-- Repair request lifecycle statuses.
-- pending   → customer submitted, awaiting review
-- accepted  → shop owner accepted, will perform repair
-- rejected  → shop owner declined
-- completed → repair done, amount charged recorded
CREATE TYPE repair_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');


-- ============================================================
-- 2. TABLES
-- ============================================================

-- ----- users (public profile table) -----
-- This is NOT the auth table — Supabase Auth manages auth.users separately.
-- This table stores the profile data our app needs (phone number, role).
-- The `id` column references auth.users.id so each profile maps 1:1 to an auth account.
CREATE TABLE users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  phone_number text,
  role        user_role NOT NULL DEFAULT 'customer',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Add a comment for documentation in the Supabase dashboard
COMMENT ON TABLE users IS 'Public user profiles. Maps 1:1 with auth.users. Role determines app navigation.';


-- ----- repair_requests -----
CREATE TABLE repair_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand            text NOT NULL,
  device_name      text NOT NULL,
  problem_type     text NOT NULL,
  additional_notes text,
  status           repair_status NOT NULL DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE repair_requests IS 'Repair requests submitted by customers. Shop owner reviews and updates status.';

-- Index for fast lookups: customer viewing their own requests
CREATE INDEX idx_repair_requests_customer_id ON repair_requests(customer_id);

-- Index for fast lookups: shop owner filtering by status
CREATE INDEX idx_repair_requests_status ON repair_requests(status);


-- ----- repair_photos -----
CREATE TABLE repair_photos (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_request_id  uuid NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  photo_url          text NOT NULL,
  uploaded_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE repair_photos IS 'Photos uploaded by customers for their repair requests (1-2 per request).';

-- Index for retrieving photos by request
CREATE INDEX idx_repair_photos_request_id ON repair_photos(repair_request_id);


-- ----- completed_repairs -----
CREATE TABLE completed_repairs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_request_id  uuid NOT NULL REFERENCES repair_requests(id) ON DELETE CASCADE,
  completion_date    timestamptz NOT NULL DEFAULT now(),
  amount_charged     numeric NOT NULL CHECK (amount_charged >= 0),
  notes              text
);

COMMENT ON TABLE completed_repairs IS 'Records created by shop owner when a repair is finished. Tracks revenue.';

-- Each request can only be completed once
CREATE UNIQUE INDEX idx_completed_repairs_request_id ON completed_repairs(repair_request_id);


-- ============================================================
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ============================================================
-- Automatically sets `updated_at` to now() whenever a repair_request row
-- is modified (e.g., status changes from pending → accepted).

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_repair_requests_updated_at
  BEFORE UPDATE ON repair_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================
-- 4. AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================
-- When a new user signs up via Supabase Auth, automatically insert a row
-- into the public `users` table. The role defaults to 'customer'.
-- The signup flow can pass `role` in the metadata to override this
-- (e.g., for the shop owner's initial account setup).

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone_number, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::user_role,
      'customer'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The trigger fires AFTER a new row is inserted into auth.users (i.e., after signup).
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================
-- RLS ensures that even if someone has the anon key, they can only access
-- data they're authorized to see. Each table gets its own set of policies.
--
-- Helper pattern used below:
--   auth.uid()         → the UUID of the currently authenticated user
--   (SELECT role FROM users WHERE id = auth.uid())  → the current user's role

-- Enable RLS on all tables (this blocks ALL access by default until policies are added)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_repairs ENABLE ROW LEVEL SECURITY;


-- ----- users policies -----

-- Users can read their own profile (needed to check role on login)
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile (e.g., change phone number)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Shop owner can read any user's profile (needed to see customer contact info on requests)
CREATE POLICY "Shop owner can read all profiles"
  ON users FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  );


-- ----- repair_requests policies -----

-- Customers can view their own repair requests
CREATE POLICY "Customers can read own requests"
  ON repair_requests FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create new repair requests (only for themselves)
CREATE POLICY "Customers can insert own requests"
  ON repair_requests FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Shop owner can view ALL repair requests (to review incoming work)
CREATE POLICY "Shop owner can read all requests"
  ON repair_requests FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  );

-- Shop owner can update any request (to change status: accept/reject/complete)
CREATE POLICY "Shop owner can update any request"
  ON repair_requests FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  );


-- ----- repair_photos policies -----

-- Customers can view photos for their own repair requests
CREATE POLICY "Customers can read own photos"
  ON repair_photos FOR SELECT
  USING (
    repair_request_id IN (
      SELECT id FROM repair_requests WHERE customer_id = auth.uid()
    )
  );

-- Customers can upload photos for their own repair requests
CREATE POLICY "Customers can insert own photos"
  ON repair_photos FOR INSERT
  WITH CHECK (
    repair_request_id IN (
      SELECT id FROM repair_requests WHERE customer_id = auth.uid()
    )
  );

-- Shop owner can view all photos (to review repair requests)
CREATE POLICY "Shop owner can read all photos"
  ON repair_photos FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  );


-- ----- completed_repairs policies -----

-- Only the shop owner can create completed repair records
CREATE POLICY "Shop owner can insert completed repairs"
  ON completed_repairs FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  );

-- Shop owner can view all completed repairs (for the dashboard/revenue stats)
CREATE POLICY "Shop owner can read all completed repairs"
  ON completed_repairs FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  );

-- Customers can view completed repairs for their own requests
CREATE POLICY "Customers can read own completed repairs"
  ON completed_repairs FOR SELECT
  USING (
    repair_request_id IN (
      SELECT id FROM repair_requests WHERE customer_id = auth.uid()
    )
  );

-- Shop owner can update completed repairs (e.g., correct an amount)
CREATE POLICY "Shop owner can update completed repairs"
  ON completed_repairs FOR UPDATE
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  )
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'shop_owner'
  );
