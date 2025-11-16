# Como Desabilitar Confirmação de Email no Supabase

Este guia mostra como desabilitar a confirmação de email no Supabase para permitir que o cadastro em massa de usuários funcione corretamente.

## Passo a Passo

### 1. Acesse o Dashboard do Supabase
1. Acesse [https://app.supabase.com](https://app.supabase.com)
2. Faça login na sua conta
3. Selecione o projeto do PlaySell

### 2. Navegue até Authentication Settings
1. No menu lateral esquerdo, clique em **Authentication**
2. Clique em **Settings** (Configurações)

### 3. Desabilite a Confirmação de Email
1. Role a página até encontrar a seção **Email Auth**
2. Procure pela opção **"Enable email confirmations"** ou **"Confirmar email"**
3. **Desmarque** a caixa de seleção para desabilitar
4. Clique em **Save** (Salvar) no final da página

### 4. Verifique as Configurações
Após desabilitar, certifique-se de que:
- ✅ A opção "Enable email confirmations" está desmarcada
- ✅ As alterações foram salvas (aparece uma mensagem de sucesso)

## Resultado Esperado

Após desabilitar a confirmação de email:
- ✅ Usuários criados via CSV serão ativados automaticamente
- ✅ Não será necessário confirmar email para fazer login
- ✅ O cadastro em massa funcionará corretamente

## Importante

⚠️ **Segurança**: Desabilitar a confirmação de email reduz a segurança do sistema, pois permite que qualquer pessoa com um email válido crie uma conta. 

Para produção, considere:
- Usar Service Role Key com `admin.createUser()` (mais seguro)
- Manter confirmação de email habilitada e usar um sistema de envio de emails customizado
- Implementar validação adicional de emails antes do cadastro

## Teste

Após desabilitar:
1. Tente fazer upload de um CSV com usuários
2. Verifique se os usuários aparecem na lista de usuários
3. Tente fazer login com um dos emails cadastrados

## Reverter (se necessário)

Se precisar reabilitar a confirmação de email:
1. Volte em Authentication → Settings
2. Marque novamente a opção "Enable email confirmations"
3. Salve as alterações

