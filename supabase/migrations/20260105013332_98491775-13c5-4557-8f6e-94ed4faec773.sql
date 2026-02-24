-- Drop and recreate the view with SECURITY INVOKER (uses querying user's permissions)
DROP VIEW IF EXISTS public.signalements_secure;

CREATE VIEW public.signalements_secure 
WITH (security_invoker = true) AS
SELECT 
  id,
  lampadaire_id,
  user_id,
  description,
  photo_url,
  cause,
  status,
  processed_by,
  processed_at,
  created_at,
  -- Only show admin_notes to admins
  CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN admin_notes
    ELSE NULL
  END AS admin_notes
FROM public.signalements;

-- Grant access to the view
GRANT SELECT ON public.signalements_secure TO authenticated;