CREATE POLICY "Admins can delete any athlete"
ON public.athletes
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin'));