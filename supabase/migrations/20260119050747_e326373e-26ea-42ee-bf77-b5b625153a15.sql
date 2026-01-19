-- Create table for Google Sheets campaign sync configuration
CREATE TABLE public.google_sheets_campaign_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sheet_id TEXT NOT NULL,
  sheet_url TEXT NOT NULL,
  sheet_name TEXT NOT NULL,
  tab_name TEXT DEFAULT 'Sheet1',
  column_mapping JSONB DEFAULT '{"name": "Campaign Name", "landing_page": "URL", "campaign_type": "Type", "description": "Notes"}'::jsonb,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'success', 'error')),
  sync_error TEXT,
  auto_sync_on_open BOOLEAN DEFAULT false,
  sync_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, sheet_id)
);

-- Enable Row Level Security
ALTER TABLE public.google_sheets_campaign_sync ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sync configs"
  ON public.google_sheets_campaign_sync
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sync configs"
  ON public.google_sheets_campaign_sync
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sync configs"
  ON public.google_sheets_campaign_sync
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sync configs"
  ON public.google_sheets_campaign_sync
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_google_sheets_campaign_sync_updated_at
  BEFORE UPDATE ON public.google_sheets_campaign_sync
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();