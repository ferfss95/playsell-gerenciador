# PlaySell - Gerenciador

Sistema de gerenciamento de usuários e indicadores de vendas do PlaySell.

## 📋 Descrição

O **playsell-gerenciador** é a aplicação responsável por:
- **Cadastro de Usuários**: Criar e gerenciar todos os usuários do sistema
- **Input de Indicadores**: Inserir resultados individuais de vendas e indicadores de desempenho
- **Gestão de Times**: Visualizar e gerenciar todos os membros da equipe

## 🚀 Funcionalidades

### 1. Dashboard
- Visão geral do sistema
- Estatísticas de usuários e vendas
- Ações rápidas

### 2. Cadastro de Usuários
- Criar novos usuários no sistema
- Definir loja e regional
- Configurar permissões

### 3. Lista de Usuários
- Visualizar todos os usuários cadastrados
- Buscar usuários
- Ver últimas atualizações de indicadores
- Gerenciar usuários

### 4. Input de Indicadores
- Inserir vendas diárias
- Configurar metas
- Registrar NPS e taxa de conversão
- Atualizar ticket médio

## 🛠️ Tecnologias

- **React** + **TypeScript**
- **Vite** - Build tool
- **Supabase** - Backend e banco de dados
- **TanStack Query** - Gerenciamento de estado do servidor
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes UI
- **React Router** - Roteamento

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env

# Editar .env com suas credenciais do Supabase
```

## ⚙️ Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

**Importante**: O gerenciador usa `SERVICE_ROLE_KEY` para operações administrativas como criação de usuários.

## 🏃 Executar

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## 📁 Estrutura do Projeto

```
playsell-gerenciador/
├── src/
│   ├── components/
│   │   ├── layout/      # Header, BottomNav, Layout
│   │   └── ui/          # Componentes shadcn/ui
│   ├── contexts/        # GerenciadorContext
│   ├── lib/             # Utilitários e Supabase
│   ├── pages/           # Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── Users.tsx
│   │   ├── RegisterUser.tsx
│   │   └── Performance.tsx
│   ├── App.tsx
│   └── main.tsx
├── public/
└── package.json
```

## 🔐 Permissões

O gerenciador requer permissões administrativas no Supabase:
- Criar usuários no `auth.users`
- Inserir/atualizar perfis em `profiles`
- Inserir/atualizar indicadores em `daily_performance`

## 📊 Integração com Outros Projetos

O gerenciador se integra com:
- **playsell-admin**: Líderes visualizam dados gerenciados aqui
- **playsell-user**: Usuários veem seus indicadores e conquistas

Todos compartilham o mesmo banco de dados Supabase.

## 🎨 Design System

O gerenciador utiliza o mesmo sistema de design dos outros projetos:
- Cores inspiradas em jogos
- Gradientes vibrantes
- Animações suaves
- Efeitos de hover e glow

## 📝 Próximos Passos

- [ ] Autenticação e autorização
- [ ] Edição de usuários
- [ ] Histórico de indicadores
- [ ] Exportação de dados
- [ ] Relatórios avançados

