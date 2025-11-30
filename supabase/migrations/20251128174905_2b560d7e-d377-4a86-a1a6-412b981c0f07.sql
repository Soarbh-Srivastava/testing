-- Add scheduled_publish_date column to posts table
ALTER TABLE public.posts 
ADD COLUMN scheduled_publish_date timestamp with time zone;

-- Create index for efficient querying of scheduled posts
CREATE INDEX idx_posts_scheduled_publish ON public.posts(scheduled_publish_date) 
WHERE scheduled_publish_date IS NOT NULL AND published = false;