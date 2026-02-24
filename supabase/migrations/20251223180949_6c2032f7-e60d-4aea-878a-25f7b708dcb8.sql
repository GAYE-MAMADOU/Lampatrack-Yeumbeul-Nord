-- Add policy to allow admins to delete history entries
CREATE POLICY "Admins can delete history"
ON public.lampadaire_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));