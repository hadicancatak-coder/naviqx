
-- 1. Drop the synchronous trigger
DROP TRIGGER IF EXISTS refresh_comment_counts_trigger ON public.comments;

-- 2. Drop the old trigger function
DROP FUNCTION IF EXISTS public.refresh_task_comment_counts();

-- 3. Drop the materialized view
DROP MATERIALIZED VIEW IF EXISTS public.task_comment_counts;

-- 4. Create a regular table with the same name and shape
CREATE TABLE public.task_comment_counts (
  task_id uuid PRIMARY KEY REFERENCES public.tasks(id) ON DELETE CASCADE,
  comment_count bigint NOT NULL DEFAULT 0
);

-- 5. Enable RLS
ALTER TABLE public.task_comment_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comment counts"
  ON public.task_comment_counts FOR SELECT TO authenticated USING (true);

-- 6. Backfill from existing comments
INSERT INTO public.task_comment_counts (task_id, comment_count)
SELECT task_id, COUNT(*) FROM public.comments GROUP BY task_id
ON CONFLICT (task_id) DO UPDATE SET comment_count = EXCLUDED.comment_count;

-- 7. Create O(1) trigger function
CREATE OR REPLACE FUNCTION public.update_task_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_comment_counts (task_id, comment_count)
    VALUES (NEW.task_id, 1)
    ON CONFLICT (task_id) DO UPDATE SET comment_count = task_comment_counts.comment_count + 1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE task_comment_counts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE task_id = OLD.task_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.task_id IS DISTINCT FROM OLD.task_id THEN
    -- Comment moved between tasks (rare but handle it)
    UPDATE task_comment_counts
    SET comment_count = GREATEST(comment_count - 1, 0)
    WHERE task_id = OLD.task_id;
    INSERT INTO task_comment_counts (task_id, comment_count)
    VALUES (NEW.task_id, 1)
    ON CONFLICT (task_id) DO UPDATE SET comment_count = task_comment_counts.comment_count + 1;
    RETURN NEW;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 8. Attach the new trigger (per-row, not per-statement)
CREATE TRIGGER update_comment_count_trigger
  AFTER INSERT OR DELETE OR UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_count();
