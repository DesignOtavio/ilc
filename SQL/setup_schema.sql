-- ==========================================
-- SCRIPT DE SCHEMA E SEMENTES DO SISTEMA ILC
-- ==========================================

-- Remover tabelas existentes se necessário (descomente se quiser limpar tudo)
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS user_certificates CASCADE;
-- DROP TABLE IF EXISTS merit_certificates CASCADE;
-- DROP TABLE IF EXISTS score_events CASCADE;
-- DROP TABLE IF EXISTS score_event_types CASCADE;
-- DROP TABLE IF EXISTS score_accounts CASCADE;
-- DROP TABLE IF EXISTS user_roles CASCADE;
-- DROP TABLE IF EXISTS role_permissions CASCADE;
-- DROP TABLE IF EXISTS permissions CASCADE;
-- DROP TABLE IF EXISTS roles CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS user_status CASCADE;
-- DROP TYPE IF EXISTS role_name CASCADE;
-- DROP TYPE IF EXISTS event_category CASCADE;
-- DROP TYPE IF EXISTS event_status CASCADE;

-- Criar Enums
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'blocked');
CREATE TYPE role_name AS ENUM ('admin', 'usuario');
CREATE TYPE event_category AS ENUM ('reward', 'penalty');
CREATE TYPE event_status AS ENUM ('pending', 'approved', 'rejected');

-- Habilitar extensão UUID-OSSP para geração de UUIDs no Postgres
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE, -- nickname (único, editável)
    email VARCHAR(255) UNIQUE,
    celular VARCHAR(50) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    hierarchy_title VARCHAR(150) DEFAULT 'Usuário', -- Título personalizado de hierarquia (ex: Comissário, Operador, Auditor, Cidadão Classe A)
    avatar_url TEXT, -- Foto de perfil (Google OAuth ou upload customizado)
    status user_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Níveis de Acesso (Roles)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name role_name NOT NULL UNIQUE,
    description TEXT
);

-- 3. Tabela de Permissões
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- 4. Tabela de Associação Usuário-Papel (RBAC)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

-- 5. Tabela de Associação Papel-Permissão
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

-- 6. Tabela de Contas de Pontuação (Score Accounts)
CREATE TABLE score_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    started_score INT NOT NULL DEFAULT 5000,
    current_score INT NOT NULL DEFAULT 5000 CHECK (current_score >= 0 AND current_score <= 10000),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela de Faixas de Pontuação (Tiers)
CREATE TABLE score_tiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    min_score INT NOT NULL,
    max_score INT NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color
    description TEXT,
    privileges TEXT
);

-- 8. Tabela de Tipos de Eventos de Score
CREATE TABLE score_event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL UNIQUE,
    category event_category NOT NULL,
    points_delta INT NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true
);

-- 9. Tabela de Eventos de Pontuação Registrados
CREATE TABLE score_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type_id UUID NOT NULL REFERENCES score_event_types(id),
    points_delta INT NOT NULL,
    description TEXT NOT NULL,
    evidence_url TEXT,
    status event_status NOT NULL DEFAULT 'pending',
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabela de Certificados de Mérito Cadastrados
CREATE TABLE merit_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    points_required INT NOT NULL,
    description TEXT
);

-- 11. Tabela de Associação Usuário-Certificado (Conquistas Permanentes)
CREATE TABLE user_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    certificate_id UUID NOT NULL REFERENCES merit_certificates(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_cert UNIQUE (user_id, certificate_id)
);

-- 12. Tabela de Logs de Auditoria
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================
-- INSERÇÃO DE DADOS INICIAIS (SEEDS)
-- ==========================================

-- 1. Inserir Papéis
INSERT INTO roles (name, description) VALUES
('admin', 'Administrador do Sistema com plenos poderes estatais'),
('operator', 'Operador responsável por lançar e aprovar eventos cívicos'),
('auditor', 'Auditor de conformidade cívica, visualiza logs de auditoria'),
('citizen', 'Cidadão comum inscrito sob o Índice de Lealdade Cívica');

-- 2. Inserir Permissões Básicas
INSERT INTO permissions (code, description) VALUES
('manage_citizens', 'Permissão para cadastrar, editar e bloquear cidadãos'),
('register_events', 'Permissão para lançar bônus e penalidades cívicas'),
('approve_events', 'Permissão para aprovar eventos pendentes de pontuação'),
('view_audit_logs', 'Permissão para visualizar trilha de auditoria do sistema'),
('view_own_dashboard', 'Permissão para ver seu próprio painel de lealdade cívica');

-- 3. Associar Permissões aos Papéis
-- Admin tem todas as permissões
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- Operator pode registrar e aprovar eventos, e ver cidadãos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'operator' AND p.code IN ('manage_citizens', 'register_events', 'approve_events', 'view_own_dashboard');

-- Auditor pode ver cidadãos e visualizar logs
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'auditor' AND p.code IN ('view_audit_logs', 'view_own_dashboard');

-- Citizen pode apenas ver seu painel
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'citizen' AND p.code = 'view_own_dashboard';

-- 4. Inserir Faixas de Classificação (Tiers)
INSERT INTO score_tiers (name, min_score, max_score, color, description, privileges) VALUES
('Vigilância Máxima', 0, 1999, '#8A3D2F', 'Cidadão com lealdade cívica crítica. Sob suspeita constante do Estado.', 'Proibição de trânsito intermunicipal, restrição de acesso à internet pública e banimento de cargos civis.'),
('Restrito', 2000, 3999, '#4E6E8E', 'Cidadão sob regime de advertência cívica e limitações sociais.', 'Acesso limitado a serviços bancários públicos, fila de prioridade suspensa no sistema de saúde e restrições de viagens.'),
('Cidadão Comum', 4000, 5999, '#B9B19A', 'Cidadão regular com deveres e direitos civis fundamentais.', 'Direitos de tráfego normais, acesso a linhas de crédito convencionais e serviços públicos regulares.'),
('Cidadão Exemplar', 6000, 7999, '#556B2F', 'Cidadão em dia com a Pátria e prestativo com a comunidade.', 'Fura-fila burocrático de 15% em órgãos públicos, prioridade em exames cívicos e acesso à biblioteca oficial.'),
('Herói Cívico', 8000, 9499, '#73B33A', 'Exemplo notável de lealdade, serviço e conduta estatal.', 'Isenção de 5% em impostos de serviços locais, transporte público gratuito e assentos reservados em solenidades.'),
('Alto Comando Honorário', 9500, 10000, '#B08A47', 'A mais alta estirpe de lealdade cívica. Elite patriota honorária.', 'Acesso direto ao conselho administrativo regional, passaporte cívico diplomático e medalha de ouro de honra.');

-- 5. Inserir Tipos de Evento Oficiais
INSERT INTO score_event_types (code, name, category, points_delta, requires_approval) VALUES
-- Pontos Ganhos (Méritos)
('eleicao', 'Participação ativa em eleições nacionais', 'reward', 100, false),
('servico_militar', 'Serviço militar obrigatório concluído', 'reward', 500, false),
('trabalho_voluntario', 'Trabalho voluntário credenciado', 'reward', 200, false),
('doacao_sangue', 'Doação voluntária de sangue', 'reward', 100, false),
('exame_civico', 'Aprovação com excelência em exame de educação cívica', 'reward', 250, false),
('campanha_nacional', 'Participação ativa em campanhas estatais', 'reward', 150, false),
('denuncia_crime', 'Denúncia comprovada de atividade ilícita ou corrupção', 'reward', 300, true),
('medalha_oficial', 'Concessão de medalha de honra cívica oficial', 'reward', 1000, true),
-- Pontos Perdidos (Penalidades)
('multa_transito', 'Multa de trânsito de natureza gravíssima', 'penalty', -150, false),
('falta_servico_obrigatorio', 'Falta injustificada a dever civil obrigatório', 'penalty', -300, false),
('condenacao_criminal', 'Sentença judicial condenatória criminal transitada', 'penalty', -1000, true),
('corrupcao_cargo', 'Prática de corrupção ou suborno em cargo público', 'penalty', -2000, true),
('seguranca_nacional', 'Ato hostil ou crime contra a segurança da Pátria', 'penalty', -5000, true);

-- 6. Inserir Certificados de Mérito Oficiais
INSERT INTO merit_certificates (name, points_required, description) VALUES
('Mérito Cívico', 100, 'Concedido ao cidadão que atinge seus primeiros 100 pontos acumulados em atos de cooperação social.'),
('Serviço Distinto', 500, 'Reconhecimento oficial por 500 pontos acumulados em atividades de apoio e valor militar/cívico.'),
('Excelência Nacional', 1000, 'Diploma solene outorgado por expressiva contribuição cívica nacional, somando 1.000 pontos.'),
('Honra Suprema', 5000, 'Ordem máxima da lealdade nacional. Reservado para cidadãos que dedicaram 5.000 pontos em mérito cívico.');
