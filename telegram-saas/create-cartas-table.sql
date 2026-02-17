-- Tabela para armazenar o histórico de cartas (PDFs) geradas
CREATE TABLE IF NOT EXISTS cartas_geradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES bots(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    nome_arquivo TEXT NOT NULL,
    url_storage TEXT, -- URL para download posterior se salvarmos no storage
    nome_funcionario TEXT, -- Snapshot do nome na época
    data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (opcional se estivermos no modo sem RLS, mas bom por padrão)
ALTER TABLE cartas_geradas ENABLE ROW LEVEL SECURITY;

-- Política simples: todos podem ler/escrever por enquanto (conforme o resto do app)
CREATE POLICY "Public Access" ON cartas_geradas FOR ALL USING (true);
