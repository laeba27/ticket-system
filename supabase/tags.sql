-- ============================================================
-- TICKET TAGS — run AFTER schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT 'zinc',  -- tailwind color name
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_tags (
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tag_id    UUID NOT NULL REFERENCES public.tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket ON public.ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tag    ON public.ticket_tags(tag_id);

-- RLS
ALTER TABLE public.tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.tags        TO authenticated;
GRANT ALL ON public.ticket_tags TO authenticated;

-- Tags: anyone can read; support/admin can insert/delete
CREATE POLICY "tags_select" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags_insert" ON public.tags FOR INSERT TO authenticated
  WITH CHECK (public.my_role() IN ('admin', 'support'));
CREATE POLICY "tags_delete" ON public.tags FOR DELETE TO authenticated
  USING (public.my_role() IN ('admin', 'support'));

-- Ticket_tags: inherit ticket visibility; support/admin can manage
CREATE POLICY "ticket_tags_select" ON public.ticket_tags FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = ticket_tags.ticket_id
    AND (
      public.my_role() IN ('admin', 'support')
      OR t.created_by  = public.my_profile_id()
      OR t.assigned_to = public.my_profile_id()
      OR EXISTS (
        SELECT 1 FROM public.todos td
        WHERE td.ticket_id = t.id AND td.assigned_to = public.my_profile_id()
      )
    )
  ));

CREATE POLICY "ticket_tags_insert" ON public.ticket_tags FOR INSERT TO authenticated
  WITH CHECK (public.my_role() IN ('admin', 'support'));

CREATE POLICY "ticket_tags_delete" ON public.ticket_tags FOR DELETE TO authenticated
  USING (public.my_role() IN ('admin', 'support'));

-- Seed default tags
INSERT INTO public.tags (name, color) VALUES
  ('Bug',             'red'),
  ('Feature Request', 'blue'),
  ('Billing',         'amber'),
  ('UI / UX',         'purple'),
  ('Security',        'orange'),
  ('Performance',     'emerald'),
  ('Documentation',   'zinc')
ON CONFLICT (name) DO NOTHING;
