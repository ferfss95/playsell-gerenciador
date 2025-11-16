# Migrações do Banco de Dados - playsell-gerenciador

Este diretório contém as migrações SQL para o banco de dados do `playsell-gerenciador`.

## Aplicar Migrações

### Via Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Navegue até o seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo do arquivo de migração
5. Execute a query

### Via Supabase CLI

```bash
# Aplicar migração específica
supabase db push

# Ou aplicar diretamente
psql -h [HOST] -U postgres -d postgres -f supabase/migrations/20250131000000_create_trainings_schema.sql
```

## Migrações Disponíveis

### `20250201000000_add_enrollment_and_role_to_profiles.sql`

**Data**: 01/02/2025

**Descrição**: Adiciona suporte aos campos `enrollment_number` (matrícula) e `role` (cargo) no cadastro de usuários.

**Alterações**:
- Garante que o campo `enrollment_number` existe na tabela `profiles` com índice único
- Garante que o enum `app_role` existe
- Garante que a tabela `user_roles` existe com estrutura correta
- Configura políticas RLS para `user_roles`
- Adiciona índices para melhor performance

**Nota**: Esta migração é idempotente e pode ser executada múltiplas vezes sem problemas.

### `20250131000000_create_trainings_schema.sql`

Cria a estrutura completa para gerenciamento de treinamentos:

- **Enums**: `training_scope`, `training_status`, `training_assignment_status`
- **Tabelas**:
  - `trainings` - Treinamentos principais
  - `training_quizzes` - Questões de quiz de cada treinamento
  - `training_role_assignments` - Atribuições por cargo
  - `training_user_assignments` - Atribuições individuais de usuários

**Importante**: Esta migração deve ser aplicada após a migração principal do banco (`20250130000000_create_complete_schema.sql` do `playsell-user`).

## Estrutura Criada

### Tabela `trainings`
Armazena informações dos treinamentos:
- Título, descrição, URL do vídeo
- Escopo (loja/regional/company)
- Status (draft/active/completed/archived)
- Moedas de recompensa

### Tabela `training_quizzes`
Armazena as questões de cada treinamento:
- Pergunta e opções (JSONB)
- Resposta correta (índice)
- Ordem das questões

### Tabela `training_role_assignments`
Define quais cargos têm acesso ao treinamento:
- Relacionamento many-to-many entre treinamentos e cargos

### Tabela `training_user_assignments`
Rastreia o progresso de cada usuário:
- Status (assigned/in_progress/completed/failed)
- Respostas do quiz
- Score do quiz
- Datas de início e conclusão

## Políticas RLS

Todas as tabelas têm Row Level Security (RLS) habilitado:
- Admins podem gerenciar tudo
- Usuários podem visualizar treinamentos ativos
- Usuários podem atualizar apenas seus próprios assignments

