-- Bug 2: check_recurring_system_health RPC
CREATE OR REPLACE FUNCTION public.check_recurring_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template_count    INT;
  v_overdue_count     INT;
  v_stuck_count       INT;
  v_duplicate_count   INT;
  v_constraint_exists BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO v_template_count
  FROM tasks WHERE is_recurrence_template = true AND next_run_at IS NOT NULL;

  SELECT COUNT(*) INTO v_overdue_count
  FROM tasks WHERE is_recurrence_template = true
    AND next_run_at IS NOT NULL AND next_run_at < NOW() - INTERVAL '2 hours';

  SELECT COUNT(*) INTO v_stuck_count
  FROM tasks WHERE is_recurrence_template = true
    AND next_run_at IS NOT NULL AND next_run_at < NOW() - INTERVAL '25 hours';

  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT template_task_id, occurrence_date, COUNT(*) as cnt
    FROM tasks
    WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL
    GROUP BY template_task_id, occurrence_date HAVING COUNT(*) > 1
  ) dups;

  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'tasks' AND indexname = 'idx_unique_template_occurrence'
  ) INTO v_constraint_exists;

  RETURN jsonb_build_object(
    'template_count',    v_template_count,
    'overdue_count',     v_overdue_count,
    'stuck_count',       v_stuck_count,
    'duplicate_count',   v_duplicate_count,
    'constraint_exists', v_constraint_exists,
    'checked_at',        NOW()
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_recurring_system_health() TO authenticated;

-- Bug 3: force_advance_stuck_templates RPC
CREATE OR REPLACE FUNCTION public.force_advance_stuck_templates(
  p_stuck_threshold_hours INT DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template   RECORD;
  v_rule       JSONB;
  v_rule_type  TEXT;
  v_interval   INT;
  v_next_date  DATE;
  v_current_day INT;
  v_day_name   TEXT;
  v_days_ahead INT;
  v_found      BOOLEAN;
  v_updated    INT := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can force-advance templates';
  END IF;

  FOR v_template IN
    SELECT id, recurrence_rrule
    FROM tasks
    WHERE is_recurrence_template = true
      AND next_run_at IS NOT NULL
      AND next_run_at < NOW() - (p_stuck_threshold_hours * INTERVAL '1 hour')
  LOOP
    BEGIN
      v_rule := v_template.recurrence_rrule::JSONB;
      v_rule_type := v_rule->>'type';
      v_interval := COALESCE((v_rule->>'interval')::INT, 1);

      CASE v_rule_type
        WHEN 'daily' THEN
          v_next_date := CURRENT_DATE + (v_interval * INTERVAL '1 day');
        WHEN 'weekly' THEN
          IF v_rule->'days_of_week' IS NOT NULL AND jsonb_array_length(v_rule->'days_of_week') > 0 THEN
            v_found := false;
            FOR v_days_ahead IN 1..14 LOOP
              v_next_date := CURRENT_DATE + (v_days_ahead * INTERVAL '1 day');
              v_current_day := EXTRACT(DOW FROM v_next_date)::INT;
              v_day_name := CASE v_current_day
                WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
                WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
                WHEN 6 THEN 'sat' END;
              IF v_rule->'days_of_week' @> to_jsonb(v_day_name) THEN
                v_found := true; EXIT;
              END IF;
            END LOOP;
            IF NOT v_found THEN
              v_next_date := CURRENT_DATE + (7 * v_interval * INTERVAL '1 day');
            END IF;
          ELSE
            v_next_date := CURRENT_DATE + (7 * v_interval * INTERVAL '1 day');
          END IF;
        WHEN 'monthly' THEN
          v_next_date := (CURRENT_DATE + (v_interval * INTERVAL '1 month'))::DATE;
        ELSE
          v_next_date := CURRENT_DATE + INTERVAL '1 day';
      END CASE;

      UPDATE tasks SET next_run_at = v_next_date::TIMESTAMPTZ WHERE id = v_template.id;
      v_updated := v_updated + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not advance template %: %', v_template.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object('advanced', v_updated);
END;
$$;
GRANT EXECUTE ON FUNCTION public.force_advance_stuck_templates(INT) TO authenticated;

-- Bug 4: Fixed generate_next_recurring_instance trigger
CREATE OR REPLACE FUNCTION public.generate_next_recurring_instance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template    RECORD;
  v_rule        JSONB;
  v_base_date   DATE;
  v_next_date   DATE;
  v_next_ts     TIMESTAMPTZ;
  v_new_task_id UUID;
  v_occ_count   INT;
  v_rule_type   TEXT;
  v_interval    INT;
  v_dom         INT;
  v_end_cond    TEXT;
  v_end_val     TEXT;
  v_dow         INT;
  v_day_name    TEXT;
  v_found       BOOLEAN;
  v_days_ahead  INT;
  v_any_works   BOOLEAN;
  v_attempts    INT;
BEGIN
  IF NEW.status != 'Completed' OR OLD.status IS NOT DISTINCT FROM 'Completed' THEN
    RETURN NEW;
  END IF;
  IF NEW.template_task_id IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO v_template
  FROM tasks WHERE id = NEW.template_task_id AND is_recurrence_template = true;
  IF NOT FOUND THEN RETURN NEW; END IF;

  BEGIN
    IF v_template.recurrence_rrule IS NULL THEN RETURN NEW; END IF;
    v_rule := v_template.recurrence_rrule::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[recurring] Invalid rrule for template %: %', v_template.id, SQLERRM;
    RETURN NEW;
  END;

  v_rule_type := v_rule->>'type';
  v_interval  := COALESCE((v_rule->>'interval')::INT, 1);
  v_end_cond  := COALESCE(v_rule->>'end_condition', 'never');
  v_end_val   := v_rule->>'end_value';
  v_occ_count := COALESCE(v_template.occurrence_count, 0) + 1;

  IF v_end_cond = 'after_n' AND v_end_val IS NOT NULL THEN
    IF v_occ_count >= v_end_val::INT THEN
      UPDATE tasks SET next_run_at = NULL, occurrence_count = v_occ_count WHERE id = v_template.id;
      RETURN NEW;
    END IF;
  END IF;

  -- FIX: use template's scheduled date as base, not CURRENT_DATE
  v_base_date := COALESCE(v_template.next_run_at::DATE, CURRENT_DATE);

  CASE v_rule_type
    WHEN 'daily' THEN
      v_next_date := v_base_date + (v_interval * INTERVAL '1 day');

    WHEN 'weekly' THEN
      IF v_rule->'days_of_week' IS NOT NULL AND jsonb_array_length(v_rule->'days_of_week') > 0 THEN
        v_found := false;
        FOR v_days_ahead IN 1..14 LOOP
          v_next_date := v_base_date + (v_days_ahead * INTERVAL '1 day');
          v_dow := EXTRACT(DOW FROM v_next_date)::INT;
          v_day_name := CASE v_dow
            WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
            WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
            WHEN 6 THEN 'sat' END;
          IF v_rule->'days_of_week' @> to_jsonb(v_day_name) THEN
            v_found := true; EXIT;
          END IF;
        END LOOP;
        IF NOT v_found THEN
          v_next_date := v_base_date + (7 * v_interval * INTERVAL '1 day');
        END IF;
      ELSE
        v_next_date := v_base_date + (7 * v_interval * INTERVAL '1 day');
      END IF;

    WHEN 'monthly' THEN
      v_next_date := (v_base_date + (v_interval * INTERVAL '1 month'))::DATE;
      v_dom := (v_rule->>'day_of_month')::INT;
      IF v_dom IS NOT NULL THEN
        v_dom := LEAST(v_dom,
          EXTRACT(DAY FROM DATE_TRUNC('month', v_next_date) + INTERVAL '1 month' - INTERVAL '1 day')::INT);
        v_next_date := (DATE_TRUNC('month', v_next_date) + ((v_dom - 1) * INTERVAL '1 day'))::DATE;
      END IF;

    WHEN 'custom' THEN
      IF v_rule->'days_of_week' IS NOT NULL AND jsonb_array_length(v_rule->'days_of_week') > 0 THEN
        v_found := false;
        FOR v_days_ahead IN 1..14 LOOP
          v_next_date := v_base_date + (v_days_ahead * INTERVAL '1 day');
          v_dow := EXTRACT(DOW FROM v_next_date)::INT;
          v_day_name := CASE v_dow
            WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
            WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
            WHEN 6 THEN 'sat' END;
          IF v_rule->'days_of_week' @> to_jsonb(v_day_name) THEN
            v_found := true; EXIT;
          END IF;
        END LOOP;
        IF NOT v_found THEN
          v_next_date := v_base_date + (v_interval * INTERVAL '1 day');
        END IF;
      ELSE
        v_next_date := v_base_date + (v_interval * INTERVAL '1 day');
      END IF;

    ELSE RETURN NEW;
  END CASE;

  IF v_end_cond = 'until_date' AND v_end_val IS NOT NULL THEN
    IF v_next_date > v_end_val::DATE THEN
      UPDATE tasks SET next_run_at = NULL, occurrence_count = v_occ_count WHERE id = v_template.id;
      RETURN NEW;
    END IF;
  END IF;

  -- FIX: respect assignee working_days
  BEGIN
    v_attempts := 0;
    LOOP
      EXIT WHEN v_attempts >= 7;
      v_dow := EXTRACT(DOW FROM v_next_date)::INT;
      v_day_name := CASE v_dow
        WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
        WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' WHEN 5 THEN 'fri'
        WHEN 6 THEN 'sat' END;
      SELECT bool_or(
        p.working_days IS NULL
        OR array_length(p.working_days, 1) IS NULL
        OR v_day_name = ANY(p.working_days)
      ) INTO v_any_works
      FROM task_assignees ta
      JOIN profiles p ON p.user_id = ta.user_id
      WHERE ta.task_id = v_template.id;
      IF v_any_works IS NULL OR v_any_works THEN EXIT; END IF;
      v_next_date := v_next_date + INTERVAL '1 day';
      v_attempts  := v_attempts + 1;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[recurring] Working days check failed for template %: %', v_template.id, SQLERRM;
  END;

  v_next_ts := v_next_date::TIMESTAMPTZ;

  INSERT INTO tasks (
    title, description, priority, status, due_at, entity,
    project_id, labels, created_by, template_task_id, occurrence_date,
    task_type, jira_link, is_collaborative, estimated_hours, teams
  ) VALUES (
    v_template.title, v_template.description, v_template.priority,
    COALESCE(v_template.status, 'Backlog'), v_next_ts, v_template.entity,
    v_template.project_id, v_template.labels, v_template.created_by,
    v_template.id, v_next_date::TEXT, 'recurring', v_template.jira_link,
    COALESCE(v_template.is_collaborative, false), v_template.estimated_hours, v_template.teams
  )
  ON CONFLICT (template_task_id, occurrence_date)
    WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_new_task_id;

  IF v_new_task_id IS NOT NULL THEN
    INSERT INTO task_assignees (task_id, user_id)
    SELECT v_new_task_id, ta.user_id FROM task_assignees ta WHERE ta.task_id = v_template.id;
  END IF;

  -- FIX: optimistic lock
  UPDATE tasks
  SET next_run_at = v_next_ts, occurrence_count = v_occ_count
  WHERE id = v_template.id
    AND (next_run_at IS NOT DISTINCT FROM v_template.next_run_at);

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[recurring] generate_next_recurring_instance failed for task %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_next_recurring_instance ON tasks;
CREATE TRIGGER trg_generate_next_recurring_instance
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW EXECUTE FUNCTION generate_next_recurring_instance();