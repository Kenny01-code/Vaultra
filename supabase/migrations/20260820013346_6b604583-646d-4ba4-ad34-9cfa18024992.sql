DROP POLICY IF EXISTS "files_select_public" ON public.files;
REVOKE SELECT ON public.files FROM anon;