-- ============================================================
-- TIMELINE & COMMENTS — run AFTER schema.sql
-- ============================================================

-- ── ticket_events table ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ticket_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id   UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  todo_id     UUID REFERENCES public.todos(id) ON DELETE SET NULL,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,   -- ticket_created | status_changed | priority_changed
                               -- assigned | todo_created | todo_status_changed | comment
  is_internal BOOLEAN NOT NULL DEFAULT false,
  old_value   TEXT,
  new_value   TEXT,
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket ON public.ticket_events(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_events_todo   ON public.ticket_events(todo_id);

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.ticket_events TO authenticated;

-- SELECT: user must have access to the parent ticket,
--         AND internal events are hidden from agents
CREATE POLICY "ticket_events_select"
  ON public.ticket_events FOR SELECT TO authenticated
  USING (
    (is_internal = false OR public.my_role() IN ('admin', 'support', 'developer'))
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_events.ticket_id
        AND (
          public.my_role() IN ('admin', 'support')
          OR t.created_by   = public.my_profile_id()
          OR t.assigned_to  = public.my_profile_id()
          OR EXISTS (
            SELECT 1 FROM public.todos td
            WHERE td.ticket_id = t.id
              AND td.assigned_to = public.my_profile_id()
          )
        )
    )
  );

CREATE POLICY "ticket_events_insert"
  ON public.ticket_events FOR INSERT TO authenticated
  WITH CHECK (created_by = public.my_profile_id() OR created_by IS NULL);

CREATE POLICY "ticket_events_delete"
  ON public.ticket_events FOR DELETE TO authenticated
  USING (public.my_role() = 'admin');
