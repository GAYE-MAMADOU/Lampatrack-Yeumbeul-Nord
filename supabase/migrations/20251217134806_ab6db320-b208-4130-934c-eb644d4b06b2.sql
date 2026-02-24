-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for lampadaire status
CREATE TYPE public.lampadaire_status AS ENUM ('functional', 'damaged');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('pending', 'approved', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create lampadaires table
CREATE TABLE public.lampadaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status lampadaire_status NOT NULL DEFAULT 'functional',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create signalements (reports) table
CREATE TABLE public.signalements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lampadaire_id UUID REFERENCES public.lampadaires(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cause TEXT NOT NULL,
  description TEXT,
  photo_url TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create history table for tracking changes
CREATE TABLE public.lampadaire_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lampadaire_id UUID REFERENCES public.lampadaires(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  previous_status lampadaire_status,
  new_status lampadaire_status,
  technician_name TEXT,
  intervention_type TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lampadaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signalements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lampadaire_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Lampadaires policies (everyone can view)
CREATE POLICY "Anyone authenticated can view lampadaires"
  ON public.lampadaires FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage lampadaires"
  ON public.lampadaires FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Signalements policies
CREATE POLICY "Users can view their own reports"
  ON public.signalements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports"
  ON public.signalements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports"
  ON public.signalements FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reports"
  ON public.signalements FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- History policies
CREATE POLICY "Anyone authenticated can view history"
  ON public.lampadaire_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can create history"
  ON public.lampadaire_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_lampadaires_updated_at
  BEFORE UPDATE ON public.lampadaires
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert test lampadaires data
INSERT INTO public.lampadaires (identifier, latitude, longitude, status) VALUES
  ('LP-001', 48.8566, 2.3522, 'functional'),
  ('LP-002', 48.8584, 2.2945, 'functional'),
  ('LP-003', 48.8738, 2.2950, 'damaged'),
  ('LP-004', 48.8606, 2.3376, 'functional'),
  ('LP-005', 48.8530, 2.3499, 'functional'),
  ('LP-006', 48.8462, 2.3466, 'damaged'),
  ('LP-007', 48.8619, 2.3325, 'functional'),
  ('LP-008', 48.8649, 2.3800, 'functional'),
  ('LP-009', 48.8529, 2.3697, 'functional'),
  ('LP-010', 48.8651, 2.3208, 'functional');

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'report-photos');

CREATE POLICY "Anyone can view photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'report-photos');