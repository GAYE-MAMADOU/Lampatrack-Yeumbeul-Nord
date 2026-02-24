-- Create a secure view that hides admin_notes from non-admin users
CREATE OR REPLACE VIEW public.signalements_secure AS
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