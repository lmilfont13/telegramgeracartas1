-- TABELA: CARTAS_GERADAS (Historico de todas as cartas geradas pelo bot)
-- Se ja existir, garantimos que os campos estao corretos
CREATE TABLE IF NOT EXISTS cartas_geradas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
    nome_arquivo TEXT NOT NULL,
    nome_funcionario TEXT,
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE cartas_geradas ENABLE ROW LEVEL SECURITY;

-- Política de Visualização: Usuário só vê logs da sua empresa
DROP POLICY IF EXISTS "Usuários veem apenas logs da sua empresa" ON cartas_geradas;
CREATE POLICY "Usuários veem apenas logs da sua empresa" ON cartas_geradas
    FOR SELECT USING (
        empresa_id IN (SELECT id FROM empresas WHERE auth_user_id = auth.uid())
    );

-- Política de Inserção: Permitir inserção (necessário para o bot worker postar os resultados)
DROP POLICY IF EXISTS "Permitir inserção de logs" ON cartas_geradas;
CREATE POLICY "Permitir inserção de logs" ON cartas_geradas
    FOR INSERT WITH CHECK (true);

-- Permissões Adicionais para a tabela de Templates
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios templates" ON templates;
CREATE POLICY "Usuários gerenciam seus próprios templates" ON templates
    FOR ALL USING (
        empresa_id IN (SELECT id FROM empresas WHERE auth_user_id = auth.uid())
    );
