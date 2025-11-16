# 📊 Documentação - PlaySell Gerenciador

## 🎯 Visão Geral

O **playsell-gerenciador** é a aplicação central de gestão de dados do ecossistema PlaySell. É responsável pelo cadastro de usuários e input de indicadores de vendas e desempenho.

## 🏗️ Arquitetura

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
│   │   └── NotFound.tsx     # 404
│   ├── App.tsx              # Componente raiz
│   └── main.tsx             # Entry point
├── public/                  # Arquivos estáticos
├── docs/                    # Documentação
└── package.json
```

## 🔑 Funcionalidades Principais

### 1. Dashboard
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
- **Campos Obrigatórios**
  - Nome completo
  - Email
  - Senha (mínimo 6 caracteres)
- **Campos Opcionais**
  - ID da Loja
  - ID Regional
- **Funcionalidades**
  - Criação de usuário no Supabase Auth
  - Criação automática de perfil
  - Geração de avatar initials

### 3. Lista de Usuários
- **Visualização**
  - Lista completa de usuários
  - Avatar e informações básicas
  - Última atualização de indicadores
  - Vendas do dia
- **Funcionalidades**
  - Busca por nome
  - Deletar usuário
  - Visualizar detalhes

### 4. Input de Indicadores
- **Indicadores Registrados**
  - Data
  - Meta de vendas (R$)
  - Vendas atuais (R$)
  - Ticket médio (R$)
  - NPS (0-100)
  - Taxa de conversão (%)
- **Funcionalidades**
  - Seleção de usuário
  - Upsert (cria ou atualiza se já existe)
  - Validação de dados

## 🔌 Integração com Supabase

### Tabelas Utilizadas

#### 1. `profiles`
```sql
- id (UUID, PK, FK → auth.users)
- full_name (TEXT)
- avatar_initials (TEXT)
- store_id (TEXT)
- regional_id (TEXT)
- coins (INTEGER)
- created_at, updated_at
```

#### 2. `daily_performance`
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

### Operações

#### Criar Usuário
1. Criar usuário no `auth.users` via Admin API
2. Criar perfil em `profiles`
3. Gerar avatar initials automaticamente

#### Inserir Indicadores
1. Upsert em `daily_performance`
2. Se já existe registro para user_id + date, atualiza
3. Se não existe, cria novo registro

## 🔐 Autenticação e Permissões

### Service Role Key
O gerenciador utiliza `VITE_SUPABASE_SERVICE_ROLE_KEY` para:
- Criar usuários no Supabase Auth
- Bypass de Row Level Security (RLS)
- Operações administrativas

**⚠️ IMPORTANTE**: Nunca exponha a Service Role Key no frontend em produção. Em produção, use um backend intermediário.

## 🎨 Design System

### Cores
- **Primary**: Azul Royal (222 68% 33%)
- **Secondary**: Laranja Vibrante (24 95% 53%)
- **Accent**: Amarelo Ouro (43 96% 56%)
- **Success**: Verde (142 71% 45%)

### Componentes
- Cards com sombras elevadas
- Botões com gradientes
- Efeitos hover (lift, glow)
- Animações suaves

## 📱 Responsividade

O gerenciador é otimizado para:
- **Mobile First**: Largura máxima de `max-w-md` (448px)
- **Desktop**: Centralizado com margens automáticas
- **Navegação**: Bottom navigation bar para mobile

## 🚀 Deploy

### Variáveis de Ambiente Necessárias
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### Build
```bash
npm run build
```

Os arquivos serão gerados em `dist/`.

## 🔄 Sincronização com Outros Projetos

### playsell-admin
- Visualiza usuários cadastrados
- Vê indicadores inseridos
- Usa dados para criar missões e campanhas

### playsell-user
- Vê próprio perfil
- Visualiza próprios indicadores
- Participa de campanhas baseadas nos dados

### Tempo Real
- Todos os projetos sincronizam via Supabase Realtime
- Mudanças aparecem instantaneamente

## 📝 Próximas Melhorias

- [ ] Autenticação própria do gerenciador
- [ ] Edição de usuários existentes
- [ ] Histórico completo de indicadores
- [ ] Upload em massa via CSV
- [ ] Relatórios e gráficos
- [ ] Exportação de dados
- [ ] Filtros avançados
- [ ] Validação de dados mais robusta

## 🐛 Troubleshooting

### Erro ao criar usuário
- Verifique se a Service Role Key está correta
- Confirme que o email não existe
- Verifique permissões no Supabase

### Indicadores não salvam
- Confirme que o usuário existe
- Verifique formato da data (YYYY-MM-DD)
- Confirme que os valores são numéricos

### Dados não aparecem
- Verifique conexão com Supabase
- Confirme que as queries estão habilitadas
- Verifique console para erros


