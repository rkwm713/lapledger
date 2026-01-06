-- Add payment tracking columns to league_members
ALTER TABLE public.league_members 
ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue')),
ADD COLUMN payment_date TIMESTAMPTZ,
ADD COLUMN payment_notes TEXT;

-- Create RLS policy for owners to update payment status
CREATE POLICY "Owners can update member payment status" 
ON public.league_members 
FOR UPDATE 
USING (is_league_owner(auth.uid(), league_id))
WITH CHECK (is_league_owner(auth.uid(), league_id));