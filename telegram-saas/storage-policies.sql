-- Políticas de Storage para permitir upload público nos buckets

-- Bucket: logos
-- Permitir INSERT (upload) para qualquer usuário autenticado ou anônimo
CREATE POLICY "Permitir upload de logos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'logos');

-- Permitir SELECT (leitura) público
CREATE POLICY "Permitir leitura pública de logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Permitir UPDATE (substituição) para qualquer usuário
CREATE POLICY "Permitir atualização de logos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'logos');

-- Bucket: carimbos
-- Permitir INSERT (upload)
CREATE POLICY "Permitir upload de carimbos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'carimbos');

-- Permitir SELECT (leitura) público
CREATE POLICY "Permitir leitura pública de carimbos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'carimbos');

-- Permitir UPDATE (substituição)
CREATE POLICY "Permitir atualização de carimbos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'carimbos');
