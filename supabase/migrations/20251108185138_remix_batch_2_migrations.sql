
-- Migration: 20251108163656

-- Migration: 20251105181825
-- Create posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  published BOOLEAN DEFAULT false,
  keywords TEXT,
  meta_description TEXT,
  publish_path TEXT NOT NULL DEFAULT '/clipboard/blog',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
-- Users can view their own posts (published or not)
CREATE POLICY "Users can view their own posts"
ON public.posts
FOR SELECT
USING (auth.uid() = user_id);

-- Anyone can view published posts
CREATE POLICY "Anyone can view published posts"
ON public.posts
FOR SELECT
USING (published = true);

-- Users can create their own posts
CREATE POLICY "Users can create their own posts"
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster slug lookups
CREATE INDEX idx_posts_slug ON public.posts(slug);
CREATE INDEX idx_posts_published ON public.posts(published);
CREATE INDEX idx_posts_user_id ON public.posts(user_id);

-- Migration: 20251108162248
-- Create clips table for storing text and file references
CREATE TABLE public.clips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('text', 'file')),
  content TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clips ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read clips (access code based security)
CREATE POLICY "Anyone can read clips"
ON public.clips
FOR SELECT
USING (true);

-- Allow anyone to insert clips
CREATE POLICY "Anyone can insert clips"
ON public.clips
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update clips (for last_accessed)
CREATE POLICY "Anyone can update clips"
ON public.clips
FOR UPDATE
USING (true);

-- Allow anyone to delete clips (for manual deletion)
CREATE POLICY "Anyone can delete clips"
ON public.clips
FOR DELETE
USING (true);

-- Create index on access_code for faster lookups
CREATE INDEX idx_clips_access_code ON public.clips(access_code);

-- Create index on last_accessed for cleanup job
CREATE INDEX idx_clips_last_accessed ON public.clips(last_accessed);

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clipboard-files',
  'clipboard-files',
  true,
  52428800, -- 50MB limit
  NULL -- Allow all file types
);

-- Storage policies for clipboard files
CREATE POLICY "Anyone can upload clipboard files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'clipboard-files');

CREATE POLICY "Anyone can view clipboard files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'clipboard-files');

CREATE POLICY "Anyone can delete clipboard files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'clipboard-files');

-- Function to cleanup expired clips (older than 1 hour since last access)
CREATE OR REPLACE FUNCTION public.cleanup_expired_clips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete clips that haven't been accessed in the last hour
  DELETE FROM public.clips
  WHERE last_accessed < (now() - INTERVAL '1 hour');
END;
$$;

-- Migration: 20251108162314
-- Fix security warning: Set search_path for cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_clips()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete clips that haven't been accessed in the last hour
  DELETE FROM public.clips
  WHERE last_accessed < (now() - INTERVAL '1 hour');
END;
$$;


-- Migration: 20251108164754
-- Force types regeneration by adding a comment to the posts table
COMMENT ON TABLE posts IS 'Blog posts table for clipboard blog feature';

-- Verify the table exists and is accessible
SELECT COUNT(*) FROM posts;
