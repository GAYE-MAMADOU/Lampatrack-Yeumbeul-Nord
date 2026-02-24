-- Add is_banned column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT false;

-- Add banned_at and banned_reason columns for tracking
ALTER TABLE public.profiles 
ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN banned_reason TEXT;