-- Habilitar a extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABELA: EMPRESAS (Representa o cliente que paga pelo SaaS)
CREATE TABLE empresas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    email_responsavel VARCHAR(255) UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT TRUE,
    auth_user_id UUID REFERENCES auth.users(id) -- Liga com o usuário logado do Supabase
);

-- TABELA: BOTS (Cada empresa pode ter 1 ou mais bots)
CREATE TABLE bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    token_telegram VARCHAR(255) UNIQUE NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ativo BOOLEAN DEFAULT TRUE
);

-- TABELA: CARIMBOS (Imagens/Assinaturas usadas nas cartas)
CREATE TABLE carimbos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL, -- Ex: "Assinatura Gerente", "Carimbo Loja"
    arquivo_url TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: TEMPLATES (Modelos de cartas)
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL, -- Ex: "Carta Promoção", "Apresentação Padrão"
    conteudo TEXT NOT NULL, -- Texto com placeholders {{NOME}}, {{DATA}}, etc.
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- TABELA: FUNCIONARIOS (Dados importados de XLS/CSV)
CREATE TABLE funcionarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    loja VARCHAR(100),
    data_admissao DATE,
    cargo VARCHAR(100),
    dados_extras JSONB DEFAULT '{}'::JSONB, -- Para colunas extras flexíveis do Excel
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Política para FUNCIONARIOS
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem apenas seus funcionarios" ON funcionarios
    FOR ALL USING (
        empresa_id IN (SELECT id FROM empresas WHERE auth_user_id = auth.uid())
    );

-- POLÍTICAS DE SEGURANÇA (RLS - Row Level Security)
-- Garante que um usuário só veja dados da SUA empresa.

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE carimbos ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Política para EMPRESAS: Usuário só vê a empresa ligada ao seu ID de Auth
CREATE POLICY "Usuários veem apenas sua própria empresa" ON empresas
    FOR ALL USING (auth.uid() = auth_user_id);

-- Política para BOTS: Usuário só vê bots da sua empresa
CREATE POLICY "Usuários veem apenas seus bots" ON bots
    FOR ALL USING (
        empresa_id IN (SELECT id FROM empresas WHERE auth_user_id = auth.uid())
    );

-- Política para CARIMBOS
CREATE POLICY "Usuários veem apenas seus carimbos" ON carimbos
    FOR ALL USING (
        empresa_id IN (SELECT id FROM empresas WHERE auth_user_id = auth.uid())
    );

-- Política para TEMPLATES
CREATE POLICY "Usuários veem apenas seus templates" ON templates
    FOR ALL USING (
        empresa_id IN (SELECT id FROM empresas WHERE auth_user_id = auth.uid())
    );
