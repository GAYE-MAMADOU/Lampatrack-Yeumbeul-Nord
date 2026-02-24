-- Create RPC function to get lampadaire history with technician info hidden from non-admins
CREATE OR REPLACE FUNCTION public.get_lampadaire_history_secure()
RETURNS TABLE (
  id uuid,
  lampadaire_id uuid,
  previous_status public.lampadaire_status,
  new_status public.lampadaire_status,
  performed_by uuid,
  action text,
  created_at timestamptz,
  technician_name text,
  intervention_type text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    h.id,
    h.lampadaire_id,
    h.previous_status,
    h.new_status,
    h.performed_by,
    h.action,
    h.created_at,
    -- Only show technician_name to admins
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN h.technician_name
      ELSE NULL
    END AS technician_name,
    -- Only show intervention_type to admins
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN h.intervention_type
      ELSE NULL
    END AS intervention_type
  FROM public.lampadaire_history h
  ORDER BY h.created_at DESC
$$;