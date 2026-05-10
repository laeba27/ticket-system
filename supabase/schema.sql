-- ============================================================
-- ETHATA TICKET MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'support', 'developer', 'agent');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE todo_status AS ENUM ('pending', 'in_progress', 'done');

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL DEFAULT '',
  role        user_role NOT NULL DEFAULT 'agent',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TICKETS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status      ticket_status NOT NULL DEFAULT 'open',
  priority    ticket_priority NOT NULL DEFAULT 'medium',
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TODOS TABLE (created when support assigns ticket to developer)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.todos (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  notes       TEXT DEFAULT '',
  status      todo_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: Get current user's profile ID
-- ============================================================

CREATE OR REPLACE FUNCTION public.my_profile_id()
RETURNS UUID AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- HELPER: Get current user's role
-- ============================================================

CREATE OR REPLACE FUNCTION public.my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- RLS POLICIES: PROFILES
-- ============================================================

-- Anyone authenticated can read profiles (needed for assignment dropdowns)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile (non-role fields)
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
  );

-- Only admins can update roles
CREATE POLICY "profiles_update_role_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.my_role() = 'admin')
  WITH CHECK (public.my_role() = 'admin');

-- ============================================================
-- RLS POLICIES: TICKETS
-- ============================================================

-- Agents can only see their own tickets
-- Support, developers (assigned), and admins see all tickets
CREATE POLICY "tickets_select"
  ON public.tickets FOR SELECT
  TO authenticated
  USING (
    public.my_role() IN ('admin', 'support')
    OR created_by = public.my_profile_id()
    OR assigned_to = public.my_profile_id()
    OR EXISTS (
      SELECT 1 FROM public.todos
      WHERE todos.ticket_id = tickets.id
      AND todos.assigned_to = public.my_profile_id()
    )
  );

-- Agents, support, and admins can create tickets
CREATE POLICY "tickets_insert"
  ON public.tickets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.my_role() IN ('admin', 'support', 'agent', 'developer')
    AND created_by = public.my_profile_id()
  );

-- Support and admins can update any ticket; agents can update only their own
CREATE POLICY "tickets_update"
  ON public.tickets FOR UPDATE
  TO authenticated
  USING (
    public.my_role() IN ('admin', 'support')
    OR created_by = public.my_profile_id()
    OR assigned_to = public.my_profile_id()
  );

-- Only admins can delete tickets
CREATE POLICY "tickets_delete"
  ON public.tickets FOR DELETE
  TO authenticated
  USING (public.my_role() = 'admin');

-- ============================================================
-- RLS POLICIES: TODOS
-- ============================================================

-- Support and admins see all todos; developers see their own todos
CREATE POLICY "todos_select"
  ON public.todos FOR SELECT
  TO authenticated
  USING (
    public.my_role() IN ('admin', 'support')
    OR assigned_to = public.my_profile_id()
    OR created_by = public.my_profile_id()
  );

-- Support and admins can create todos
CREATE POLICY "todos_insert"
  ON public.todos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.my_role() IN ('admin', 'support')
    AND created_by = public.my_profile_id()
  );

-- Support, admins, and the assigned developer can update todos
CREATE POLICY "todos_update"
  ON public.todos FOR UPDATE
  TO authenticated
  USING (
    public.my_role() IN ('admin', 'support')
    OR assigned_to = public.my_profile_id()
  );

-- Only admins and support can delete todos
CREATE POLICY "todos_delete"
  ON public.todos FOR DELETE
  TO authenticated
  USING (public.my_role() IN ('admin', 'support'));

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON public.tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_todos_ticket_id ON public.todos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to ON public.todos(assigned_to);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.tickets TO authenticated;
GRANT ALL ON public.todos TO authenticated;
GRANT SELECT ON public.profiles TO anon;
