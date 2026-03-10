
-- Daily log entries table
CREATE TABLE public.daily_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Planned',
  priority TEXT DEFAULT 'Medium',
  due_date DATE DEFAULT NULL,
  needs_help BOOLEAN NOT NULL DEFAULT false,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recur_pattern TEXT DEFAULT NULL,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  notes TEXT DEFAULT NULL,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_daily_log_entries_user_date ON public.daily_log_entries(user_id, log_date);
CREATE INDEX idx_daily_log_entries_date ON public.daily_log_entries(log_date);

-- RLS
ALTER TABLE public.daily_log_entries ENABLE ROW LEVEL SECURITY;

-- Users see their own entries
CREATE POLICY "Users can view own daily log entries"
  ON public.daily_log_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins see all
CREATE POLICY "Admins can view all daily log entries"
  ON public.daily_log_entries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can insert their own
CREATE POLICY "Users can insert own daily log entries"
  ON public.daily_log_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can insert for anyone
CREATE POLICY "Admins can insert daily log entries for any user"
  ON public.daily_log_entries FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can update their own
CREATE POLICY "Users can update own daily log entries"
  ON public.daily_log_entries FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Admins can update all
CREATE POLICY "Admins can update all daily log entries"
  ON public.daily_log_entries FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Users can delete own
CREATE POLICY "Users can delete own daily log entries"
  ON public.daily_log_entries FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admins can delete all
CREATE POLICY "Admins can delete all daily log entries"
  ON public.daily_log_entries FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Updated_at trigger
CREATE TRIGGER set_daily_log_entries_updated_at
  BEFORE UPDATE ON public.daily_log_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for status and priority
CREATE OR REPLACE FUNCTION public.validate_daily_log_entry()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('Planned', 'In Progress', 'Done', 'Blocked', 'Skipped', 'Moved') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.priority IS NOT NULL AND NEW.priority NOT IN ('High', 'Medium', 'Low') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  IF NEW.recur_pattern IS NOT NULL AND NEW.recur_pattern NOT IN ('Daily', 'Weekly', 'Monthly') THEN
    RAISE EXCEPTION 'Invalid recur_pattern: %', NEW.recur_pattern;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_daily_log_entry_trigger
  BEFORE INSERT OR UPDATE ON public.daily_log_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_daily_log_entry();

-- RPC to generate recurring log entries for a given user and date
CREATE OR REPLACE FUNCTION public.generate_recurring_log_entries(p_user_id uuid, p_date date)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_entry RECORD;
  v_should_generate BOOLEAN;
  v_dow INT;
BEGIN
  -- Find recurring entries from the most recent occurrence for this user
  FOR v_entry IN
    SELECT DISTINCT ON (title, recur_pattern)
      title, priority, needs_help, recur_pattern, linked_task_id, notes, sort_order, user_id
    FROM daily_log_entries
    WHERE user_id = p_user_id
      AND is_recurring = true
      AND recur_pattern IS NOT NULL
      AND log_date < p_date
    ORDER BY title, recur_pattern, log_date DESC
  LOOP
    v_should_generate := false;
    v_dow := EXTRACT(DOW FROM p_date)::INT;

    CASE v_entry.recur_pattern
      WHEN 'Daily' THEN
        v_should_generate := true;
      WHEN 'Weekly' THEN
        -- Generate on same day of week as today (Monday = 1)
        v_should_generate := (v_dow BETWEEN 1 AND 5); -- weekdays
      WHEN 'Monthly' THEN
        -- Generate on 1st of month
        v_should_generate := (EXTRACT(DAY FROM p_date) = 1);
      ELSE
        v_should_generate := false;
    END CASE;

    IF v_should_generate THEN
      -- Insert only if not already exists for this date
      INSERT INTO daily_log_entries (user_id, log_date, title, status, priority, needs_help, is_recurring, recur_pattern, linked_task_id, sort_order)
      SELECT p_user_id, p_date, v_entry.title, 'Planned', v_entry.priority, v_entry.needs_help, true, v_entry.recur_pattern, v_entry.linked_task_id, v_entry.sort_order
      WHERE NOT EXISTS (
        SELECT 1 FROM daily_log_entries
        WHERE user_id = p_user_id AND log_date = p_date AND title = v_entry.title AND is_recurring = true
      );
    END IF;
  END LOOP;
END;
$$;
