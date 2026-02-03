-- Create description_mentions table
CREATE TABLE public.description_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.description_mentions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view mentions"
  ON public.description_mentions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create mentions"
  ON public.description_mentions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own mentions"
  ON public.description_mentions FOR DELETE
  USING (auth.uid() = mentioned_by);

-- Create notification trigger function
CREATE OR REPLACE FUNCTION public.notify_description_mention()
RETURNS TRIGGER AS $$
DECLARE
  task_record RECORD;
  mentioner_name TEXT;
BEGIN
  -- Get task details
  SELECT id, title INTO task_record FROM tasks WHERE id = NEW.task_id;
  
  -- Get mentioner's name
  SELECT name INTO mentioner_name FROM profiles WHERE user_id = NEW.mentioned_by;
  
  -- Don't notify if user mentions themselves
  IF NEW.mentioned_user_id = NEW.mentioned_by THEN
    RETURN NEW;
  END IF;
  
  -- Check if notification is enabled
  IF is_notification_enabled(NEW.mentioned_user_id, 'mention') THEN
    INSERT INTO notifications (user_id, type, payload_json)
    VALUES (
      NEW.mentioned_user_id,
      'description_mention',
      jsonb_build_object(
        'task_id', task_record.id,
        'task_title', task_record.title,
        'mentioned_by', NEW.mentioned_by,
        'mentioner_name', mentioner_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER trigger_notify_description_mention
  AFTER INSERT ON public.description_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_description_mention();

-- Add index for performance
CREATE INDEX idx_description_mentions_task_id ON public.description_mentions(task_id);
CREATE INDEX idx_description_mentions_mentioned_user ON public.description_mentions(mentioned_user_id);