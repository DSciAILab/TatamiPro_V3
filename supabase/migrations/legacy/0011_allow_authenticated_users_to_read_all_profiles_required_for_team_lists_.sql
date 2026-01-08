-- Add a policy to allow any authenticated user to read basic profile information
-- This runs alongside existing policies (RLS policies are additive/permissive)
CREATE POLICY "Allow authenticated users to view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (true);