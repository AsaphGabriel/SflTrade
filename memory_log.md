# 📜 Memory Log - SflTrade

## [2026-08-14] Infraestrutura de Sincronização Multi-Dispositivos via Supabase Auth

### 1. Sincronização e Backup da Branch Main
- Branch `develop` integrada à `main` com sucesso e enviada para `origin/main` como snapshot/backup oficial.
- Retorno imediato à branch `develop` para desenvolvimento das novas funcionalidades.

### 2. Script de Tabelas de Usuário (`supabase_user_schema.sql`)
- Criado arquivo `supabase_user_schema.sql` na raiz com:
  - Tabela `user_portfolios` (id UUID, user_id UUID FK auth.users, resource_id, quantity, avg_price_sfl, avg_token_price_usd, updated_at).
  - Tabela `user_transactions` (id UUID, user_id UUID FK auth.users, resource_id, type BUY/SELL, quantity, price_sfl, token_price_usd_at_purchase, total_sfl, total_usd, created_at).
  - Tabela `user_settings` (user_id UUID PK FK auth.users, island_tax, vip_active, shrine_active, preferred_currency, updated_at).
  - Políticas RLS (Row Level Security) habilitadas com acesso exclusivo para `auth.uid() = user_id` em operações SELECT, INSERT, UPDATE e DELETE.

### 3. Camada de Autenticação e Sincronização Frontend
- **Auth Service (`src/services/authService.js`)**: Integração com Supabase Auth (`signUp`, `signInWithPassword`, `signInWithOtp`, `signOut`, `getSession`, `getUser`, `onAuthStateChange`).
- **Sync Service (`src/services/syncService.js`)**: Estratégia Híbrida Local-First/Offline. Operações continuam no LocalStorage quando deslogado; ao realizar login ocorre sync/merge automático enviando os dados locais e baixando o histórico remoto. Gravação bidirecional instantânea quando logado.
- **Componente AuthModal (`src/components/AuthModal.jsx`)**: Modal responsivo com modos Login (E-mail + Senha), Cadastro e Link Mágico. Exibição do status (`🟢 Conectado como usuario@email.com` ou `⚪ Modo Convidado / Offline`) e botão de encerramento de sessão seguro.
- **Header & Interface**: Indicador de status Cloud no cabeçalho e card de gerenciamento de conta na aba Perfil.

### 4. Build, Testes e Deploy
- Compilação realizada via `npm run build` com 0 erros.
- Publicação da versão final compilada na branch `gh-pages` via `npx gh-pages -d dist`.
