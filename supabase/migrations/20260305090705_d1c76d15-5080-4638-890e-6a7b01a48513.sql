-- blockers.resolved: set NOT NULL with DEFAULT false
ALTER TABLE public.blockers ALTER COLUMN resolved SET DEFAULT false;
ALTER TABLE public.blockers ALTER COLUMN resolved SET NOT NULL;

-- blockers.title: set NOT NULL with DEFAULT ''
ALTER TABLE public.blockers ALTER COLUMN title SET DEFAULT '';
ALTER TABLE public.blockers ALTER COLUMN title SET NOT NULL;

-- comment_mentions.comment_id: set NOT NULL
ALTER TABLE public.comment_mentions ALTER COLUMN comment_id SET NOT NULL;

-- comment_mentions.mentioned_user_id: set NOT NULL
ALTER TABLE public.comment_mentions ALTER COLUMN mentioned_user_id SET NOT NULL;

-- description_mentions.task_id: set NOT NULL
ALTER TABLE public.description_mentions ALTER COLUMN task_id SET NOT NULL;