-- Drop the view as we'll use an RPC function instead
DROP VIEW IF EXISTS public.signalements_secure;

-- Create an RPC function to fetch signalements with admin_notes hidden for non-admins
CREATE OR REPLACE FUNCTION public.get_signalements_secure()
RETURNS TABLE (
  id uuid,
  lampadaire_id uuid,
  user_id uuid,
  description text,
  photo_url text,
  cause text,
  status report_status,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz,
  admin_notes text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    s.id,
    s.lampadaire_id,
    s.user_id,
    s.description,
    s.photo_url,
    s.cause,
    s.status,
    s.processed_by,
    s.processed_at,
    s.created_at,
    -- Only show admin_notes to admins
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN s.admin_notes
      ELSE NULL
    END AS admin_notes
  FROM public.signalements s
  WHERE 
    -- Users can see their own signalements, admins can see all
    s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
  ORDER BY s.created_at DESC
$$;