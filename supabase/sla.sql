-- ============================================================
-- SLA / DUE DATE — run AFTER schema.sql
-- Adds due_at to tickets with auto-SLA defaults
-- ============================================================

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

-- Index for overdue queries
CREATE INDEX IF NOT EXISTS idx_tickets_due_at ON public.tickets(due_at)
  WHERE due_at IS NOT NULL;
