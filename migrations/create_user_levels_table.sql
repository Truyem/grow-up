-- Create user_levels table for XP and Level tracking
CREATE TABLE IF NOT EXISTS public.user_levels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_level INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  current_level_xp INTEGER DEFAULT 0,
  next_level_xp INTEGER DEFAULT 1100,
  lifetime_xp INTEGER DEFAULT 0,
  last_level_up_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_user_levels_user_id ON public.user_levels(user_id);
CREATE INDEX idx_user_levels_current_level ON public.user_levels(current_level);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view their own level data"
  ON public.user_levels
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own level data"
  ON public.user_levels
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level data"
  ON public.user_levels
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_levels TO authenticated;
