# 📚 Documentação Completa - PlaySell Gerenciador

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Configuração e Setup](#configuração-e-setup)
3. [Funcionalidades](#funcionalidades)
4. [Autenticação e Senhas](#autenticação-e-senhas)
5. [Troubleshooting](#troubleshooting)
6. [Migrações e Banco de Dados](#migrações-e-banco-de-dados)
7. [Arquitetura e Tecnologias](#arquitetura-e-tecnologias)

---

## 🎯 Visão Geral

### O que é o PlaySell Gerenciador?

O **playsell-gerenciador** é a aplicação central de gestão de dados do ecossistema PlaySell. É responsável por:

- **Cadastro de Usuários**: Criar e gerenciar todos os usuários do sistema
- **Input de Indicadores**: Inserir resultados individuais de vendas e indicadores de desempenho
- **Gestão de Times**: Visualizar e gerenciar todos os membros da equipe
- **Upload em Massa**: Cadastro de usuários e performance via CSV
- **Gerenciamento de Treinamentos**: Criar e atribuir treinamentos

### Integração com Outros Projetos

O gerenciador se integra com:
- **playsell-admin**: Líderes visualizam dados gerenciados aqui
- **playsell-user**: Usuários veem seus indicadores e conquistas
- **playsell-login**: Sistema centralizado de autenticação

Todos compartilham o mesmo banco de dados Supabase e sincronizam em tempo real.

---

## ⚙️ Configuração e Setup

### Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Editar .env com suas credenciais do Supabase
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
VITE_SUPABASE_PUBLISHABLE_KEY=sua_publishable_key
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

**⚠️ IMPORTANTE**: 
- O gerenciador usa `SERVICE_ROLE_KEY` para operações administrativas
- Nunca exponha a Service Role Key no frontend em produção
- O arquivo `.env` está no `.gitignore` e não será commitado

### Obter Credenciais do Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role (secret)** → `VITE_SUPABASE_SERVICE_ROLE_KEY`

### Desabilitar Confirmação de Email

Para permitir cadastro em massa sem confirmação de email:

1. Acesse **Authentication** → **Settings**
2. Role até **Email Auth**
3. **Desmarque** "Enable email confirmations"
4. Clique em **Save**

**⚠️ Segurança**: Em produção, considere usar Service Role Key com `admin.createUser()` (mais seguro).

### Verificação da Configuração

Após configurar, reinicie o servidor:

```bash
npm run dev
```

No console do navegador, você deve ver:

```
🔧 Configuração Supabase: {
  url: "✅ Configurado",
  key: "✅ Configurado",
  serviceRole: "✅ Service Role Key presente"
}
```

Se aparecer "❌ Não configurado", verifique:
- ✅ O arquivo `.env` existe na raiz
- ✅ As variáveis começam com `VITE_`
- ✅ O servidor foi reiniciado após criar/editar o `.env`

---

## 🚀 Funcionalidades

### 1. Dashboard

**Rota**: `/`

- **Estatísticas Gerais**
  - Total de usuários cadastrados
  - Usuários com indicadores registrados
  - Vendas totais do dia
- **Ações Rápidas**
  - Cadastrar novo usuário
  - Inserir indicadores
  - Ver todos os usuários
- **Usuários Recentes**
  - Lista dos 5 usuários mais recentes
  - Última atualização de indicadores

### 2. Cadastro de Usuários

**Rota**: `/register`

#### Cadastro Individual

**Campos Obrigatórios**:
- Nome completo
- Email
- Senha (mínimo 6 caracteres)
- Matrícula
- Cargo (admin, leader, user)

**Campos Opcionais**:
- ID da Loja
- ID Regional
- Nome da Loja (texto)
- Nome da Regional (texto)

**Funcionalidades**:
- Criação de usuário no Supabase Auth
- Criação automática de perfil
- Geração de avatar initials
- Atribuição de role (cargo)
- Senha inicial = matrícula (preenchida se < 6 caracteres)

#### Cadastro em Massa via CSV

**Rota**: `/upload-users`

**Formato CSV**:
```csv
nome,email,senha,matrícula,cargo,loja,regional
Ana Silva,ana.silva@empresa.com,1001,1001,admin,Loja 1,Regional Sul
Bruno Almeida,bruno.almeida@empresa.com,1002,1002,leader,Loja 2,Regional Norte
```

**Funcionalidades**:
- Upload de arquivo CSV ou colar dados
- Preview dos dados antes de salvar
- Validação de dados
- Criação em lote
- Tratamento de erros e duplicatas

**Nota**: O sistema preenche automaticamente matrículas curtas (< 6 caracteres) com zeros à esquerda para atender requisito do Supabase Auth.

### 3. Lista de Usuários

**Rota**: `/users`

- **Visualização**
  - Lista completa de usuários
  - Avatar e informações básicas
  - Última atualização de indicadores
  - Vendas do dia
- **Funcionalidades**
  - Busca por nome
  - Deletar usuário
  - Visualizar detalhes
  - Filtrar por role

### 4. Input de Indicadores

**Rota**: `/performance`

#### Input Individual

**Indicadores Registrados**:
- Data
- Meta de vendas (R$)
- Vendas atuais (R$)
- Ticket médio (R$)
- NPS (0-100)
- Taxa de conversão (%)

**Funcionalidades**:
- Seleção de usuário
- Upsert (cria ou atualiza se já existe)
- Validação de dados

#### Upload em Massa via CSV

**Rota**: `/upload-performance`

**Formato CSV**:
```csv
email,data,meta_vendas,vendas_atuais,ticket_medio,nps,taxa_conversao
ana.silva@empresa.com,2025-01-17,10000,8500,150,85,75
```

### 5. Sincronização de Senhas

**Rota**: `/sincronizar-senhas`

Atualiza a senha de todos os usuários para ser igual à matrícula (preenchida se necessário).

**Uso**:
1. Acesse a página
2. Clique em "Sincronizar Todas as Senhas"
3. Aguarde o processo concluir
4. Verifique os resultados na tabela

**Quando usar**:
- Usuários criados antes da implementação do sistema de senha = matrícula
- Corrigir senhas de usuários que não conseguem fazer login

---

## 🔐 Autenticação e Senhas

### Sistema de Senhas

#### Problema Identificado

1. **Supabase Auth requer senhas com mínimo de 6 caracteres**
2. **Matrículas curtas** (< 6 caracteres) como `1001`, `1002` não podem ser usadas diretamente
3. **Usuários antigos** foram criados com senhas diferentes da matrícula
4. **Sistema novo** tenta login com matrícula, mas a senha real no auth é diferente

#### Soluções Implementadas

##### 1. Preenchimento Automático no Cadastro

Novos usuários são criados automaticamente com senha = matrícula preenchida:
- Matrícula `1001` → Senha `001001`
- Matrícula `1002` → Senha `001002`
- Matrícula `123` → Senha `000123`
- Matrícula `123456` → Senha `123456` (sem alteração)

**Arquivo**: `src/contexts/GerenciadorContext.tsx`

##### 2. Login Inteligente

O sistema tenta **múltiplas variações** de senha automaticamente:

1. **Primeira tentativa**: Senha informada pelo usuário
2. **Se falhar**: Busca o perfil do usuário para obter a matrícula
3. **Tenta variações**:
   - Matrícula original (ex: `1002`)
   - Matrícula preenchida (ex: `001002`)
   - Senha informada preenchida (se < 6 caracteres)

**Vantagem**: Funciona mesmo se o usuário ainda não teve a senha atualizada!

**Arquivo**: `playsell-login/src/services/auth.ts`

##### 3. Página de Sincronização

Interface web para atualizar **TODOS** os usuários de uma vez.

**Rota**: `/sincronizar-senhas`

### Como Funciona

#### No Cadastro de Novos Usuários

1. Sistema recebe matrícula: `1001`
2. Sistema verifica: tem apenas 4 caracteres (< 6)
3. Sistema preenche com zeros: `001001`
4. Sistema cria usuário com senha `001001`
5. Sistema salva matrícula original `1001` no banco

#### No Login

1. Usuário pode digitar: `1001` ou `001001`
2. Sistema tenta login com a senha informada
3. Se falhar, busca perfil e tenta variações:
   - Matrícula original (`1001`)
   - Matrícula preenchida (`001002`)
4. Sistema aceita ambas as formas
5. Sistema detecta primeiro acesso se senha = matrícula (original ou preenchida)
6. Se primeiro acesso, redireciona para redefinição obrigatória de senha

#### No Reset de Senha

- Sistema bloqueia usar a matrícula (original ou preenchida) como nova senha
- Garante que a senha pessoal seja diferente da matrícula
- Valida mínimo de 6 caracteres

### Atualizar Senhas de Usuários

#### Opção 1: Via Interface Web (Recomendado)

1. Acesse `playsell-gerenciador` no navegador
2. Navegue para `/sincronizar-senhas`
3. Clique em **"Sincronizar Todas as Senhas"**
4. Aguarde o processo concluir
5. Verifique os resultados na tabela

#### Opção 2: Via Console do Navegador

```javascript
// Buscar todos os usuários
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, email, enrollment_number')
  .not('enrollment_number', 'is', null);

// Atualizar cada um
for (const profile of profiles) {
  let novaSenha = profile.enrollment_number.trim();
  
  // Se a matrícula for menor que 6 caracteres, preencher com zeros
  if (novaSenha.length < 6) {
    novaSenha = novaSenha.padStart(6, '0');
  }
  
  const { error } = await supabase.auth.admin.updateUserById(profile.id, {
    password: novaSenha
  });
  
  if (error) {
    console.error(`❌ ${profile.email}: ${error.message}`);
  } else {
    console.log(`✅ ${profile.email}: senha atualizada para ${novaSenha}`);
  }
}
```

#### Opção 3: Via Script Node.js

```bash
cd playsell-gerenciador
node scripts/sincronizar-senhas-usuarios.js
```

#### Opção 4: Atualizar Usuário Individual

```javascript
const userId = 'USER_ID_AQUI';

// Buscar matrícula do usuário
const { data: profile } = await supabase
  .from('profiles')
  .select('enrollment_number, email')
  .eq('id', userId)
  .single();

if (profile && profile.enrollment_number) {
  let novaSenha = profile.enrollment_number.trim();
  
  if (novaSenha.length < 6) {
    novaSenha = novaSenha.padStart(6, '0');
  }
  
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: novaSenha
  });
  
  if (error) {
    console.error('❌ Erro:', error);
  } else {
    console.log(`✅ Senha atualizada para ${profile.email}: ${novaSenha}`);
  }
}
```

#### Opção 5: Via Supabase Dashboard

1. Acesse [Supabase Dashboard](https://app.supabase.com)
2. Vá em **Authentication** → **Users**
3. Encontre o usuário desejado
4. Clique nos três pontos (...) → **Reset Password**
5. Defina a nova senha como a matrícula preenchida (ex: `001001` para matrícula `1001`)

---

## 🔍 Troubleshooting

### Erro: "Supabase não configurado"

**Causa**: Variáveis de ambiente não configuradas ou servidor não reiniciado.

**Solução**:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Verifique se as variáveis começam com `VITE_`
3. Reinicie o servidor após criar/editar o `.env`

### Erro: "Credenciais inválidas" no Login

**Possíveis causas**:
1. Senha não foi atualizada ainda
2. Matrícula está incorreta no banco
3. Service Role Key não está configurada

**Solução**:
1. Execute a sincronização de senhas (`/sincronizar-senhas`)
2. Verifique a matrícula no banco: `SELECT email, enrollment_number FROM profiles WHERE email = 'EMAIL_AQUI';`
3. Verifique se `VITE_SUPABASE_SERVICE_ROLE_KEY` está no `.env`

### Erro: "Service Role Key não configurada"

**Solução**:
1. Adicione `VITE_SUPABASE_SERVICE_ROLE_KEY` no arquivo `.env`
2. Reinicie o servidor de desenvolvimento
3. A Service Role Key pode ser obtida no Supabase Dashboard → Settings → API

### Erro: "Email já cadastrado"

**Causa**: Tentativa de criar usuário com email existente.

**Solução**:
- O sistema agora valida emails duplicados antes de criar
- Verifique se o email não existe no banco
- Se necessário, delete o usuário existente primeiro

### Erro: "duplicate key value violates unique constraint 'profiles_pkey'"

**Causa**: Perfil já existe para o ID do usuário.

**Solução**:
1. O sistema agora verifica antes de criar
2. Se houver usuário órfão no auth, ele será limpo automaticamente
3. Verifique se há emails duplicados no CSV

### Erro: "Perfil não encontrado"

**Possíveis causas**:
1. Usuário não existe na tabela `profiles`
2. RLS (Row Level Security) está bloqueando a consulta

**Solução**:
1. Verifique se o usuário existe: `SELECT * FROM profiles WHERE email = 'EMAIL_AQUI';`
2. Se não existir, crie o perfil via gerenciador
3. Verifique as políticas RLS no Supabase Dashboard

### Erro ao criar usuário no banco

**Possíveis causas**:
1. Service Role Key incorreta
2. Confirmação de email habilitada
3. Políticas RLS bloqueando

**Solução**:
1. Verifique se a Service Role Key está correta
2. Desabilite confirmação de email no Supabase (Authentication → Settings)
3. Verifique permissões no Supabase

### Indicadores não salvam

**Possíveis causas**:
1. Usuário não existe
2. Formato da data incorreto
3. Valores não são numéricos

**Solução**:
1. Confirme que o usuário existe
2. Verifique formato da data (YYYY-MM-DD)
3. Confirme que os valores são numéricos

### Dados não aparecem

**Possíveis causas**:
1. Conexão com Supabase
2. Queries desabilitadas
3. Erros no console

**Solução**:
1. Verifique conexão com Supabase
2. Confirme que as queries estão habilitadas
3. Verifique console para erros

### Login funciona, mas não redireciona corretamente

**Possíveis causas**:
1. Role não está configurado corretamente
2. URL de redirecionamento incorreta

**Solução**:
1. Verifique o role: `SELECT ur.role FROM user_roles ur JOIN profiles p ON ur.user_id = p.id WHERE p.email = 'EMAIL_AQUI';`
2. Verifique a função `getRedirectUrl` em `playsell-login/src/services/auth.ts`
3. Roles esperados: `user`, `leader`, `admin`

---

## 🗄️ Migrações e Banco de Dados

### Aplicar Migrações

#### Via Supabase Dashboard

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Navegue até o seu projeto
3. Vá em **SQL Editor**
4. Cole o conteúdo do arquivo de migração
5. Execute a query

#### Via Supabase CLI

```bash
# Aplicar migração específica
supabase db push

# Ou aplicar diretamente
psql -h [HOST] -U postgres -d postgres -f supabase/migrations/arquivo.sql
```

### Migrações Disponíveis

#### `20250201000000_add_enrollment_and_role_to_profiles.sql`

**Data**: 01/02/2025

**Descrição**: Adiciona suporte aos campos `enrollment_number` (matrícula) e `role` (cargo) no cadastro de usuários.

**Alterações**:
- Garante que o campo `enrollment_number` existe na tabela `profiles` com índice único
- Garante que o enum `app_role` existe
- Garante que a tabela `user_roles` existe com estrutura correta
- Configura políticas RLS para `user_roles`
- Adiciona índices para melhor performance

**Nota**: Esta migração é idempotente e pode ser executada múltiplas vezes sem problemas.

#### `20250131000000_create_trainings_schema.sql`

**Data**: 31/01/2025

**Descrição**: Cria a estrutura completa para gerenciamento de treinamentos.

**Alterações**:
- **Enums**: `training_scope`, `training_status`, `training_assignment_status`
- **Tabelas**:
  - `trainings` - Treinamentos principais
  - `training_quizzes` - Questões de quiz de cada treinamento
  - `training_role_assignments` - Atribuições por cargo
  - `training_user_assignments` - Atribuições individuais de usuários

**Importante**: Esta migração deve ser aplicada após a migração principal do banco (`20250130000000_create_complete_schema.sql` do `playsell-user`).

### Estrutura do Banco de Dados

#### Tabela `profiles`

```sql
- id (UUID, PK, FK → auth.users)
- full_name (TEXT)
- email (VARCHAR(255), UNIQUE)
- enrollment_number (VARCHAR(50), UNIQUE)
- avatar_initials (TEXT)
- store_id (TEXT)
- regional_id (TEXT)
- store (TEXT) -- Nome da loja
- regional (TEXT) -- Nome da regional
- coins (INTEGER)
- created_at, updated_at
```

#### Tabela `user_roles`

```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- role (app_role) -- 'admin', 'leader', 'user'
- created_at
```

#### Tabela `daily_performance`

```sql
- id (UUID, PK)
- user_id (UUID, FK → profiles)
- date (DATE)
- sales_target (DECIMAL)
- sales_current (DECIMAL)
- average_ticket (DECIMAL)
- nps (INTEGER)
- conversion_rate (DECIMAL)
- created_at, updated_at
- UNIQUE(user_id, date)
```

#### Tabela `trainings`

```sql
- id (UUID, PK)
- title (TEXT)
- description (TEXT)
- video_url (TEXT)
- scope (training_scope)
- status (training_status)
- reward_coins (INTEGER)
- created_at, updated_at
```

### Políticas RLS

Todas as tabelas têm Row Level Security (RLS) habilitado:

- **Admins**: Podem gerenciar tudo
- **Leaders**: Podem visualizar e inserir dados de seus times
- **Usuários**: Podem visualizar apenas seus próprios dados
- **Service Role**: Bypass completo para operações administrativas

---

## 🏗️ Arquitetura e Tecnologias

### Stack Tecnológica

- **React 18** + **TypeScript**
- **Vite** - Build tool e dev server
- **Supabase** - Backend-as-a-Service
- **TanStack Query** - Server state management
- **React Router DOM** - Roteamento
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI

### Estrutura de Pastas

```
playsell-gerenciador/
├── src/
│   ├── components/
│   │   ├── layout/          # Header, BottomNav, Layout
│   │   └── ui/              # Componentes shadcn/ui
│   ├── contexts/
│   │   ├── GerenciadorContext.tsx  # Contexto principal
│   │   └── types.ts                # Tipos TypeScript
│   ├── lib/
│   │   ├── supabase.ts      # Cliente Supabase
│   │   └── utils.ts         # Utilitários
│   ├── pages/
│   │   ├── Dashboard.tsx    # Página inicial
│   │   ├── Users.tsx        # Lista de usuários
│   │   ├── RegisterUser.tsx # Cadastro de usuários
│   │   ├── Performance.tsx  # Input de indicadores
│   │   ├── UploadUsers.tsx  # Upload CSV de usuários
│   │   ├── UploadPerformance.tsx # Upload CSV de performance
│   │   ├── SincronizarSenhas.tsx # Sincronização de senhas
│   │   └── NotFound.tsx     # 404
│   ├── App.tsx              # Componente raiz
│   └── main.tsx             # Entry point
├── public/                  # Arquivos estáticos
├── supabase/
│   └── migrations/          # Migrações SQL
├── scripts/                 # Scripts utilitários
├── docs/                    # Documentação
└── package.json
```

### Design System

#### Cores

- **Primary**: Azul Royal (222 68% 33%)
- **Secondary**: Laranja Vibrante (24 95% 53%)
- **Accent**: Amarelo Ouro (43 96% 56%)
- **Success**: Verde (142 71% 45%)

#### Componentes

- Cards com sombras elevadas
- Botões com gradientes
- Efeitos hover (lift, glow)
- Animações suaves

### Responsividade

O gerenciador é otimizado para:
- **Mobile First**: Largura máxima de `max-w-md` (448px)
- **Desktop**: Centralizado com margens automáticas
- **Navegação**: Bottom navigation bar para mobile

### Autenticação e Permissões

#### Service Role Key

O gerenciador utiliza `VITE_SUPABASE_SERVICE_ROLE_KEY` para:
- Criar usuários no Supabase Auth
- Bypass de Row Level Security (RLS)
- Operações administrativas

**⚠️ IMPORTANTE**: Nunca exponha a Service Role Key no frontend em produção. Em produção, use um backend intermediário.

### Sincronização em Tempo Real

- Todos os projetos sincronizam via Supabase Realtime
- Mudanças aparecem instantaneamente
- Sem necessidade de refresh manual

---

## 📝 Próximas Melhorias

- [ ] Autenticação própria do gerenciador
- [ ] Edição de usuários existentes
- [ ] Histórico completo de indicadores
- [ ] Relatórios e gráficos
- [ ] Exportação de dados
- [ ] Filtros avançados
- [ ] Validação de dados mais robusta
- [ ] Notificações push
- [ ] Sistema de analytics avançado

---

## 📚 Referências

### Arquivos Relacionados

- `src/contexts/GerenciadorContext.tsx` - Contexto principal e lógica de negócio
- `src/pages/SincronizarSenhas.tsx` - Interface de sincronização
- `scripts/sincronizar-senhas-usuarios.js` - Script Node.js
- `playsell-login/src/services/auth.ts` - Lógica de login
- `playsell-login/src/pages/ResetPassword.tsx` - Redefinição de senha

### Documentação Externa

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TanStack Query](https://tanstack.com/query/latest)
- [shadcn/ui](https://ui.shadcn.com)

---

**Última atualização**: 2025-01-17  
**Versão**: 1.0

