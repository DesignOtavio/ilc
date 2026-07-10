Enum user_status {
  active
  inactive
  blocked
}

Enum role_name {
  admin
  operator
  auditor
  citizen
}

Enum event_category {
  reward
  penalty
}

Enum event_status {
  pending
  approved
  rejected
  applied
  canceled
}

Table users {
  id uuid [pk, note: 'ID único do usuário']
  username varchar [not null, unique, note: 'Nome de login']
  email varchar [not null, unique, note: 'Email do usuário']
  celular varchar [note: 'Telefone/celular']
  password_hash varchar [not null, note: 'Senha criptografada']
  status user_status [not null, default: 'active', note: 'Status da conta']
  created_at timestamp [note: 'Data de criação']
  updated_at timestamp [note: 'Data de atualização']
}

Table roles {
  id uuid [pk, note: 'ID do papel']
  name role_name [not null, unique, note: 'Tipo de papel do usuário']
  description text [note: 'Descrição do papel']
}

Table permissions {
  id uuid [pk, note: 'ID da permissão']
  code varchar [not null, unique, note: 'Código único da permissão']
  description text [note: 'Descrição da permissão']
}

Table user_roles {
  id uuid [pk]
  user_id uuid [not null, note: 'Usuário vinculado']
  role_id uuid [not null, note: 'Papel vinculado']
  assigned_at timestamp [note: 'Quando o papel foi atribuído']
}

Table role_permissions {
  id uuid [pk]
  role_id uuid [not null, note: 'Papel']
  permission_id uuid [not null, note: 'Permissão']
}

Table score_accounts {
  id uuid [pk]
  user_id uuid [not null, unique, note: 'Usuário dono da conta de pontos']
  started_score int [not null, default: 5000, note: 'Pontuação inicial']
  current_score int [not null, default: 5000, note: 'Pontuação atual']
  updated_at timestamp [note: 'Última atualização do score']
}

Table score_tiers {
  id uuid [pk]
  name varchar [not null, unique, note: 'Nome da faixa']
  min_score int [not null, note: 'Pontuação mínima']
  max_score int [not null, note: 'Pontuação máxima']
  color varchar [note: 'Cor representativa']
  description text [note: 'Descrição da faixa']
  privileges text [note: 'Privilégios ou restrições']
}

Table score_event_types {
  id uuid [pk]
  code varchar [not null, unique, note: 'Código do tipo de evento']
  name varchar [not null, unique, note: 'Nome do evento']
  category event_category [not null, note: 'Se é recompensa ou penalidade']
  points_delta int [not null, note: 'Valor positivo ou negativo']
  requires_approval boolean [not null, default: false, note: 'Exige aprovação?']
  active boolean [not null, default: true, note: 'Evento ativo no sistema']
}

Table score_events {
  id uuid [pk]
  user_id uuid [not null, note: 'Usuário afetado']
  event_type_id uuid [not null, note: 'Tipo do evento']
  points_delta int [not null, note: 'Valor aplicado no evento']
  description text [note: 'Observação detalhada']
  evidence_url text [note: 'Link de comprovante']
  status event_status [not null, default: 'pending', note: 'Situação do evento']
  occurred_at timestamp [note: 'Quando ocorreu']
  approved_by uuid [note: 'Usuário administrador/operador que aprovou']
  created_at timestamp [note: 'Quando foi registrado']
}

Table merit_certificates {
  id uuid [pk]
  name varchar [not null, unique, note: 'Nome do certificado']
  points_required int [not null, note: 'Pontuação vinculada']
  description text [note: 'Descrição do certificado']
}

Table user_certificates {
  id uuid [pk]
  user_id uuid [not null, note: 'Usuário que recebeu']
  certificate_id uuid [not null, note: 'Certificado recebido']
  granted_at timestamp [note: 'Data da concessão']
}

Table audit_logs {
  id uuid [pk]
  actor_user_id uuid [note: 'Usuário que executou a ação']
  entity_name varchar [not null, note: 'Tabela/entidade alterada']
  entity_id uuid [note: 'ID do registro alterado']
  action varchar [not null, note: 'Ação executada']
  old_data json [note: 'Dados antigos']
  new_data json [note: 'Dados novos']
  created_at timestamp [note: 'Data do log']
}

/* RELACIONAMENTOS */

Ref: users.id < user_roles.user_id
Ref: roles.id < user_roles.role_id

Ref: roles.id < role_permissions.role_id
Ref: permissions.id < role_permissions.permission_id

Ref: users.id < score_accounts.user_id

Ref: users.id < score_events.user_id
Ref: score_event_types.id < score_events.event_type_id
Ref: users.id < score_events.approved_by

Ref: users.id < user_certificates.user_id
Ref: merit_certificates.id < user_certificates.certificate_id

Ref: users.id < audit_logs.actor_user_id