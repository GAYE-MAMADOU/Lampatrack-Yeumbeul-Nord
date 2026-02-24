-- Add foreign key relationship between signalements.user_id and profiles.user_id
ALTER TABLE public.signalements
ADD CONSTRAINT signalements_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;