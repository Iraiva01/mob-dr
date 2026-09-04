-- =============================================================================
-- Migration: Auth Triggers and Phone Helper RPC
-- =============================================================================
-- 1. Updates `handle_new_user()` to set explicit search_path and public.user_role
--    to prevent 500 errors when inserting into public.users from auth triggers.
-- 2. Creates `auto_confirm_user()` trigger to automatically confirm email addresses
--    so new signups immediately establish an authenticated session.
-- 3. Creates `get_email_for_phone()` RPC to allow phone-number-based login
--    using Supabase Auth's email/password authentication mechanism.
-- =============================================================================

-- 1. Auto-create user profile with proper search_path and type casting
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, phone_number, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', ''),
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'customer'::public.user_role
    )
  );
  RETURN NEW;
END;
$$;

-- Ensure trigger is active on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Auto-confirm user email for immediate session creation
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  NEW.confirmed_at = COALESCE(NEW.confirmed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_before_insert ON auth.users;
CREATE TRIGGER on_auth_user_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_user();

-- 3. Helper RPC to look up account email by phone number
CREATE OR REPLACE FUNCTION public.get_email_for_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  clean_phone text;
BEGIN
  clean_phone := regexp_replace(p_phone, '[^0-9]', '', 'g');
  
  IF length(clean_phone) >= 10 THEN
    SELECT email INTO v_email
    FROM public.users
    WHERE regexp_replace(phone_number, '[^0-9]', '', 'g') LIKE '%' || clean_phone
       OR clean_phone LIKE '%' || regexp_replace(phone_number, '[^0-9]', '', 'g')
    ORDER BY created_at DESC
    LIMIT 1;
  ELSE
    SELECT email INTO v_email
    FROM public.users
    WHERE phone_number = p_phone
    LIMIT 1;
  END IF;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_for_phone(text) TO anon, authenticated, service_role;

-- 4. Helper function to get current user's role without recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon, authenticated, service_role;

-- 5. Fix RLS recursion on public.users
DROP POLICY IF EXISTS "Shop owner can read all profiles" ON public.users;
CREATE POLICY "Shop owner can read all profiles"
  ON public.users FOR SELECT
  USING (
    public.get_my_role() = 'shop_owner'
  );

