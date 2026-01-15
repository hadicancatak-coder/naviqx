-- Create table for user LP link ordering preferences
CREATE TABLE public.user_lp_order_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.system_entities(id) ON DELETE CASCADE,
  lp_order TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_id)
);

-- Enable RLS
ALTER TABLE public.user_lp_order_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only view their own preferences
CREATE POLICY "Users can view own LP order preferences"
ON public.user_lp_order_preferences
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own LP order preferences"
ON public.user_lp_order_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own LP order preferences"
ON public.user_lp_order_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete own LP order preferences"
ON public.user_lp_order_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_lp_order_preferences_updated_at
BEFORE UPDATE ON public.user_lp_order_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();