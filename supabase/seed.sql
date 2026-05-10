-- ============================================================
-- ETHATA TICKET MANAGEMENT SYSTEM - SEED DATA
-- Run AFTER schema.sql
-- Creates 3 default users: admin, support, developer
-- ============================================================

-- Step 1: Create users in auth.users via Supabase Auth Admin API
-- OR use the Supabase Dashboard > Authentication > Users > Add User
-- Below are the SQL commands to insert directly (for local dev / self-hosted)

-- ============================================================
-- DEFAULT USER CREDENTIALS
-- ============================================================
-- admin@ethata.dev     / Admin@123456
-- support@ethata.dev   / Support@123456
-- developer@ethata.dev / Developer@123456
-- agent@ethata.dev     / Agent@123456
-- ============================================================

-- NOTE: In Supabase Cloud, create users via Dashboard > Authentication > Users
-- Then run the UPDATE statements below to assign roles.

-- If using Supabase CLI / local dev, you can use these auth inserts:
-- (Replace the UUIDs with actual user IDs after creating via Dashboard)

-- ============================================================
-- AFTER creating users in Supabase Auth Dashboard,
-- run these statements to assign roles:
-- ============================================================

-- Replace these emails with the ones you registered:
UPDATE public.profiles
SET role = 'admin', full_name = 'Admin User'
WHERE email = 'admin@ethata.dev';

UPDATE public.profiles
SET role = 'support', full_name = 'Support User'
WHERE email = 'support@ethata.dev';

UPDATE public.profiles
SET role = 'developer', full_name = 'Developer User'
WHERE email = 'developer@ethata.dev';

UPDATE public.profiles
SET role = 'agent', full_name = 'Agent User'
WHERE email = 'agent@ethata.dev';

-- ============================================================
-- SAMPLE TICKETS (run after roles are assigned)
-- ============================================================

DO $$
DECLARE
  v_agent_id    UUID;
  v_support_id  UUID;
  v_dev_id      UUID;
  v_admin_id    UUID;
  v_ticket1_id  UUID;
  v_ticket2_id  UUID;
  v_ticket3_id  UUID;
BEGIN
  SELECT id INTO v_agent_id   FROM public.profiles WHERE email = 'agent@ethata.dev';
  SELECT id INTO v_support_id FROM public.profiles WHERE email = 'support@ethata.dev';
  SELECT id INTO v_dev_id     FROM public.profiles WHERE email = 'developer@ethata.dev';
  SELECT id INTO v_admin_id   FROM public.profiles WHERE email = 'admin@ethata.dev';

  -- Only insert sample data if all required profiles exist
  IF v_agent_id IS NULL OR v_support_id IS NULL OR v_dev_id IS NULL THEN
    RAISE NOTICE 'Skipping sample tickets: one or more profiles not found. Run the UPDATE role statements first, then re-run this block.';
    RETURN;
  END IF;

  -- Create sample tickets
  INSERT INTO public.tickets (id, title, description, status, priority, created_by, assigned_to)
  VALUES
    (uuid_generate_v4(), 'Login page shows blank screen on Safari',
     'When accessing the login page from Safari 17 on macOS, the page renders blank. Chrome and Firefox work fine.',
     'open', 'high', v_agent_id, v_dev_id)
  RETURNING id INTO v_ticket1_id;

  INSERT INTO public.tickets (id, title, description, status, priority, created_by, assigned_to)
  VALUES
    (uuid_generate_v4(), 'Export to CSV not working for large datasets',
     'Exporting more than 1000 records causes a timeout. Need pagination or background job.',
     'in_progress', 'critical', v_agent_id, v_dev_id)
  RETURNING id INTO v_ticket2_id;

  INSERT INTO public.tickets (id, title, description, status, priority, created_by)
  VALUES
    (uuid_generate_v4(), 'Add dark mode support to dashboard',
     'Users have requested a dark mode toggle for the dashboard. Should respect system preference as default.',
     'open', 'low', v_agent_id)
  RETURNING id INTO v_ticket3_id;

  -- Create todos for the assigned tickets
  INSERT INTO public.todos (ticket_id, assigned_to, created_by, title, notes, status)
  VALUES
    (v_ticket1_id, v_dev_id, v_support_id,
     'Fix Safari blank screen issue',
     'Investigate CSS rendering and JS compatibility issues with Safari 17.',
     'pending');

  INSERT INTO public.todos (ticket_id, assigned_to, created_by, title, notes, status)
  VALUES
    (v_ticket2_id, v_dev_id, v_support_id,
     'Implement paginated CSV export',
     'Use background job queue for large exports. Notify user via email when ready.',
     'in_progress');

END $$;

-- ============================================================
-- VERIFY
-- ============================================================

SELECT p.email, p.full_name, p.role
FROM public.profiles p
ORDER BY p.role;

SELECT t.title, t.status, t.priority,
       c.email as created_by, a.email as assigned_to
FROM public.tickets t
JOIN public.profiles c ON c.id = t.created_by
LEFT JOIN public.profiles a ON a.id = t.assigned_to
ORDER BY t.created_at;
