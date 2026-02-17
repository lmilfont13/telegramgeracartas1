-- Adicionar colunas para armazenar URLs de logo e carimbos
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS carimbo_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS carimbo_funcionario_url TEXT;

-- INSTRUÇÕES PARA CONFIGURAR SUPABASE STORAGE:
-- 
-- 1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
-- 2. Vá em "Storage" no menu lateral
-- 3. Clique em "Create a new bucket"
-- 4. Crie o bucket "logos":
--    - Name: logos
--    - Public bucket: ✅ SIM (marcar como público)
-- 5. Crie o bucket "carimbos":
--    - Name: carimbos
--    - Public bucket: ✅ SIM (marcar como público)
--
-- Depois execute este SQL no SQL Editor do Supabase para adicionar as colunas.
