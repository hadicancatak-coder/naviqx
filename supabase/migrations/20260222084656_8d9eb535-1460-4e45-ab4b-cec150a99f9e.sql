
-- 1. Delete duplicate recurring task instances (keep oldest per template+date pair)
DELETE FROM tasks
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY template_task_id, occurrence_date 
      ORDER BY created_at ASC
    ) as rn
    FROM tasks
    WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- 2. Add unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_template_occurrence 
ON tasks (template_task_id, occurrence_date) 
WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL;

-- 3. Update the DB trigger to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.generate_next_recurring_instance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template RECORD;
  v_rule JSONB;
  v_next_date DATE;
  v_next_timestamp TIMESTAMPTZ;
  v_existing_id UUID;
  v_new_task_id UUID;
  v_occurrence_count INT;
  v_rule_type TEXT;
  v_interval INT;
  v_day_of_month INT;
  v_end_condition TEXT;
  v_end_value TEXT;
  v_current_day INT;
  v_found BOOLEAN;
  v_days_ahead INT;
  v_day_name TEXT;
BEGIN
  IF NEW.status != 'Completed' OR OLD.status IS NOT DISTINCT FROM 'Completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.template_task_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_template
  FROM tasks
  WHERE id = NEW.template_task_id
    AND is_recurrence_template = true;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  BEGIN
    IF v_template.recurrence_rrule IS NULL THEN
      RETURN NEW;
    END IF;
    v_rule := v_template.recurrence_rrule::JSONB;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Invalid recurrence rule for template %: %', v_template.id, SQLERRM;
    RETURN NEW;
  END;

  v_rule_type := v_rule->>'type';
  v_interval := COALESCE((v_rule->>'interval')::INT, 1);
  v_end_condition := COALESCE(v_rule->>'end_condition', 'never');
  v_end_value := v_rule->>'end_value';
  v_occurrence_count := COALESCE(v_template.occurrence_count, 0) + 1;

  IF v_end_condition = 'after_n' AND v_end_value IS NOT NULL THEN
    IF v_occurrence_count >= v_end_value::INT THEN
      UPDATE tasks SET next_run_at = NULL, occurrence_count = v_occurrence_count
      WHERE id = v_template.id;
      RETURN NEW;
    END IF;
  END IF;

  v_next_date := CURRENT_DATE;

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
            v_found := true;
            EXIT;
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
      v_day_of_month := (v_rule->>'day_of_month')::INT;
      IF v_day_of_month IS NOT NULL THEN
        v_day_of_month := LEAST(v_day_of_month,
          EXTRACT(DAY FROM (DATE_TRUNC('month', v_next_date) + INTERVAL '1 month' - INTERVAL '1 day'))::INT);
        v_next_date := (DATE_TRUNC('month', v_next_date) + ((v_day_of_month - 1) * INTERVAL '1 day'))::DATE;
      END IF;

    WHEN 'custom' THEN
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
            v_found := true;
            EXIT;
          END IF;
        END LOOP;
        IF NOT v_found THEN
          v_next_date := CURRENT_DATE + (v_interval * INTERVAL '1 day');
        END IF;
      ELSE
        v_next_date := CURRENT_DATE + (v_interval * INTERVAL '1 day');
      END IF;

    ELSE
      RETURN NEW;
  END CASE;

  IF v_end_condition = 'until_date' AND v_end_value IS NOT NULL THEN
    IF v_next_date > v_end_value::DATE THEN
      UPDATE tasks SET next_run_at = NULL, occurrence_count = v_occurrence_count
      WHERE id = v_template.id;
      RETURN NEW;
    END IF;
  END IF;

  v_next_timestamp := v_next_date::TIMESTAMPTZ;

  -- Use INSERT with ON CONFLICT to handle race conditions with edge function
  INSERT INTO tasks (
    title, description, priority, status, due_at, entity,
    project_id, labels, created_by, template_task_id, occurrence_date,
    task_type, jira_link, is_collaborative, estimated_hours, teams
  ) VALUES (
    v_template.title, v_template.description, v_template.priority,
    COALESCE(v_template.status, 'Backlog'), v_next_timestamp, v_template.entity,
    v_template.project_id, v_template.labels, v_template.created_by,
    v_template.id, v_next_date::TEXT, 'recurring', v_template.jira_link,
    COALESCE(v_template.is_collaborative, false), v_template.estimated_hours, v_template.teams
  )
  ON CONFLICT (template_task_id, occurrence_date) WHERE template_task_id IS NOT NULL AND occurrence_date IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_new_task_id;

  -- Only copy assignees if insert succeeded (not a conflict)
  IF v_new_task_id IS NOT NULL THEN
    INSERT INTO task_assignees (task_id, user_id)
    SELECT v_new_task_id, ta.user_id
    FROM task_assignees ta
    WHERE ta.task_id = v_template.id;
  END IF;

  UPDATE tasks
  SET next_run_at = v_next_timestamp, occurrence_count = v_occurrence_count
  WHERE id = v_template.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'generate_next_recurring_instance failed for task %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;
